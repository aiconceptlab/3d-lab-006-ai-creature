import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/xr', { recursive: true });
await cp('node_modules/@8thwall/engine-binary/dist', 'dist/xr', { recursive: true });
console.log('Copied pinned tracking engine into dist/xr.');
