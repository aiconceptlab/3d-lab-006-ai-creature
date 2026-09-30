import {cp,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('public/vision',{recursive:true});
const model=await readFile('public/vision/person.tflite');
if(createHash('sha256').update(model).digest('hex')!=='2e04c53bfeac0ac2a30c057c7e2a777594ce39baaac35a92f74fb1e8c4fc4e0b')throw new Error('Vision model checksum mismatch.');
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/vision/wasm',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/vision_bundle.js','public/vision/vision_bundle.js');
