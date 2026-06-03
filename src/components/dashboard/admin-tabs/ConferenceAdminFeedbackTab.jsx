"use client";

import { AdminDataListTab, UserCell, formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminFeedbackTab({ conferenceId }) {
  return (
    <AdminDataListTab
      label="Evaluations and comments"
      conferenceId={conferenceId}
      endpoint="feedback"
      emptyMessage="No evaluations or comments for this conference yet."
      getSearchText={(row) =>
        [row.user?.email, row.user?.name, row.comment, row.rating].filter(Boolean).join(" ")
      }
      columns={[
        { key: "user", label: "User" },
        { key: "rating", label: "Rating" },
        { key: "comment", label: "Comment" },
        { key: "date", label: "Submitted" },
      ]}
      renderRow={(row) => (
        <tr key={row.id}>
          <UserCell user={row.user} />
          <td className="px-4 py-3 text-foreground">{row.rating ? `${row.rating}/5` : "—"}</td>
          <td className="max-w-md px-4 py-3 text-sm text-muted-foreground">{row.comment}</td>
          <td className="px-4 py-3 text-muted-foreground">{formatAdminDate(row.createdAt)}</td>
        </tr>
      )}
    />
  );
}
