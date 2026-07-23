import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 · TypingVerse',
  description: 'TypingVerse는 실명·이메일·연락처를 수집하지 않는 최소수집 서비스입니다.',
};

const UPDATED = '2026-07-23';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-[760px] mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
        개인정보처리방침
      </h1>
      <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        시행일 {UPDATED} · TypingVerse는 「개인정보 보호법」을 준수합니다.
      </p>

      <Section title="1. 수집하는 정보와 목적">
        <p className="mb-2">
          TypingVerse는 회원가입 시 <strong>실명·이메일·전화번호·주소·비밀번호를 수집하지 않습니다.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>닉네임, 아바타(프리셋), 연령대 범주(초등/중등/고등/성인, 선택): 서비스 표시 및 학년별 순위 제공</li>
          <li>기기 식별값의 암호화 해시(원문은 저장하지 않음): 계정 식별 및 복구</li>
          <li>타이핑 기록(속도·정확도), 게임 내 가상 재화·순위: 통계 및 랭킹 제공</li>
        </ul>
        <p className="mt-2">
          서비스는 광고·분석용 제3자 추적 도구를 사용하지 않으며, 쿠키를 사용하지 않습니다.
          가상 재화(코인·XP)는 실제 화폐가 아니며 현금 결제·환불 기능이 없습니다.
        </p>
      </Section>

      <Section title="2. 보유 및 파기">
        <p>
          수집한 정보는 마지막 접속 후 12개월 또는 회원 탈퇴 시까지 보유하며, 그 후 지체 없이 파기합니다.
          계정 삭제 시 해당 계정과 연결된 기록(점수·재화·순위 등)은 함께 삭제됩니다.
        </p>
      </Section>

      <Section title="3. 국외 이전(보관·처리 위탁)">
        <p className="mb-2">
          서비스는 데이터 저장·처리를 위해 Cloudflare, Inc.(미국 등)의 인프라를 이용하며,
          이 과정에서 위 정보가 국외 서버에 저장될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>이전받는 자: Cloudflare, Inc.</li>
          <li>이전 항목: 위 1항의 정보</li>
          <li>이전 시점·방법: 서비스 이용 시점, 네트워크를 통한 전송</li>
          <li>이용 목적·보유 기간: 위 1·2항과 동일</li>
        </ul>
      </Section>

      <Section title="4. 만 14세 미만 아동">
        <p>
          서비스는 개인을 식별할 수 있는 정보(실명·이메일·연락처 등)를 수집하지 않으므로 별도의
          법정대리인 동의 절차를 두지 않습니다. 이용자는 닉네임 등에 <strong>실명·연락처 등 개인정보를
          입력해서는 안 됩니다.</strong>
        </p>
      </Section>

      <Section title="5. 이용자의 권리">
        <p>
          서비스는 이용자를 식별할 수 있는 정보(실명·이메일·연락처 등)를 보관하지 않습니다.
          브라우저 저장소(로컬 스토리지)를 초기화하면 해당 기기와 계정의 연결이 해제되며,
          서버에 남은 익명 기록은 위 2항의 보존기간에 따라 지체 없이 파기됩니다.
        </p>
      </Section>

      <Section title="6. 고지의 의무">
        <p>본 방침은 {UPDATED}부터 적용되며, 내용이 변경될 경우 서비스 내 공지를 통해 알립니다.</p>
      </Section>
    </div>
  );
}
