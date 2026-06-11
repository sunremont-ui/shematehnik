// Скачивание текстового файла из браузера (экспорт нетлиста/Gerber/STL…).
export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Скачивание бинарного блоба (STL и т.п.).
export function downloadBlob(filename: string, data: BlobPart, mime = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
