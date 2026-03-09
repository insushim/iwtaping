'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';

interface WordEntry {
  word: string;
  isPlayer: boolean;
  isCorrect: boolean;
}

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
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const isKorean = settings.language === 'ko';

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
          setWordPool([...new Set([...m1.koreanWordsBeginner, ...m2.koreanWordsIntermediate, ...extraWords])].filter(w => w.length >= 2));
        } else {
          const m1 = await import('@/data/english/words-common200');
          const m2 = await import('@/data/english/words-common1000');
          setWordPool([...new Set([...m1.englishCommon200, ...m2.englishCommon1000, ...extraWords])].filter(w => w.length >= 3));
        }
      } catch {
        setWordPool(extraWords.length > 0 ? extraWords :
          (isKorean
            ? ['사과', '과일', '일출', '출발', '발자국', '국어', '어머니', '니트', '트럭', '럭비']
            : ['apple', 'elephant', 'tiger', 'rabbit', 'turtle', 'eagle', 'eel', 'lion', 'newt']));
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

  const findComputerWord = useCallback((lastChar: string): string | null => {
    const candidates = wordPool.filter(w =>
      getFirstChar(w) === lastChar && !usedWords.has(w)
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [wordPool, usedWords, getFirstChar]);

  const startGame = () => {
    const starter = wordPool.length > 0
      ? wordPool[Math.floor(Math.random() * wordPool.length)]
      : (isKorean ? '사과' : 'apple');

    setStatus('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTotalWords(0);
    setChain([{ word: starter, isPlayer: false, isCorrect: true }]);
    setCurrentWord(starter);
    setUsedWords(new Set([starter]));
    setInput('');
    setTimeLeft(12);
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

    // Validate
    if (firstChar !== lastChar) {
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
    setTimeLeft(Math.min(timeLeft + 3, 15)); // Bonus time
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
      const newStarter = wordPool.filter(w => !newUsed.has(w));
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
    <div className="max-w-[600px] mx-auto px-4 py-4">
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
