'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colors = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-secondary)',
    warning: 'var(--color-warning)',
  };

  return (
    <div
      className="px-4 py-3 rounded-xl text-sm font-medium count-up cursor-pointer min-w-[200px]"
      style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${colors[toast.type]}`, color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }}
      onClick={() => onRemove(toast.id)}
    >
      {toast.message}
    </div>
  );
}
