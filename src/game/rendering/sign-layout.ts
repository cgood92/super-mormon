/** Canvas layout uses the plaque's aspect ratio so glyphs keep their proportions. */
export function layoutSign(
  words: string,
  width: number,
  height: number,
  measure: (text: string, fontSize: number) => number,
  pixelRatio = 1,
) {
  const scale = Math.min(
    128 * Math.min(2, Math.max(1, pixelRatio)),
    2048 / Math.max(width, height),
  );
  const canvasHeight = Math.max(1, Math.floor(height * scale));
  const canvasWidth = Math.max(1, Math.round((canvasHeight * width) / height));
  const padding = Math.max(2, Math.min(canvasWidth, canvasHeight) * 0.14);
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;
  const wrap = (size: number) => {
    const lines: string[] = [];
    for (const paragraph of words.split("\n")) {
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate, size) <= availableWidth) {
          line = candidate;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        // Even a long unbroken name is retained in full, across lines if necessary.
        for (const character of Array.from(word)) {
          if (line && measure(line + character, size) > availableWidth) {
            lines.push(line);
            line = "";
          }
          line += character;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  let low = 0.01;
  let high = availableHeight * 0.82;
  for (let attempt = 0; attempt < 28; attempt++) {
    const size = (low + high) / 2;
    const lines = wrap(size);
    const fits =
      lines.length * size * 1.2 <= availableHeight &&
      lines.every((line) => measure(line, size) <= availableWidth);
    if (fits) low = size;
    else high = size;
  }
  const fontSize = low;
  const text = wrap(fontSize);
  const lineHeight = fontSize * 1.2;
  return {
    canvasWidth,
    canvasHeight,
    padding,
    fontSize,
    lines: text.map((line, index) => ({
      text: line,
      y: canvasHeight / 2 + (index - (text.length - 1) / 2) * lineHeight,
    })),
  };
}
