'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';
import { submitGameScore } from '@/lib/api/client';

interface WordEntry {
  word: string;
  isPlayer: boolean;
  isCorrect: boolean;
}

// ── 한글 두음법칙(끝말잇기에서 허용되는 시작 글자) ──
function hangulParts(ch: string): { cho: number; jung: number; jong: number } | null {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
}
function composeHangul(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jong);
}
const YA_GROUP = [2, 3, 6, 7, 12, 17, 20]; // ㅑㅒㅕㅖㅛㅠㅣ
const A_GROUP = [0, 1, 8, 11, 13, 18]; //     ㅏㅐㅗㅚㅜㅡ
/** 끝글자로 이을 수 있는 시작 글자 집합(두음법칙 포함, 관대하게 양방향). 영문/비한글은 자기 자신만. */
function allowedStarts(ch: string): Set<string> {
  const set = new Set<string>([ch]);
  const p = hangulParts(ch);
  if (!p) return set;
  const { cho, jung, jong } = p;
  if (cho === 5 && YA_GROUP.includes(jung)) set.add(composeHangul(11, jung, jong)); // 려→여·료→요·리→이
  if (cho === 5 && A_GROUP.includes(jung)) set.add(composeHangul(2, jung, jong)); //   라→나·로→노
  if (cho === 2 && YA_GROUP.includes(jung)) set.add(composeHangul(11, jung, jong)); // 녀→여·뇨→요
  // 역방향도 허용(여→려/녀, 나→라)
  if (cho === 11 && YA_GROUP.includes(jung)) { set.add(composeHangul(5, jung, jong)); set.add(composeHangul(2, jung, jong)); }
  if (cho === 2 && A_GROUP.includes(jung)) set.add(composeHangul(5, jung, jong));
  return set;
}
const HANGUL_WORD = /^[가-힣]+$/;
const ENGLISH_WORD = /^[a-zA-Z]+$/;

