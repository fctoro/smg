"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title = "Image" }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center p-6">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            onError={(e) => {
              console.error("Error loading image:", e);
              e.currentTarget.src = "/images/user/silhouette.svg";
            }}
          />
        </div>
      </div>
    </Modal>
  );
}