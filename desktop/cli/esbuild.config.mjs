// esbuild 打包 CLI → 单文件 Node.js 可执行 JS
import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(__dirname, 'dist/index.js'),

  // 不写 banner — 手动 prepend shebang 避免重复
  external: ['fast-glob'],
});

// 手动 prepend shebang（去掉 esbuild banner 可能残留的额外 shebang）
const outPath = path.join(__dirname, 'dist/index.js');
let content = fs.readFileSync(outPath, 'utf-8');
while (content.startsWith('#!/usr/bin/env node\n')) {
  content = content.slice('#!/usr/bin/env node\n'.length);
}
fs.writeFileSync(outPath, `#!/usr/bin/env node\n${content}`, 'utf-8');
console.log('CLI built: dist/index.js');
