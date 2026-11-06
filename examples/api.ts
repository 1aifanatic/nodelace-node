import { mkdir, writeFile } from 'node:fs/promises';
import { render, check, type RenderOptions } from 'nodelace';

const options: RenderOptions = { theme: 'dark', format: 'svg', idPrefix: 'typed-example' };
const source = 'architecture "TypeScript"\nBrowser -> API: HTTPS';
const diagnostics = await check(source, { theme: 'dark' });
if (diagnostics.length) throw new Error(JSON.stringify(diagnostics));
await mkdir('output', { recursive: true });
await writeFile('output/typescript.svg', await render(source, options));
console.log('Wrote output/typescript.svg.');
