import type { TemplateSegment } from './templateIndex';
import { getFirstNonWhitespaceChar, getLastNonWhitespaceChar } from './whitespace';

export type PlaceholderBuildResult = {
  combined: string;
  placeholders: string[];
};

function minPositive(values: number[]): number {
  let min = -1;

  for (const value of values) {
    if (value === -1) {
      continue;
    }

    if (min === -1 || value < min) {
      min = value;
    }
  }

  return min;
}

function isProbablyInDeclarationValue(combined: string): boolean {
  const lastOpenBrace = combined.lastIndexOf('{');
  const lastCloseBrace = combined.lastIndexOf('}');

  if (lastOpenBrace === -1 || lastOpenBrace < lastCloseBrace) {
    return false;
  }

  const lastSemicolon = combined.lastIndexOf(';');
  const statementStart = Math.max(lastOpenBrace, lastSemicolon);

  const colonIndex = combined.indexOf(':', statementStart + 1);
  if (colonIndex === -1) {
    return false;
  }

  const nextOpenBrace = combined.indexOf('{', colonIndex + 1);
  const nextSemicolon = combined.indexOf(';', colonIndex + 1);
  const nextCloseBrace = combined.indexOf('}', colonIndex + 1);
  const declarationEnd = minPositive([nextSemicolon, nextCloseBrace]);

  if (nextOpenBrace !== -1 && (declarationEnd === -1 || nextOpenBrace < declarationEnd)) {
    return false;
  }

  return true;
}

function isSelectorStart(nextChar: string | null): boolean {
  return (
    nextChar === '.' ||
    nextChar === '#' ||
    nextChar === '*' ||
    nextChar === ':' ||
    nextChar === '[' ||
    nextChar === '&' ||
    nextChar === '-' ||
    (nextChar !== null && /[a-zA-Z_]/.test(nextChar))
  );
}

export function buildCssWithPlaceholders(
  segments: TemplateSegment[],
  placeholderPrefix: string,
): PlaceholderBuildResult {
  const placeholders: string[] = [];

  let combined = '';
  let exprIndex = 0;

  for (let segIndex = 0; segIndex < segments.length; segIndex += 1) {
    const seg = segments[segIndex]!;

    if (seg.type === 'text') {
      combined += seg.value;
      continue;
    }

    const previousChar = getLastNonWhitespaceChar(combined);
    const nextSeg = segments[segIndex + 1];
    const nextChar = nextSeg?.type === 'text' ? getFirstNonWhitespaceChar(nextSeg.value) : null;

    const identifierPlaceholder = `${placeholderPrefix}${exprIndex}__`;
    const valuePlaceholder = `var(--${placeholderPrefix}${exprIndex}__)`;
    const rulePlaceholder = `.__${placeholderPrefix}${exprIndex}__{--${placeholderPrefix}${exprIndex}__:0}`;

    const inValueContext = previousChar === ':' || isProbablyInDeclarationValue(combined);

    // Selector contexts (including full selector interpolations like `${expr} { ... }`).
    const selectorNextChar =
      nextChar === '{' ||
      nextChar === ',' ||
      nextChar === '.' ||
      nextChar === '#' ||
      nextChar === ':' ||
      nextChar === '[' ||
      nextChar === '>' ||
      nextChar === '+' ||
      nextChar === '~' ||
      nextChar === '*';
    const inClassOrIdSelector = previousChar === '.' || previousChar === '#';
    const probablySelectorContext = !inValueContext && (inClassOrIdSelector || selectorNextChar);

    // Support `--${expr}:` custom properties by using identifier characters.
    const afterCustomPropPrefix = combined.endsWith('--');
    const beforeColon = nextChar === ':';
    const inCustomPropertyName = afterCustomPropPrefix && beforeColon;

    // Standalone interpolation used in a rule list position (e.g. `${expr}` between rules or at top level).
    // `var()` is invalid there, so we insert a dummy rule and replace it back afterward.
    const ruleBoundaryBefore =
      previousChar === null || previousChar === '{' || previousChar === '}' || previousChar === ';';
    const ruleBoundaryAfter =
      nextChar === null || nextChar === '}' || nextChar === '@' || isSelectorStart(nextChar);
    const probablyRuleListContext = !inValueContext && ruleBoundaryBefore && ruleBoundaryAfter;

    const placeholder = probablyRuleListContext
      ? rulePlaceholder
      : inCustomPropertyName || probablySelectorContext
        ? identifierPlaceholder
        : valuePlaceholder;

    placeholders.push(placeholder);
    combined += placeholder;
    exprIndex += 1;
  }

  return { combined, placeholders };
}
