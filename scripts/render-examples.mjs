import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { check, render } from 'nodelace';

const flags = new Set(process.argv.slice(2));
for (const flag of flags) {
  if (!['--check-only', '--offline', '--png'].includes(flag)) {
    throw new Error(`Unknown option: ${flag}`);
  }
}
if (flags.has('--offline')) {
  globalThis.fetch = () => { throw new Error('Unexpected network request during local rendering'); };
}
const examples = new URL('../examples/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', examples), 'utf8'));
await mkdir(new URL('rendered/', examples), { recursive: true });
const jobs = catalog.flatMap(example => ['light', 'dark'].map(theme => ({
  id: `${example.id}-${theme}`, base: examples,
  source: `sources/${example.id}.diagram`, options: { theme },
})));
const styles = new URL('styles/', examples);
const variants = JSON.parse(await readFile(new URL('catalog.json', styles), 'utf8'));
await mkdir(new URL('rendered/', styles), { recursive: true });
for (const variant of variants) {
  const options = { size: variant.size || 'fit' };
  if (variant.profile) options.profile = await readFile(new URL(variant.profile, styles), 'utf8');
  else options.theme = variant.theme || 'light';
  jobs.push({ id: variant.id, base: styles, source: variant.source, options,
    expectedWarnings: variant.expectedWarnings || [] });
}
let browser;
if (flags.has('--png') && !flags.has('--check-only')) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Run npm install --no-save --package-lock=false playwright, then npx playwright install chromium'); }
  browser = await chromium.launch();
}
try {
  for (const job of jobs) {
      const source = await readFile(new URL(job.source, job.base), 'utf8');
      const diagnostics = await check(source, job.options);
      const warnings = diagnostics.filter(item => item.severity === 'warning').map(item => item.code).sort();
      if (diagnostics.some(item => item.severity === 'error') ||
          JSON.stringify(warnings) !== JSON.stringify([...(job.expectedWarnings || [])].sort())) {
        throw new Error(`${job.id}: unexpected diagnostics ${JSON.stringify(diagnostics)}`);
      }
      if (!flags.has('--check-only')) {
        const base = `rendered/${job.id}`;
        const svg = await render(source, job.options);
        await writeFile(new URL(`${base}.svg`, job.base), svg);
        await writeFile(new URL(`${base}.html`, job.base), await render(source, { ...job.options, format: 'html' }));
        if (browser) {
          const width = Number(svg.match(/<svg[^>]*\bwidth="(\d+)"/)[1]);
          const height = Number(svg.match(/<svg[^>]*\bheight="(\d+)"/)[1]);
          const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
          await page.route(/^https?:/, route => route.abort());
          await page.setContent(`<html><body style="margin:0">${svg.replace(/^<\?xml[^>]+>\s*/, '')}</body></html>`);
          await page.evaluate(() => document.fonts.ready);
          const png = await page.locator('svg').screenshot({ type: 'png' });
          await writeFile(new URL(`${base}.png`, job.base), png);
          await page.close();
        }
      }
      console.log(`${job.id}: OK${warnings.length ? ` (expected warning: ${warnings.join(', ')})` : ''}`);
  }
} finally {
  await browser?.close();
}
console.log(`${jobs.length} variants checked${flags.has('--check-only') ? '' : ' and rendered'}.`);
