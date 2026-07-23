'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { useAccountStore } from '@/stores/useAccountStore';

const DISMISS_KEY = 'typingverse-onboard-seen';
// 서버 validateNickname과 동일 규칙 (2~12자, 한글/영문/숫자/_)
const NICKNAME_RE = /^[가-힣a-zA-Z0-9_]{2,12}$/;

const GRADES: { id: string; label: string }[] = [
  { id: 'elem', label: '초등' },
  { id: 'middle', label: '중등' },
  { id: 'high', label: '고등' },
  { id: 'adult', label: '성인' },
];

/**
 * 첫 방문 계정 만들기.
 * 계정이 없으면(unregistered) 닉네임을 받아 서버에 등록한다 — 이게 있어야
 * 점수가 서버로 가고 전국 순위·리그에 참여된다. "나중에"로 닫을 수 있고,
 * 한 번 닫으면 로컬 플래그로 다시 자동으로 뜨지 않는다(헤더/순위 화면에서 재유도).
 */
export function AccountOnboarding() {
  const status = useAccountStore((s) => s.status);
  const createAccount = useAccountStore((s) => s.createAccount);

  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 계정이 없고 아직 안 닫았으면 자동으로 연다
  useEffect(() => {
    if (status === 'unregistered') {
      const seen = typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY);
      if (!seen) setOpen(true);
    }
    if (status === 'online') setOpen(false);
  }, [status]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  const submit = async () => {
    const name = nickname.trim();
    if (!NICKNAME_RE.test(name)) {
      setError('닉네임은 한글·영문·숫자 2~12자로 입력해주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await createAccount(name, 'cat', grade);
      if (user) {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
        setOpen(false);
      } else {
        setError('계정을 만들지 못했어요. 닉네임이 이미 있거나 네트워크 문제일 수 있어요.');
      }
    } catch {
      setError('계정을 만들지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={dismiss} title="전국 순위에 참여하기">
      <div className="text-center mb-4">
        <div className="flex justify-center mb-2">
          <Mascot mood="excited" size={72} showBubble={false} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          닉네임을 정하면 <strong>전국 순위·리그</strong>에 참여하고,<br />내 등수를 확인할 수 있어요.
        </p>
      </div>

      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>닉네임</label>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !busy) submit(); }}
        maxLength={12}
        autoFocus
        placeholder="예: 타자왕"
        className="w-full px-4 py-3 rounded-xl border text-base mb-3"
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--key-border)' }}
      />

      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>학년 (선택)</label>
      <div className="flex gap-2 mb-3">
        {GRADES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrade(grade === g.id ? undefined : g.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              background: grade === g.id ? 'var(--color-primary)' : 'var(--bg-tertiary)',
              color: grade === g.id ? '#fff' : 'var(--text-secondary)',
              borderColor: grade === g.id ? 'var(--color-primary)' : 'var(--key-border)',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs mb-3" style={{ color: 'var(--color-error)' }}>{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" size="md" className="flex-1" onClick={dismiss} disabled={busy}>나중에</Button>
        <Button size="md" className="flex-1" onClick={submit} disabled={busy}>
          {busy ? '만드는 중…' : '시작하기'}
        </Button>
      </div>
      <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
        실명·이메일은 받지 않아요. 닉네임에 실명을 넣지 마세요.
      </p>
    </Modal>
  );
}
