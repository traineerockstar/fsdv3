import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  title: string;
  content: React.ReactNode;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  content,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Create a portal to mount the modal outside the current DOM hierarchy
  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onCancel}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-md transform rounded-2xl bg-[#0F172A] border border-slate-700 shadow-2xl transition-all animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
          <h3 id="modal-title" className="text-lg font-bold text-white tracking-wide">
            {title}
          </h3>
          <button 
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-slate-300">
          {content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg hover:scale-105 transition-transform ${
                variant === 'danger' 
                 ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500' 
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};