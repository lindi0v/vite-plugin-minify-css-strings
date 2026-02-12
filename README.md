# vite-plugin-minify-css-strings

Vite plugin that minifies CSS inside template literals marked with `/* css */` at build time.

## Install

```bash
npm i -D vite-plugin-minify-css-strings
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { minifyCssStrings } from 'vite-plugin-minify-css-strings';

export default defineConfig({
  plugins: [
    minifyCssStrings({
      lightningcss: {
        // Any lightningcss transform options (except filename/code/minify/sourceMap)
        // targets: { chrome: 90 },
      },
    }),
  ],
});
```

In your code:

```ts
const color = 'red';
const otherStyles = '* {box-sizing: border-box}';
const styles = /* css */ `
  .button {
    padding: 10px 20px;
    color: ${color};
  }

  ${otherStyles}
`;
```

## Notes

- The marker must be immediately followed by a template literal (only whitespace allowed between them).
- Template literals with interpolations are supported.

## Release

This repo is set up to publish to npm and create a GitHub Release on version tags.