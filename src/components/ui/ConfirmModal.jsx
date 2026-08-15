"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   onConfirm: () => void;
 *   title: string;
 *   message: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   variant?: "primary" | "danger";
 *   loading?: boolean;
 * }} props
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="md"
      zIndex={100}
    >
      <p className="whitespace-pre-line text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
