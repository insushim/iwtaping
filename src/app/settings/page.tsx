'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { UserSettings } from '@/types/user';

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--key-border)]">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SelectBtn({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
          style={{
            background: value === opt.value ? 'var(--color-primary)' : 'var(--bg-tertiary)',
            color: value === opt.value ? 'white' : 'var(--text-secondary)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-11 h-6 rounded-full transition-all relative"
      style={{ background: value ? 'var(--color-primary)' : 'var(--bg-tertiary)' }}
    >
      <div
        className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
        style={{ left: value ? '22px' : '2px', background: 'white' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, resetSettings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings({ [key]: value });
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>설정</h1>

      {/* Keyboard */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-muted)' }}>키보드</h2>
        <SettingRow label="언어">
          <SelectBtn options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} value={settings.language} onChange={(v) => set('language', v as 'ko' | 'en')} />
        </SettingRow>
        <SettingRow label="한글 자판">
          <SelectBtn options={[{ value: 'qwerty-ko', label: '두벌식' }, { value: 'sebeol-390', label: '세벌식 390' }]} value={settings.keyboardLayout} onChange={(v) => set('keyboardLayout', v as UserSettings['keyboardLayout'])} />
        </SettingRow>
        <SettingRow label="가상 키보드">
          <Toggle value={settings.showKeyboard} onChange={(v) => set('showKeyboard', v)} />
        </SettingRow>
        <SettingRow label="손가락 가이드">
          <Toggle value={settings.showFingerGuide} onChange={(v) => set('showFingerGuide', v)} />
        </SettingRow>
        <SettingRow label="키 사운드">
          <Toggle value={settings.keySound} onChange={(v) => set('keySound', v)} />
        </SettingRow>
        <SettingRow label="사운드 종류">
          <SelectBtn options={[{ value: 'mechanical', label: '기계식' }, { value: 'membrane', label: '멤브레인' }, { value: 'bubble', label: '물방울' }]} value={settings.keySoundType} onChange={(v) => set('keySoundType', v as UserSettings['keySoundType'])} />
        </SettingRow>
      </Card>

      {/* Typing */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-muted)' }}>타이핑</h2>
        <SettingRow label="속도 단위">
          <SelectBtn options={[{ value: 'kpm', label: '타/분' }, { value: 'wpm', label: 'WPM' }, { value: 'cpm', label: 'CPM' }]} value={settings.speedUnit} onChange={(v) => set('speedUnit', v as UserSettings['speedUnit'])} />
        </SettingRow>
        <SettingRow label="커서 스타일">
          <SelectBtn options={[{ value: 'line', label: '라인' }, { value: 'block', label: '블록' }, { value: 'underline', label: '밑줄' }]} value={settings.caretStyle} onChange={(v) => set('caretStyle', v as UserSettings['caretStyle'])} />
        </SettingRow>
        <SettingRow label="부드러운 커서">
          <Toggle value={settings.smoothCaret} onChange={(v) => set('smoothCaret', v)} />
        </SettingRow>
        <SettingRow label="폰트 크기">
          <SelectBtn options={[{ value: 'sm', label: '소' }, { value: 'md', label: '중' }, { value: 'lg', label: '대' }, { value: 'xl', label: '특대' }]} value={settings.fontSize} onChange={(v) => set('fontSize', v as UserSettings['fontSize'])} />
        </SettingRow>
      </Card>

      {/* Theme */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-muted)' }}>테마</h2>
        <SettingRow label="테마">
          <SelectBtn options={[{ value: 'dark', label: '다크' }, { value: 'light', label: '라이트' }]} value={settings.theme} onChange={(v) => { set('theme', v as UserSettings['theme']); document.documentElement.setAttribute('data-theme', v); }} />
        </SettingRow>
      </Card>

      {/* Game */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-muted)' }}>게임</h2>
        <SettingRow label="게임 BGM">
          <Toggle value={settings.gameBgm} onChange={(v) => set('gameBgm', v)} />
        </SettingRow>
        <SettingRow label="효과음">
          <Toggle value={settings.sfx} onChange={(v) => set('sfx', v)} />
        </SettingRow>
        <SettingRow label="화면 흔들림">
          <Toggle value={settings.screenShake} onChange={(v) => set('screenShake', v)} />
        </SettingRow>
      </Card>

      <div className="flex gap-4">
        <Button variant="danger" onClick={() => { if (confirm('모든 설정을 초기화할까요?')) resetSettings(); }}>
          설정 초기화
        </Button>
      </div>
    </div>
  );
}
