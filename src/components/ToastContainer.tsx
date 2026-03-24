import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrada con pequeño delay para triggear la transición CSS
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss a los 3.5 s
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.id, onDismiss]);

  const styles: Record<ToastType, { bg: string; border: string; text: string; icon: JSX.Element }> = {
    success: {
      bg: 'bg-white',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle size={18} className="text-green-500 shrink-0" />,
    },
    error: {
      bg: 'bg-white',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle size={18} className="text-red-500 shrink-0" />,
    },
    info: {
      bg: 'bg-white',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info size={18} className="text-blue-500 shrink-0" />,
    },
  };

  const s = styles[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border
        ${s.bg} ${s.border} ${s.text}
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        max-w-sm w-full
      `}
    >
      {s.icon}
      <span className="flex-1 text-sm font-medium leading-snug">{toast.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
