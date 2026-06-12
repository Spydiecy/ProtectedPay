'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    if (type !== 'loading') {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [type, onClose]);

  const ICON_MAP = { success: CheckCircle, error: XCircle, loading: Loader2 };
  const Icon = ICON_MAP[type];

  const colors = {
    success: { bg: 'var(--surface-card)', border: 'var(--success)',  icon: 'var(--success)'  },
    error:   { bg: 'var(--surface-card)', border: 'var(--error)',    icon: 'var(--error)'    },
    loading: { bg: 'var(--surface-card)', border: 'var(--primary)',  icon: 'var(--primary)'  },
  }[type];

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9000,
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      maxWidth: 340, minWidth: 240,
      animation: 'fadeIn 0.2s ease',
    }}>
      <Icon size={17} style={{ color: colors.icon, flexShrink: 0, marginTop: 1, ...(type === 'loading' ? { animation: 'spin 1s linear infinite' } : {}) }} />
      <p style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.5 }}>{message}</p>
      {type !== 'loading' && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-subtle)', padding: 0, display: 'flex', flexShrink: 0 }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
