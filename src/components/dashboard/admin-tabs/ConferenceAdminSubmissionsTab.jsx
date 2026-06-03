"use client";

import { AdminDataListTab, UserCell, formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminSubmissionsTab({ conferenceId }) {
  return (
    <AdminDataListTab
      label="Submitted papers"
      conferenceId={conferenceId}
      endpoint="submissions"
      emptyMessage="No paper submissions for this conference yet."
      columns={[
        { key: "user", label: "Author" },
        { key: "title", label: "Paper title" },
        { key: "status", label: "Status" },
        { key: "submitted", label: "Submitted" },
      ]}
      renderRow={(row) => (
        <tr key={row.id}>
          <UserCell user={row.user} />
          <td className="px-4 py-3">
            <p className="font-medium text-foreground">{row.title}</p>
            {row.abstract ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.abstract}</p>
            ) : null}
            {row.fileUrl ? (
              <a
                href={row.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                View file
              </a>
            ) : null}
          </td>
          <td className="px-4 py-3 text-foreground">{row.status}</td>
          <td className="px-4 py-3 text-muted-foreground">
            {formatAdminDate(row.submittedAt || row.createdAt)}
          </td>
        </tr>
      )}
    />
  );
}
