import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(root, 'dist/server');
const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    if (url.pathname.includes('.')) return response;

    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  },
};
`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'index.js'), worker, 'utf8');
