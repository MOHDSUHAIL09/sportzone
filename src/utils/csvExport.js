function sanitizeCsvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  // Neutralize spreadsheet formula injection characters
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(',')),
  ];
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
