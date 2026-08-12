import { formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ row: any }} props
 */
export function RegistrationDetailFields({ row }) {
  const form = row.formData ?? {};

  const fields = [
    ["Full name", row.displayName || form.fullName],
    ["Email", row.emailOmitted ? "Not provided" : row.user?.email],
    ["Gender", form.gender],
    ["Age range", form.ageRange],
    [
      "Telephone",
      form.telephone ? `${form.countryCode ?? ""} ${form.telephone}`.trim() : null,
    ],
    ["Country of origin", form.countryOfOrigin],
    ["Institution", form.institution || row.institution],
    ["Attendance", form.attendanceMode || row.attendanceMode],
    [
      "Sub-themes",
      (row.subThemes?.length ? row.subThemes : form.subThemes)?.join?.(", ") || null,
    ],
    ["Expectations", form.expectations],
    ["Post-conference events", form.postConferenceEvents],
    [
      "Disability",
      form.hasDisability === "Yes"
        ? form.disabilityDetails || "Yes"
        : form.hasDisability || null,
    ],
    ["Registered", formatAdminDate(row.registeredAt)],
    [
      "Last access",
      row.lastAccessAt ? formatAdminDate(row.lastAccessAt) : "Never",
    ],
    [
      "Payment status",
      row.status === "CONFIRMED" && row.paymentStatus
        ? "Paid"
        : row.paymentStatus === "pending_verification"
          ? "Pending verification"
          : row.paymentStatus,
    ],
    [
      "Account",
      row.accountActivated ? "Activated" : "Pending activation (must set password)",
    ],
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value]) =>
        value ? (
          <div key={label} className={label === "Expectations" ? "sm:col-span-2" : undefined}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
          </div>
        ) : null,
      )}
      {row.paymentProofUrl ? (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">Payment proof</dt>
          <dd className="mt-0.5">
            <a
              href={row.paymentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View uploaded file
            </a>
          </dd>
        </div>
      ) : null}
      {row.improvementRequest ? (
        <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <dt className="text-xs font-medium text-amber-900">Previous improvement request</dt>
          <dd className="mt-1 text-sm text-amber-900">{row.improvementRequest}</dd>
        </div>
      ) : null}
    </dl>
  );
}
