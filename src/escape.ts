export function escapeForTemplateLiteral(content: string): string {
  // Make the generated JS safe while preserving runtime string value.
  return content.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

export function escapeAccidentalInterpolation(content: string): string {
  // Prevent accidental `${` sequences from turning into JS interpolation.
  return content.replace(/\$\{/g, '\\${');
}
