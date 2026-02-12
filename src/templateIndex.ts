import ts from 'typescript';

export type TemplateSegment = { type: 'text'; value: string } | { type: 'expr'; value: string };

export type IndexedTemplate = { endBacktick: number; segments: TemplateSegment[] };

export function indexTemplatesByBacktick(
  sourceFile: ts.SourceFile,
  code: string,
): Map<number, IndexedTemplate> {
  const map = new Map<number, IndexedTemplate>();

  const record = (startBacktick: number, endBacktick: number, segments: TemplateSegment[]) => {
    if (code[startBacktick] !== '`') {
      return;
    }

    if (endBacktick <= startBacktick || code[endBacktick] !== '`') {
      return;
    }

    map.set(startBacktick, { endBacktick, segments });
  };

  const visit = (node: ts.Node) => {
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sourceFile);
      const endBacktick = node.getEnd() - 1;

      record(start, endBacktick, [{ type: 'text', value: node.text }]);
    } else if (ts.isTemplateExpression(node)) {
      const start = node.head.getStart(sourceFile);
      const segments: TemplateSegment[] = [{ type: 'text', value: node.head.text }];

      for (const span of node.templateSpans) {
        segments.push({ type: 'expr', value: span.expression.getText(sourceFile) });
        segments.push({ type: 'text', value: span.literal.text });
      }

      const lastLiteral = node.templateSpans.at(-1)?.literal;

      if (lastLiteral) {
        const endBacktick = lastLiteral.getEnd() - 1;

        record(start, endBacktick, segments);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return map;
}
