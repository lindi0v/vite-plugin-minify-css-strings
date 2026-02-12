import MagicString from 'magic-string';
import ts from 'typescript';
import type { Plugin } from 'vite';

import { CSS_MARKER_RE } from './constants';
import { escapeAccidentalInterpolation, escapeForTemplateLiteral } from './escape';
import { isTargetFile } from './fileTypes';
import { minifyCss } from './minify';
import { buildCssWithPlaceholders } from './placeholders';
import { getScriptKind } from './scriptKind';
import { indexTemplatesByBacktick } from './templateIndex';
import { isWhitespace } from './whitespace';

export interface MinifyCssStringsOptions {
  lightningcss?: Omit<
    Parameters<typeof import('lightningcss').transform>[0],
    'filename' | 'code' | 'minify' | 'sourceMap'
  >;
}

export function minifyCssStrings(options: MinifyCssStringsOptions = {}): Plugin {
  return {
    name: 'vite-plugin-minify-css-strings',
    apply: 'build',
    enforce: 'pre',

    transform(code, id) {
      if (!isTargetFile(id) || !CSS_MARKER_RE.test(code)) {
        return null;
      }

      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.Latest,
        true,
        getScriptKind(id),
      );

      const templatesByBacktick = indexTemplatesByBacktick(sourceFile, code);

      const s = new MagicString(code);
      let changed = false;
      let searchFrom = 0;
      const markerReGlobal = new RegExp(CSS_MARKER_RE.source, 'g');

      while (true) {
        markerReGlobal.lastIndex = searchFrom;
        const match = markerReGlobal.exec(code);

        if (!match) {
          break;
        }

        let i = match.index + match[0].length;

        while (i < code.length && isWhitespace(code[i]!)) {
          i += 1;
        }

        if (code[i] !== '`') {
          searchFrom = i;
          continue;
        }

        const template = templatesByBacktick.get(i);

        if (!template) {
          this.warn(`Skipping CSS template at ${id}:${i + 1} (could not parse template literal).`);

          searchFrom = i + 1;
          continue;
        }

        const placeholderPrefix = '__VITE_MINIFY_CSS_STR_EXPR_';
        const { combined, placeholders } = buildCssWithPlaceholders(
          template.segments,
          placeholderPrefix,
        );

        const minified = minifyCss(combined, id, options.lightningcss);
        let rewritten = escapeAccidentalInterpolation(escapeForTemplateLiteral(minified));

        // Restore expressions back into the template literal as real interpolations.
        let exprIndex = 0;

        for (const seg of template.segments) {
          if (seg.type !== 'expr') {
            continue;
          }

          const placeholder = placeholders[exprIndex]!;

          rewritten = rewritten.replaceAll(placeholder, '${' + seg.value + '}');
          exprIndex += 1;
        }

        // Overwrite only template contents (keep backticks as-is).
        s.overwrite(i + 1, template.endBacktick, rewritten);
        changed = true;

        searchFrom = template.endBacktick + 1;
      }

      if (!changed) {
        return null;
      }

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },
  };
}
