'use client';

import { useMemo } from 'react';
import { DailyStats } from '@/types/stats';
import { toDateKey } from '@/lib/utils/helpers';

interface ContributionCalendarProps {
  dailyStats: DailyStats[];
  className?: string;
}

export function ContributionCalendar({ dailyStats, className = '' }: ContributionCalendarProps) {
  const { weeks, months, maxVal } = useMemo(() => {
    // Build 52 weeks of data
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const statsMap = new Map<string, DailyStats>();
    for (const s of dailyStats) {
      statsMap.set(s.date, s);
    }

    let maxVal = 1;
    const weeks: { date: string; value: number; day: number }[][] = [];
    let currentWeek: { date: string; value: number; day: number }[] = [];

    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const d = new Date(startDate);
    let col = 0;
    while (d <= today) {
      const dateStr = toDateKey(d);
      const stat = statsMap.get(dateStr);
      const value = stat ? stat.sessionsCount : 0;
      if (value > maxVal) maxVal = value;

      const month = d.getMonth();
      if (month !== lastMonth) {
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        months.push({ label: monthNames[month], col });
        lastMonth = month;
      }

      currentWeek.push({ date: dateStr, value, day: d.getDay() });

      if (d.getDay() === 6 || d.getTime() === today.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
        col++;
      }

      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, months, maxVal };
  }, [dailyStats]);

  function getColor(value: number): string {
    if (value === 0) return 'var(--bg-tertiary)';
    const intensity = value / maxVal;
    if (intensity < 0.25) return 'rgba(108, 92, 231, 0.25)';
    if (intensity < 0.5) return 'rgba(108, 92, 231, 0.45)';
    if (intensity < 0.75) return 'rgba(108, 92, 231, 0.65)';
    return 'rgba(108, 92, 231, 0.9)';
  }

  const cellSize = 11;
  const gap = 2;
  const gridLeft = 26; // 요일 라벨 칸(24) + flex gap(2)
  const gridWidth = weeks.length * (cellSize + gap);

  // 한 달 이름의 폭은 최대 3글자(≈26px) = 두 칸 남짓이다. 달이 바뀐 열이
  // 직전 라벨과 그보다 가까우면 글자가 겹치므로 그 달은 표시하지 않는다.
  const minCols = Math.ceil(28 / (cellSize + gap));
  const monthTicks = months.reduce<typeof months>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && m.col - last.col < minCols) {
      // 맨 앞 라벨은 시작 주에 며칠만 걸친 조각 달이라 다음 달과 붙는다.
      // 그럴 땐 조각을 버리고 온전한 다음 달을 보여준다(8월이 통째로 사라지던 자리).
      if (acc.length === 1 && last.col === 0) acc[0] = m;
      return acc;
    }
    acc.push(m);
    return acc;
  }, []);

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Month labels — 열 위치에 절대 배치한다.
          flex + position:relative로 밀면 relative가 원래 자리를 그대로 차지해서
          글자 폭이 누적되고, 결국 '7월8월'·'12월1월'처럼 서로 겹쳐 붙는다. */}
      <div className="mb-1 text-xs" style={{ paddingLeft: gridLeft }}>
        <div className="relative" style={{ width: gridWidth, height: 16, color: 'var(--text-muted)' }}>
          {monthTicks.map((m) => (
            <span
              key={m.col}
              style={{ position: 'absolute', left: m.col * (cellSize + gap), top: 0, whiteSpace: 'nowrap' }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 text-xs pr-1" style={{ color: 'var(--text-muted)', width: 24 }}>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>월</span>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>수</span>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>금</span>
          <span style={{ height: cellSize }}></span>
        </div>

        {/* Grid */}
        <div className="flex gap-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                const cell = week.find(c => c.day === dayIdx);
                return (
                  <div
                    key={dayIdx}
                    className="rounded-sm transition-colors"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: cell ? getColor(cell.value) : 'transparent',
                    }}
                    title={cell ? `${cell.date}: ${cell.value}회 연습` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>적음</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: cellSize,
              height: cellSize,
              background: v === 0 ? 'var(--bg-tertiary)' :
                `rgba(108, 92, 231, ${0.25 + v * 0.65})`,
            }}
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
