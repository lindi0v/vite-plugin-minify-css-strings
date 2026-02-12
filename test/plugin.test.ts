import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';

import { minifyCssStrings } from '../src/index';

function getTransformHandler(transform: NonNullable<Plugin['transform']>) {
  if (typeof transform === 'function') {
    return transform;
  }

  if (typeof transform === 'object' && transform !== null) {
    return transform.handler;
  }

  throw new Error('Unknown transform hook shape');
}

async function runTransform(plugin: Plugin, code: string, id: string): Promise<string | null> {
  const transform = plugin.transform;

  if (!transform) {
    throw new Error('Plugin has no transform hook');
  }

  const handler = getTransformHandler(transform);

  type Ctx = ThisParameterType<typeof handler>;

  const warnings: string[] = [];

  const ctx = {
    warn(message: string | Error) {
      warnings.push(typeof message === 'string' ? message : message.message);
    },
  } as Ctx;

  const result = await handler.call(ctx, code, id);

  if (!result) {
    return null;
  }

  if (typeof result === 'string') {
    return result;
  }

  if (typeof result === 'object' && 'code' in result) {
    return result.code ?? null;
  }

  throw new Error('Unexpected transform result shape');
}

describe('vite-plugin-minify-css-strings', () => {
  it('minifies static CSS inside marked template literal', async () => {
    const plugin = minifyCssStrings();
    const input = ['const styles = /* css */ `', '  .a { color: red; }', '`;'].join('\n');

    const expected = 'const styles = /* css */ `.a{color:red}`;';
    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBe(expected);
  });

  it('preserves template interpolations', async () => {
    const plugin = minifyCssStrings();
    const input = [
      "const color = 'red';",
      'const styles = /* css */ `',
      '  .a { color: ${color}; }',
      '`;',
    ].join('\n');

    const expected = [
      "const color = 'red';",
      'const styles = /* css */ `.a{color:${color}}`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBe(expected);
  });

  it('treats comma-separated function args as value context', async () => {
    const plugin = minifyCssStrings();
    const input = [
      'const r = 1;',
      'const g = 2;',
      'const b = 3;',
      'const styles = /* css */ `',
      '  .a { color: rgb(${r}, ${g}, ${b}); }',
      '`;',
    ].join('\n');

    const expected = [
      'const r = 1;',
      'const g = 2;',
      'const b = 3;',
      'const styles = /* css */ `.a{color:rgb(${r}, ${g}, ${b})}`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('supports inline declaration blocks (no selector)', async () => {
    const plugin = minifyCssStrings();
    const input = [
      'const currentColor = "red";',
      'const side = "left" as const;',
      'const idx = 1;',
      'const step = 10;',
      'const styles = /*css*/`background-color: ${currentColor};',
      'top: ${side === "left" ? idx * step : idx * step + 200}px;',
      'animation-delay: ${idx * 300}ms`;',
    ].join('\n');

    const expected = [
      'const currentColor = "red";',
      'const side = "left" as const;',
      'const idx = 1;',
      'const step = 10;',
      'const styles = /*css*/`background-color:${currentColor};top:${side === "left" ? idx * step : idx * step + 200}px;animation-delay:${idx * 300}ms`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('preserves interpolations in selectors', async () => {
    const plugin = minifyCssStrings();
    const input = [
      "const cls = 'a';",
      'const styles = /* css */ `',
      '  .${cls} { color: red; }',
      '`;',
    ].join('\n');

    const expected = ["const cls = 'a';", 'const styles = /* css */ `.${cls}{color:red}`;'].join(
      '\n',
    );

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('preserves interpolations in id selectors', async () => {
    const plugin = minifyCssStrings();
    const input = [
      "const id = 'x';",
      'const styles = /* css */ `',
      '  #${id} { color: red; }',
      '`;',
    ].join('\n');

    const expected = ["const id = 'x';", 'const styles = /* css */ `#${id}{color:red}`;'].join(
      '\n',
    );

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('preserves interpolations used as a full selector', async () => {
    const plugin = minifyCssStrings();
    const input = [
      "const selector = '.dark';",
      'const styles = /* css */ `',
      '  ${selector} { color: red; }',
      '`;',
    ].join('\n');

    const expected = [
      "const selector = '.dark';",
      'const styles = /* css */ `${selector}{color:red}`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('preserves interpolations in custom property names', async () => {
    const plugin = minifyCssStrings();
    const input = [
      "const name = 'x';",
      'const styles = /* css */ `',
      '  :root { --${name}: 1px; }',
      '`;',
    ].join('\n');

    const expected = ["const name = 'x';", 'const styles = /* css */ `:root{--${name}:1px}`;'].join(
      '\n',
    );

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('preserves standalone interpolations between rules', async () => {
    const plugin = minifyCssStrings();
    const input = [
      'const chunk = /* css */ `',
      '  * { margin: 0; }',
      '`;',
      'const styles = /* css */ `',
      '  a { color: red; }',
      '  ${chunk}',
      '  b { color: blue; }',
      '`;',
    ].join('\n');

    const expected = [
      'const chunk = /* css */ `*{margin:0}`;',
      'const styles = /* css */ `a{color:red}${chunk}b{color:#00f}`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');
    expect(out).toBe(expected);
  });

  it('transpiles CSS nesting', async () => {
    const plugin = minifyCssStrings();
    const input = [
      'const styles = /* css */ `',
      '  body {',
      '    .some { color: red; }',
      '  }',
      '`;',
    ].join('\n');

    const expected = 'const styles = /* css */ `body .some{color:red}`;';

    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBe(expected);
  });

  it('handles multiple marked templates in one file', async () => {
    const plugin = minifyCssStrings();
    const input = [
      'const a = /* css */ ` .a { color: red; } `;',
      'const b = /* css */ ` .b { margin: 0px; } `;',
    ].join('\n');

    const expected = [
      'const a = /* css */ `.a{color:red}`;',
      'const b = /* css */ `.b{margin:0}`;',
    ].join('\n');

    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBe(expected);
  });

  it('escapes backticks in minified CSS so output JS stays valid', async () => {
    const plugin = minifyCssStrings();
    const input = 'const styles = /* css */ `a{content:"\\`"}`;';

    const expected = 'const styles = /* css */ `a{content:"\\`"}`;';
    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBe(expected);
  });

  it('returns null when no CSS markers are present', async () => {
    const plugin = minifyCssStrings();
    const input = 'const x = `not css`;';
    const out = await runTransform(plugin, input, '/src/file.ts');

    expect(out).toBeNull();
  });

  it('skips non-target file extensions', async () => {
    const plugin = minifyCssStrings();
    const input = 'const styles = /* css */ `.a { color: red; }`;';
    const out = await runTransform(plugin, input, '/src/file.css');

    expect(out).toBeNull();
  });
});
