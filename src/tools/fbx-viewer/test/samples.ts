import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FileLike } from '../infra/FbxModelLoader';

/** public/samples/ のサンプルを File の代わりに読み込む（テスト専用）。 */
export function sampleFile(name: string): FileLike {
  const buf = readFileSync(join(process.cwd(), 'public/samples', name));
  // テスト環境（jsdom）の ArrayBuffer で作り直す（instanceof の判定を通すため）
  const data = new ArrayBuffer(buf.length);
  new Uint8Array(data).set(buf);
  return { name, size: data.byteLength, arrayBuffer: async () => data.slice(0) };
}

export function bufferOf(bytes: number[] | string): ArrayBuffer {
  const arr = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

/** jsdom にない URL.createObjectURL / revokeObjectURL を補う。 */
export function installObjectUrlStub() {
  let n = 0;
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => `blob:test/${++n}`;
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => {};
  }
}
