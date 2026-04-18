import Papa from "papaparse";

/**
 * Generate a CSV string from an array of objects.
 * Columns are specified to control order and headers.
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val);
    })
  );

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

/**
 * Trigger a CSV file download in the browser.
 * Call this from a client component.
 */
export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
