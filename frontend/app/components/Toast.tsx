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

  const config = {
    success: { icon: CheckCircle, bg: 'var(--md-surface-container-highest)', border: '#4CAF50', color: '#4CAF50' },
    error:   { icon: XCircle,     bg: 'var(--md-error-container)',            border: 'var(--md-error)', color: 'var(--md-error)' },
    loading: { icon: Loader2,     bg: 'var(--md-surface-container-highest)', border: 'var(--md-primary)', color: 'var(--md-primary)' },
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl max-w-sm"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <Icon size={18} className={type === 'loading' ? 'animate-spin mt-0.5' : 'mt-0.5'} style={{ color: config.color, flexShrink: 0 }} />
      <p className="body-medium flex-1" style={{ color: 'var(--md-on-surface)' }}>{message}</p>
      {type !== 'loading' && (
        <button onClick={onClose} style={{ color: 'var(--md-on-surface-variant)' }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
