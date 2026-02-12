import { Features, transform as lightningTransform } from 'lightningcss';

export type LightningOptions = Parameters<typeof lightningTransform>[0];
export type LightningTargets = NonNullable<LightningOptions['targets']>;

function transformCss(
  cssText: string,
  filename: string,
  options: Omit<LightningOptions, 'filename' | 'code' | 'minify' | 'sourceMap'> | undefined,
): string {
  const defaultTargets: LightningTargets = {
    chrome: 90,
    firefox: 90,
    safari: 15,
  };

  const targets: LightningTargets = options?.targets ?? defaultTargets;
  const include = (options?.include ?? 0) | Features.Nesting;

  const transformed = lightningTransform({
    ...(options ?? {}),
    filename,
    code: Buffer.from(cssText),
    minify: true,
    sourceMap: false,
    targets,
    include,
  });

  return Buffer.from(transformed.code).toString('utf8');
}

export function minifyCss(
  cssText: string,
  filename: string,
  options: Omit<LightningOptions, 'filename' | 'code' | 'minify' | 'sourceMap'> | undefined,
): string {
  try {
    return transformCss(cssText, filename, options);
  } catch (error) {
    // lightningcss expects a full stylesheet. Some users use the marker for inline
    // declaration blocks (e.g. style="..." content). We support that by wrapping
    // declarations into a dummy rule and then unwrapping the minified result.
    const trimmed = cssText.trim();

    const looksLikeDeclarationsOnly =
      trimmed !== '' &&
      !trimmed.includes('{') &&
      !trimmed.includes('}') &&
      !trimmed.startsWith('@') &&
      trimmed.includes(':') &&
      trimmed.includes(';');

    if (!looksLikeDeclarationsOnly) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';

      throw new Error(
        `[vite-plugin-minify-css-strings] Failed to minify CSS in ${filename}: ${message}`,
        { cause: error },
      );
    }

    const wrapperSelector = '.__vite_minify_css_strings__';
    const wrapped = `${wrapperSelector}{${cssText}}`;

    try {
      const minifiedWrapped = transformCss(wrapped, filename, options);
      const prefix = `${wrapperSelector}{`;

      if (!minifiedWrapped.startsWith(prefix) || !minifiedWrapped.endsWith('}')) {
        throw new Error(
          `[vite-plugin-minify-css-strings] Failed to unwrap minified inline declarations for ${filename}. ` +
            'Please report this as a bug with a minimal reproduction.',
          { cause: error },
        );
      }

      return minifiedWrapped.slice(prefix.length, -1);
    } catch (wrapperError) {
      const message =
        wrapperError instanceof Error
          ? wrapperError.message
          : typeof wrapperError === 'string'
            ? wrapperError
            : 'Unknown error';

      throw new Error(
        `[vite-plugin-minify-css-strings] Failed to minify inline declaration block CSS in ${filename}: ${message}`,
        { cause: wrapperError },
      );
    }
  }
}
