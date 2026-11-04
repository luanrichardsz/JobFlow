import React from 'react';
import { useJobContext } from '../../context/JobContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useJobContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#3FBF8A] shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-[#e5a93b] shrink-0" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-4 h-4 text-[#e5484d] shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#a1a4aa] shrink-0" />
          );

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs shadow-lg transition-colors duration-150 animate-in fade-in slide-in-from-bottom-2 bg-[#16181b] text-[#f4f5f6] border-[#25272b] dark:bg-[#16181b] dark:text-[#f4f5f6] dark:border-[#25272b] light:bg-white light:text-neutral-900 light:border-neutral-200"
          >
            <div className="flex items-center gap-2.5 truncate">
              {icon}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
