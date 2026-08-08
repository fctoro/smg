"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

interface CustomReminderMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export const CustomReminderMessageModal: React.FC<CustomReminderMessageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMessage("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSubmit(message.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Rappel pour Autre Cas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Veuillez saisir le message personnalisé à envoyer aux parents.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message du rappel
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
              placeholder="Tapez votre message ici..."
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              Continuer vers la sélection
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
