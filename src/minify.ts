import { Features, transform as lightningTransform } from 'lightningcss';

export type LightningOptions = Parameters<typeof lightningTransform>[0];
export type LightningTargets = NonNullable<LightningOptions['targets']>;

export function minifyCss(
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
