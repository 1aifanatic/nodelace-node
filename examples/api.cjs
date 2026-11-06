const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const { render } = await import('nodelace');
  const directory = path.join(__dirname, '..', 'output');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'commonjs.svg'), await render('flow "CommonJS"\nStart -> Finish'));
  console.log('Wrote output/commonjs.svg.');
})().catch(error => { console.error(error); process.exitCode = 1; });
