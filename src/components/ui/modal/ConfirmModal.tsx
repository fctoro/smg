import React from "react";
import { Modal } from "./index";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  isDestructive = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6">
      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
            isDestructive
              ? "bg-error-500 hover:bg-error-600"
              : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};
