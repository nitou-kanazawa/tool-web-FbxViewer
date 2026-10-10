/**
 * 最小限の FBX バイナリ（7.4 形式）ライター。
 *
 * テスト用・サンプル用の FBX を自作するためのもの。Autodesk FBX SDK の
 * 出力と完全に同じではないが、three.js の FBXLoader が読める構造を出力する。
 * 形式の参考: https://code.blender.org/2013/08/fbx-binary-file-format-specification/
 */

export type FbxProp =
  | { t: 'C'; v: boolean }
  | { t: 'I'; v: number }
  | { t: 'L'; v: bigint }
  | { t: 'D'; v: number }
  | { t: 'S'; v: string }
  | { t: 'R'; v: Uint8Array }
  | { t: 'i'; v: ArrayLike<number> }
  | { t: 'l'; v: ArrayLike<bigint> }
  | { t: 'f'; v: ArrayLike<number> }
  | { t: 'd'; v: ArrayLike<number> };

export interface FbxNode {
  name: string;
  props: FbxProp[];
  children: FbxNode[];
}

// プロパティを作るヘルパー
export const I = (v: number): FbxProp => ({ t: 'I', v });
export const L = (v: number | bigint): FbxProp => ({ t: 'L', v: BigInt(v) });
export const D = (v: number): FbxProp => ({ t: 'D', v });
export const S = (v: string): FbxProp => ({ t: 'S', v });
export const R = (v: Uint8Array): FbxProp => ({ t: 'R', v });
export const ai = (v: ArrayLike<number>): FbxProp => ({ t: 'i', v });
export const al = (v: ArrayLike<bigint>): FbxProp => ({ t: 'l', v });
export const af = (v: ArrayLike<number>): FbxProp => ({ t: 'f', v });
export const ad = (v: ArrayLike<number>): FbxProp => ({ t: 'd', v });

export function node(name: string, props: FbxProp[] = [], children: FbxNode[] = []): FbxNode {
  return { name, props, children };
}

/** FBX のオブジェクト名は「名前\0\x01クラス名」の形式で保存される。 */
export function objectName(name: string, className: string): string {
  return `${name}\u0000\u0001${className}`;
}

const MAGIC = 'Kaydara FBX Binary  \u0000';
const NULL_RECORD_SIZE = 13;
const encoder = new TextEncoder();

class ByteWriter {
  private buf = new Uint8Array(1024);
  private view = new DataView(this.buf.buffer);
  offset = 0;

  private ensure(size: number) {
    if (this.offset + size <= this.buf.length) return;
    let len = this.buf.length * 2;
    while (len < this.offset + size) len *= 2;
    const next = new Uint8Array(len);
    next.set(this.buf);
    this.buf = next;
    this.view = new DataView(next.buffer);
  }

  u8(v: number) {
    this.ensure(1);
    this.view.setUint8(this.offset, v);
    this.offset += 1;
  }
  u32(v: number) {
    this.ensure(4);
    this.view.setUint32(this.offset, v, true);
    this.offset += 4;
  }
  i32(v: number) {
    this.ensure(4);
    this.view.setInt32(this.offset, v, true);
    this.offset += 4;
  }
  i64(v: bigint) {
    this.ensure(8);
    this.view.setBigInt64(this.offset, v, true);
    this.offset += 8;
  }
  f32(v: number) {
    this.ensure(4);
    this.view.setFloat32(this.offset, v, true);
    this.offset += 4;
  }
  f64(v: number) {
    this.ensure(8);
    this.view.setFloat64(this.offset, v, true);
    this.offset += 8;
  }
  bytes(v: Uint8Array) {
    this.ensure(v.length);
    this.buf.set(v, this.offset);
    this.offset += v.length;
  }
  patchU32(at: number, v: number) {
    this.view.setUint32(at, v, true);
  }
  result(): Uint8Array {
    return this.buf.slice(0, this.offset);
  }
}

function writeProp(w: ByteWriter, p: FbxProp) {
  w.u8(p.t.charCodeAt(0));
  switch (p.t) {
    case 'C':
      w.u8(p.v ? 1 : 0);
      return;
    case 'I':
      w.i32(p.v);
      return;
    case 'L':
      w.i64(p.v);
      return;
    case 'D':
      w.f64(p.v);
      return;
    case 'S': {
      const b = encoder.encode(p.v);
      w.u32(b.length);
      w.bytes(b);
      return;
    }
    case 'R':
      w.u32(p.v.length);
      w.bytes(p.v);
      return;
    case 'i':
    case 'f': {
      w.u32(p.v.length);
      w.u32(0); // 非圧縮
      w.u32(p.v.length * 4);
      for (let i = 0; i < p.v.length; i++) {
        if (p.t === 'i') w.i32(p.v[i]);
        else w.f32(p.v[i]);
      }
      return;
    }
    case 'l':
    case 'd': {
      w.u32(p.v.length);
      w.u32(0);
      w.u32(p.v.length * 8);
      for (let i = 0; i < p.v.length; i++) {
        if (p.t === 'l') w.i64(p.v[i] as bigint);
        else w.f64(p.v[i] as number);
      }
      return;
    }
  }
}

function writeNode(w: ByteWriter, n: FbxNode) {
  const start = w.offset;
  w.u32(0); // endOffset（後で埋める）
  w.u32(n.props.length);
  w.u32(0); // propertyListLen（後で埋める）
  const name = encoder.encode(n.name);
  w.u8(name.length);
  w.bytes(name);
  const propStart = w.offset;
  for (const p of n.props) writeProp(w, p);
  w.patchU32(start + 8, w.offset - propStart);
  if (n.children.length > 0 || n.props.length === 0) {
    for (const c of n.children) writeNode(w, c);
    w.bytes(new Uint8Array(NULL_RECORD_SIZE));
  }
  w.patchU32(start, w.offset);
}

export function writeFbxBinary(nodes: FbxNode[], version = 7400): Uint8Array {
  const w = new ByteWriter();
  w.bytes(encoder.encode(MAGIC));
  w.u8(0x1a);
  w.u8(0x00);
  w.u32(version);
  for (const n of nodes) writeNode(w, n);
  w.bytes(new Uint8Array(NULL_RECORD_SIZE));
  // フッター: 16 バイトの ID、16 バイト境界までのパディング、バージョン、ゼロ埋め、16 バイトのマジック
  w.bytes(
    new Uint8Array([
      0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66, 0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26,
      0x7e,
    ]),
  );
  const pad = (16 - (w.offset % 16)) % 16 || 16;
  w.bytes(new Uint8Array(pad));
  w.u32(0);
  w.u32(version);
  w.bytes(new Uint8Array(120));
  w.bytes(
    new Uint8Array([
      0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29,
      0x0b,
    ]),
  );
  return w.result();
}
