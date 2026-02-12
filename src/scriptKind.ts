import ts from 'typescript';

export function getScriptKind(id: string): ts.ScriptKind {
  const cleanId = id.split('?')[0] ?? '';
  const ext = cleanId.slice(cleanId.lastIndexOf('.'));

  switch (ext) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.ts':
      return ts.ScriptKind.TS;
    case '.js':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.Unknown;
  }
}
