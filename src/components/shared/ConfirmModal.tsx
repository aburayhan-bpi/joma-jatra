"use client";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import CustomButton from "@/components/shared/CustomButton";

type ConfirmModalTone = "default" | "danger";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmModalTone;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const ConfirmModal = ({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <button
        type="button"
        aria-label="Close confirm dialog"
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-101 w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-5 shadow-[0_14px_38px_rgba(7,42,31,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded text-muted-foreground transition-colors hover:cursor-pointer hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <CustomButton
            type="button"
            variant="outline"
            className="w-full sm:w-auto hover:cursor-pointer bg-card text-foreground border-border hover:bg-muted hover:text-foreground transition-colors"
            onClick={onClose}
            disabled={loading}
            btnText={cancelText}
          />

          <CustomButton
            type="button"
            variant="default"
            className={`w-full sm:w-auto hover:cursor-pointer border-none transition-all ${
              tone === "danger"
                ? "bg-error text-white hover:bg-error-80"
                : "bg-primary text-primary-foreground hover:bg-brand-dark"
            }`}
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
            btnText={confirmText}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmModal;
