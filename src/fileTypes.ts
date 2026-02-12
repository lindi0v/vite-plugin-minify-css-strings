export function isTargetFile(id: string): boolean {
  const cleanId = id.split('?')[0];

  if (!cleanId || cleanId.includes('/node_modules/')) {
    return false;
  }

  return (
    cleanId.endsWith('.ts') ||
    cleanId.endsWith('.js') ||
    cleanId.endsWith('.tsx') ||
    cleanId.endsWith('.jsx')
  );
}
