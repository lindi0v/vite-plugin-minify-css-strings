export function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '\f';
}

export function getLastNonWhitespaceChar(text: string): string | null {
  for (let i = text.length - 1; i >= 0; i -= 1) {
    const c = text[i]!;
    if (!isWhitespace(c)) {
      return c;
    }
  }
  return null;
}

export function getFirstNonWhitespaceChar(text: string): string | null {
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (!isWhitespace(c)) {
      return c;
    }
  }
  return null;
}
