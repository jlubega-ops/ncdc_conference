"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   title?: string;
 *   emailSent?: boolean | null;
 *   tempPassword?: string | null;
 *   email?: string | null;
 * }} props
 */
export function TempPasswordDialog({
  open,
  onClose,
  title = "Temporary password",
  emailSent = null,
  tempPassword = "",
  email = "",
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {emailSent === true ? (
          <p className="text-sm text-foreground">
            An email was sent{email ? ` to ${email}` : ""}. Copy the temporary password below in
            case the email does not arrive.
          </p>
        ) : emailSent === false ? (
          <p className="text-sm text-foreground">
            The email could not be sent. Copy the temporary password and share it with the user
            manually.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Copy this temporary password and share it with the user. They must change it on first
            login. It is hidden after they set their own password.
          </p>
        )}
        {tempPassword ? (
          <div className="rounded-md border border-border bg-neutral-50 px-4 py-3">
            <p className="mb-1 text-xs text-muted-foreground">Temporary password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-base tracking-widest text-foreground">
                {tempPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                icon={copied ? Check : ClipboardCopy}
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                aria-label="Copy temporary password"
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No temporary password is stored.</p>
        )}
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
