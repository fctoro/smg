import { useState, useCallback } from "react";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";

type ConfirmOptions = {
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  confirmText?: string;
  cancelText?: string;
};

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfig(options);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ConfirmComponent = () => (
    <ConfirmModal
      isOpen={isOpen}
      onClose={close}
      onConfirm={config.onConfirm}
      title={config.title}
      message={config.message}
      isDestructive={config.isDestructive}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
    />
  );

  return { confirm, ConfirmComponent };
}
