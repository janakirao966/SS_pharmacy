import { useEffect, useRef } from 'react';
import { Warning, X } from '@phosphor-icons/react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}: AdminConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus trapping & Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    // Store previously focused element to return focus after closure
    const activeElementBefore = document.activeElement as HTMLElement;

    document.addEventListener('keydown', handleKeyDown);
    
    // Set focus to the primary confirm action or confirm button
    setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      activeElementBefore?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="admin-app">
      <div className="admin-confirm-overlay" role="presentation" onClick={onCancel}>
        <div
          ref={dialogRef}
          className="admin-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="admin-confirm-header">
            <div className={`admin-confirm-icon-box ${isDestructive ? 'destructive' : ''}`}>
              <Warning size={20} weight="bold" />
            </div>
            <h2 id="confirm-dialog-title" className="admin-confirm-title">
              {title}
            </h2>
            <button
              type="button"
              className="admin-confirm-close"
              onClick={onCancel}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>

          <div className="admin-confirm-body">
            <p id="confirm-dialog-description" className="admin-confirm-message">
              {message}
            </p>
          </div>

          <div className="admin-confirm-footer">
            <button
              type="button"
              className="admin-btn-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className={`admin-btn-confirm ${isDestructive ? 'destructive' : ''}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
