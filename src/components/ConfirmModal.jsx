import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          {message}
        </p>

        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium text-white transition ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-900 hover:bg-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
