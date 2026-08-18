/**
 * Download a CSV file in the browser (Excel-compatible).
 * @param {string} filename
 * @param {string[]} headers
 * @param {Array<Array<string | number | null | undefined>>} rows
 */
export function downloadCsv(filename, headers, rows) {
  const esc = (value) => {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((row) => row.map(esc).join(",")),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
