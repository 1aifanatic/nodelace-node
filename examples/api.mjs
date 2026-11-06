import { mkdir, writeFile } from 'node:fs/promises';
import { render, check, parse, NodelaceError } from 'nodelace';

const source = 'architecture "Order service"\nBrowser -> API: HTTPS\nAPI -> Database: query';
const output = new URL('../output/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  const diagnostics = await check(source, { theme: 'dark' });
  if (diagnostics.length) throw new Error(JSON.stringify(diagnostics));
  const options = { theme: 'dark', idPrefix: 'order-service' };
  await writeFile(new URL('api.svg', output), await render(source, options));
  await writeFile(new URL('api.html', output), await render(source, { ...options, format: 'html' }));
  const model = await parse(source);
  console.log(`Wrote output/api.svg and output/api.html (${model.nodes.length} nodes).`);
} catch (error) {
  if (error instanceof NodelaceError) console.error(error.code, error.line, error.column);
  throw error;
}
