"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";

import { isPdfProof } from "@/lib/club/payment-photo-utils";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title = "Justificatif de paiement" }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  const isPdf = isPdfProof(imageUrl);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={isPdf ? "max-w-5xl" : "max-w-4xl"} showCloseButton={false}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {isPdf && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                PDF
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Ouvrir dans un nouvel onglet"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Ouvrir</span>
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 min-h-[300px]">
          {isPdf ? (
            <div className="w-full h-[70vh] flex flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <iframe
                src={imageUrl}
                title={title}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain"
              onError={(e) => {
                console.error("Error loading image:", e);
                e.currentTarget.src = "/images/user/silhouette.svg";
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}