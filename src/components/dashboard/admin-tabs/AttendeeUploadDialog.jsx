"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   conferenceId: string;
 *   open: boolean;
 *   onClose: () => void;
 *   onUploaded?: () => void;
 * }} props
 */
export function AttendeeUploadDialog({ conferenceId, open, onClose, onUploaded }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("pick");

  function reset() {
    setPreview([]);
    setSummary(null);
    setStep("pick");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function downloadTemplate() {
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendees/template`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not download template.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendee-upload-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    }
  }

  async function onFileChange(file) {
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendees/preview`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not preview file.");
      setPreview(data.preview ?? []);
      setSummary(data.summary ?? null);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed.");
      reset();
    } finally {
      setBusy(false);
    }
  }

  async function confirmUpload() {
    if (preview.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/attendees/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview, allowErrors: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success(data.message || "Attendees uploaded.");
      if (data.results?.errors?.length) {
        toast.warning(`${data.results.errors.length} row(s) failed during upload.`);
      }
      reset();
      onClose();
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload attendees" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download the CSV template, fill in attendees, then attach the file. Required columns:
          email, firstName, lastName. Optional: middleName, gender (M/F), telephone,
          countryOfOrigin, organisation. Rows with errors are highlighted — you can still upload;
          only rows with a valid email are processed. Access codes are not emailed on upload —
          use Send access codes afterward.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" icon={Download} onClick={downloadTemplate}>
            Download template
          </Button>
          <label className="inline-flex">
            <Button
              type="button"
              variant="secondary"
              icon={Upload}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy && step === "pick" ? "Reading…" : "Attach CSV"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
          </label>
        </div>

        {summary ? (
          <p className="text-xs text-muted-foreground">
            {summary.total} row(s) · {summary.valid} valid · {summary.withErrors} with errors
          </p>
        ) : null}

        {step === "preview" && preview.length > 0 ? (
          <>
            <div className="max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-neutral-50 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Line</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Organisation</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row) => (
                    <tr
                      key={`${row.line}-${row.email}`}
                      className={cn(!row.valid && "bg-error/5")}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row.line ?? "—"}</td>
                      <td className="px-3 py-2">{row.email || "—"}</td>
                      <td className="px-3 py-2">{row.fullName || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.institution || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <span className="text-xs font-medium text-primary">OK</span>
                        ) : (
                          <span className="text-xs text-error">{row.errors.join(" ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={reset}>
                Choose another file
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy || preview.length === 0}
                onClick={confirmUpload}
              >
                {busy ? "Uploading…" : "Confirm upload"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
