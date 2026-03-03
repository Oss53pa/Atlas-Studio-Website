interface CSVColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string
) {
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(row =>
    columns
      .map(c => {
        const val = c.render ? c.render(row) : String(row[c.key as keyof T] ?? "");
        // Escape CSV values
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
