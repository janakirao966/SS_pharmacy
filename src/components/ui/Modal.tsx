import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function Modal({ isOpen, onClose, title, children, ariaLabel }: ModalProps) {
  // Esc key closes modal (Accessibility WCAG 2.1.2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="gallery-lightbox-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div className="lightbox-content-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex justify-between items-center mb-4">
          <h3 className="modal-title font-display text-xl text-brand-primary">{title}</h3>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 min-w-[24px]"
          >
            <X size={20} />
          </Button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