export default function PuzzleGamePage() {
  const { settings } = useSettingsStore();
  const [status, setStatus] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState<WordEntry[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [wordPool, setWordPool] = useState<string[]>([]);
  /** 실제 단어 검증용 사전(초·중·고급 통합). 여기 없는 문자열은 정답으로 인정하지 않는다. */
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef(0);
  /** 사전 단어들의 첫 글자 집합 — 어떤 끝글자가 이어갈 수 있는지(막다른지) 판정용 */
  const dictFirstCharsRef = useRef<Set<string>>(new Set());
  const isKorean = settings.language === 'ko';

  // 게임 종료 시 서버 순위 제출 (계정 없으면 무시)
  useEffect(() => {
    if (status === 'gameover' && score > 0) {
      void submitGameScore('puzzle', score, Date.now() - startedAtRef.current, settings.language);
    }
  }, [status, score, settings.language]);

  // Load word pool with massive expansion
  useEffect(() => {
    wordGenerator.reset();
    const extraWords = wordGenerator.getWords({
      language: settings.language,
      difficulty: 5,
      count: 500,
      minLength: 2,
    });
    (async () => {
      try {
        if (isKorean) {
          const m1 = await import('@/data/korean/words-beginner');
          const m2 = await import('@/data/korean/words-intermediate');
          const m3 = await import('@/data/korean/words-advanced');
          const pool = [...new Set([...m1.koreanWordsBeginner, ...m2.koreanWordsIntermediate, ...extraWords])].filter(w => w.length >= 2);
          // 검증 사전 = 컴퓨터가 쓰는 풀 + 고급 단어까지(플레이어가 아는 단어를 최대한 인정)
          const dict = new Set<string>([...pool, ...m3.koreanWordsAdvanced].filter(w => w.length >= 2));
          setWordPool(pool);
          setValidWords(dict);
          dictFirstCharsRef.current = new Set([...dict].map(w => w[0]));
        } else {
          const m1 = await import('@/data/english/words-common200');
          const m2 = await import('@/data/english/words-common1000');
          const m3 = await import('@/data/english/words-advanced');
          const pool = [...new Set([...m1.englishCommon200, ...m2.englishCommon1000, ...extraWords])].filter(w => w.length >= 3);
          const dict = new Set<string>([...pool, ...m3.englishWordsAdvanced].map(w => w.toLowerCase()).filter(w => w.length >= 3));
          setWordPool(pool);
          setValidWords(dict);
          dictFirstCharsRef.current = new Set([...dict].map(w => w[0].toLowerCase()));
        }
      } catch {
        const fb = extraWords.length > 0 ? extraWords :
          (isKorean
            ? ['사과', '과일', '일출', '출발', '발자국', '국어', '어머니', '니트', '트럭', '럭비']
            : ['apple', 'elephant', 'tiger', 'rabbit', 'turtle', 'eagle', 'eel', 'lion', 'newt']);
        setWordPool(fb);
        setValidWords(new Set(fb.map(w => isKorean ? w : w.toLowerCase())));
      }
    })();
  }, [isKorean, settings.language]);

  const getLastChar = useCallback((word: string): string => {
    if (isKorean) {
      return word[word.length - 1];
    } else {
      return word[word.length - 1].toLowerCase();
    }
  }, [isKorean]);

  const getFirstChar = useCallback((word: string): string => {
    if (isKorean) {
      return word[0];
    } else {
      return word[0].toLowerCase();
    }
  }, [isKorean]);

  /** 이 끝글자로 이어갈 단어가 사전에 실제로 존재하는가(= 막다른 글자가 아닌가). */
  const answerable = useCallback((ch: string): boolean => {
    if (!ch) return false;
    const idx = dictFirstCharsRef.current;
    if (idx.size === 0) return true; // 사전 로딩 전이면 막지 않음
    for (const s of allowedStarts(ch)) if (idx.has(s)) return true;
    return false;
  }, []);

  const findComputerWord = useCallback((lastChar: string): string | null => {
    const starts = allowedStarts(lastChar);
    const candidates = wordPool.filter(w =>
      starts.has(getFirstChar(w)) && !usedWords.has(w)
    );
    if (candidates.length === 0) return null;
    // 플레이어가 이어갈 수 있는 단어만 낸다(막다른 글자로 끝나는 단어는 내지 않음).
    const safe = candidates.filter(w => answerable(getLastChar(w)));
    if (safe.length === 0) return null;
    return safe[Math.floor(Math.random() * safe.length)];
  }, [wordPool, usedWords, getFirstChar, getLastChar, answerable]);

  const startGame = () => {
    // 이어갈 단어가 실제로 존재하는 시작 단어만 고른다("스켈레톤 → 톤..." 같은 막다른 시작 방지)
    const solvable = wordPool.filter(w => w.length >= 2 && answerable(getLastChar(w)));
    const pickFrom = solvable.length > 0 ? solvable : wordPool;
    const starter = pickFrom.length > 0
      ? pickFrom[Math.floor(Math.random() * pickFrom.length)]
      : (isKorean ? '사과' : 'apple');

    setStatus('playing');
    startedAtRef.current = Date.now();
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTotalWords(0);
    setChain([{ word: starter, isPlayer: false, isCorrect: true }]);
    setCurrentWord(starter);
    setUsedWords(new Set([starter]));
    setInput('');
    setTimeLeft(16); // 난이도 완화(기존 12초)
    setMessage('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Timer
  useEffect(() => {
    if (status !== 'playing') return;
    if (timeLeft <= 0) {
      setStatus('gameover');
      soundManager?.play('gameOver');
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [status, timeLeft]);

  // Scroll to bottom of chain
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const word = input.trim();
    if (!word) return;

    const lastChar = getLastChar(currentWord);
    const firstChar = getFirstChar(word);

    // Validate — 두음법칙 허용(료→요, 라→나 등)
    if (!allowedStarts(lastChar).has(firstChar)) {
      setMessage(isKorean
        ? `'${lastChar}'(으)로 시작하는 단어를 입력하세요!`
        : `Word must start with '${lastChar.toUpperCase()}'!`);
      setCombo(0);
      soundManager?.play('keyError');
      setInput('');
      return;
    }

    if (usedWords.has(word)) {
      setMessage(isKorean ? '이미 사용한 단어입니다!' : 'Word already used!');
      setCombo(0);
      soundManager?.play('keyError');
      setInput('');
      return;
    }

    if (word.length < 2) {
      setMessage(isKorean ? '2글자 이상 입력하세요!' : 'Word must be at least 2 letters!');
      setInput('');
      return;
    }

    // 형태 검증 — 자모 낙서("리아ㅓㅣㅏ")·기호는 거부.
    // 내장 사전이 작아(약 900단어) 궁사·궁예 같은 실제 단어까지 막히던 문제가 있어,
    // 사전에 없어도 "완성된 한글 2글자 이상"이면 인정한다(사전 단어는 당연히 통과).
    const lookup = isKorean ? word : word.toLowerCase();
    const wellFormed = isKorean ? HANGUL_WORD.test(word) : ENGLISH_WORD.test(word);
    if (!wellFormed && !validWords.has(lookup)) {
      setMessage(isKorean ? '완성된 한글 단어만 입력하세요!' : 'Letters only!');
      setCombo(0);
      soundManager?.play('keyError');
      setInput('');
      return;
    }

    // Player word accepted
    const newUsed = new Set(usedWords);
    newUsed.add(word);
    const newCombo = combo + 1;
    const points = word.length * 10 * (1 + Math.floor(newCombo / 3) * 0.5);

    setChain(prev => [...prev, { word, isPlayer: true, isCorrect: true }]);
    setScore(s => s + Math.round(points));
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));
    setTotalWords(t => t + 1);
    setUsedWords(newUsed);
    setTimeLeft(Math.min(timeLeft + 4, 20)); // Bonus time (난이도 완화)
    setMessage('');
    soundManager?.play('keyClick');
    setInput('');

    // Computer's turn
    const computerLastChar = getLastChar(word);
    const computerWord = findComputerWord(computerLastChar);

    if (!computerWord) {
      // Computer can't find a word - player wins bonus!
      setScore(s => s + 100);
      setMessage(isKorean ? '상대가 단어를 못 찾았습니다! +100점 보너스!' : "Opponent can't find a word! +100 bonus!");
      soundManager?.play('levelUp');
      // Pick a new random starter
      const newStarter = wordPool.filter(w => !newUsed.has(w) && answerable(getLastChar(w)));
      if (newStarter.length > 0) {
        const next = newStarter[Math.floor(Math.random() * newStarter.length)];
        newUsed.add(next);
        setUsedWords(newUsed);
        setCurrentWord(next);
        setTimeout(() => {
          setChain(prev => [...prev, { word: `---`, isPlayer: false, isCorrect: true }, { word: next, isPlayer: false, isCorrect: true }]);
        }, 500);
      }
      return;
    }

    newUsed.add(computerWord);
    setUsedWords(newUsed);
    setCurrentWord(computerWord);

    setTimeout(() => {
      setChain(prev => [...prev, { word: computerWord, isPlayer: false, isCorrect: true }]);
    }, 400);
  };

  const lastChar = currentWord ? getLastChar(currentWord) : '';

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {isKorean ? '끝말잇기' : 'Word Chain'}
        </h1>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          {isKorean
            ? '상대 단어의 마지막 글자로 시작하는 단어를 이어가세요!'
            : 'Type a word starting with the last letter of the previous word!'}
        </p>
        <div className="max-w-md mx-auto mb-8 text-left">
          <Card className="p-4">
            <h3 className="font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              {isKorean ? '게임 규칙' : 'Rules'}
            </h3>
            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>{isKorean ? '• 상대 단어의 마지막 글자로 시작하는 단어 입력' : '• Type a word starting with the last letter'}</li>
              <li>{isKorean ? '• 이미 사용한 단어는 사용 불가' : '• No repeating words'}</li>
              <li>{isKorean ? '• 정답 시 시간 +3초 보너스' : '• Correct answer gives +3 seconds'}</li>
              <li>{isKorean ? '• 연속 정답으로 콤보 보너스 점수!' : '• Chain combos for bonus points!'}</li>
              <li>{isKorean ? '• 시간이 0이 되면 게임 오버' : '• Game over when time runs out'}</li>
            </ul>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>
          {isKorean ? '게임 시작' : 'Start Game'}
        </Button>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Outfit'", color: 'var(--color-error)' }}>
          {isKorean ? '시간 종료!' : 'Time\'s Up!'}
        </h1>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
          <Card className="p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isKorean ? '점수' : 'Score'}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isKorean ? '단어 수' : 'Words'}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-secondary)' }}>{totalWords}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{isKorean ? '최대 콤보' : 'Max Combo'}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-combo)' }}>{maxCombo}</div>
          </Card>
        </div>
        <div className="max-w-md mx-auto mb-6">
          <Card className="p-3">
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{isKorean ? '단어 체인' : 'Word Chain'}</div>
            <div className="flex flex-wrap gap-1">
              {chain.filter(e => e.word !== '---').map((entry, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{
                  background: entry.isPlayer ? 'rgba(108,92,231,0.3)' : 'rgba(0,210,211,0.2)',
                  color: entry.isPlayer ? 'var(--color-primary-light)' : 'var(--color-secondary)',
                }}>
                  {entry.word}
                </span>
              ))}
            </div>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>{isKorean ? '다시 도전' : 'Play Again'}</Button>
      </div>
    );
  }

  const formatTime = (s: number) => s.toString();

  return (
    <div
      className="max-w-[600px] mx-auto px-4 py-5 rounded-2xl"
      style={{
        backgroundImage:
          'linear-gradient(rgba(9,7,22,0.80), rgba(9,7,22,0.90)), url(/game/puzzle/bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(108,92,231,0.28)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{isKorean ? '점수' : 'Score'} </span>
          <span className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</span>
          {combo > 1 && (
            <span className="ml-2 text-sm font-bold" style={{ color: 'var(--color-combo)' }}>{combo}x combo!</span>
          )}
        </div>
        <div className="text-3xl font-bold" style={{
          fontFamily: "'JetBrains Mono'",
          color: timeLeft <= 3 ? 'var(--color-error)' : timeLeft <= 6 ? 'var(--color-accent-warm)' : 'var(--color-secondary)',
          animation: timeLeft <= 3 ? 'pulse 0.5s ease-in-out infinite' : undefined,
        }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Chain display */}
      <Card className="p-4 mb-4" style={{ maxHeight: '250px', overflowY: 'auto' }}>
        <div className="flex flex-wrap gap-2 items-center">
          {chain.map((entry, i) => (
            entry.word === '---' ? (
              <div key={i} className="w-full text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>— {isKorean ? '새 라운드' : 'New Round'} —</div>
            ) : (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && chain[i - 1]?.word !== '---' && (
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                )}
                <span
                  className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: entry.isPlayer
                      ? 'rgba(108,92,231,0.25)'
                      : 'rgba(0,210,211,0.15)',
                    color: entry.isPlayer ? '#A29BFE' : '#00D2D3',
                    border: `1px solid ${entry.isPlayer ? 'rgba(108,92,231,0.4)' : 'rgba(0,210,211,0.3)'}`,
                  }}
                >
                  {entry.word}
                </span>
              </div>
            )
          ))}
          <div ref={chainEndRef} />
        </div>
      </Card>

      {/* Current hint */}
      <div className="text-center mb-4">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isKorean ? '다음 글자: ' : 'Next letter: '}
        </span>
        <span className="text-3xl font-bold" style={{ color: 'var(--color-accent-warm)', fontFamily: "'Outfit'" }}>
          {isKorean ? lastChar : lastChar.toUpperCase()}
        </span>
        <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
          {isKorean ? '(으)로 시작하는 단어' : ''}
        </span>
      </div>

      {/* Message */}
      {message && (
        <div className="text-center text-sm mb-3 font-bold" style={{
          color: message.includes('보너스') || message.includes('bonus') ? 'var(--color-success)' : 'var(--color-error)'
        }}>
          {message}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border-2 text-lg text-center"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', 'Noto Sans KR'",
            borderColor: 'var(--key-border)',
            fontSize: '1.25rem',
          }}
          placeholder={isKorean ? `'${lastChar}'(으)로 시작하는 단어...` : `Word starting with '${lastChar.toUpperCase()}'...`}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" size="lg">{isKorean ? '입력' : 'Go'}</Button>
      </form>

      {/* Used words count */}
      <div className="text-center mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {isKorean ? `사용한 단어: ${totalWords}개` : `Words used: ${totalWords}`}
      </div>
    </div>
  );
}
