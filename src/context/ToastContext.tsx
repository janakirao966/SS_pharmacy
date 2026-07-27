import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, ShieldCheck, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Floating Premium Toasts Container */}
      <div className="toasts-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <div className="toast-icon-badge">
              {toast.type === 'success' && <CheckCircle2 size={18} className="toast-icon" />}
              {toast.type === 'error' && <AlertCircle size={18} className="toast-icon" />}
              {toast.type === 'info' && <ShieldCheck size={18} className="toast-icon" />}
            </div>
            <div className="toast-body">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
            <div className={`toast-progress-bar toast-progress-${toast.type}`} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
