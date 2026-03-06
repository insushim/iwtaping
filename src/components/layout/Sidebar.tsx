'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 hidden lg:block">
      <div className="sticky top-[calc(var(--header-height)+1rem)] rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
          {title}
        </h3>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
                  isActive ? 'font-medium' : ''
                }`}
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(108,92,231,0.1)' : 'transparent',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
