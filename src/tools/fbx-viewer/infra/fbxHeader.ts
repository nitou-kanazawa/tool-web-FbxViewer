import { FbxViewerError } from '../errors';

export interface FbxHeader {
  format: 'binary' | 'ascii';
  /** 7400 のような整数 */
  version: number;
}

/** 対応する最小バージョン（要件定義書 §7）。 */
export const MIN_SUPPORTED_VERSION = 7000;

const BINARY_MAGIC = 'Kaydara FBX Binary  ';
const ASCII_SCAN_BYTES = 64 * 1024;

/**
 * FBX のヘッダを読み、形式とバージョンを返す。
 * FBX でなければ NOT_FBX、未対応のバージョンなら UNSUPPORTED_VERSION を投げる。
 */
export function readFbxHeader(buffer: ArrayBuffer): FbxHeader {
  const header = parseHeader(buffer);
  if (header.version < MIN_SUPPORTED_VERSION) {
    throw new FbxViewerError('UNSUPPORTED_VERSION', String(header.version));
  }
  return header;
}

function parseHeader(buffer: ArrayBuffer): FbxHeader {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 27 && startsWith(bytes, BINARY_MAGIC)) {
    const version = new DataView(buffer).getUint32(23, true);
    return { format: 'binary', version };
  }
  const text = new TextDecoder().decode(bytes.subarray(0, ASCII_SCAN_BYTES));
  const match = /FBXVersion:\s*(\d+)/.exec(text);
  if (match) return { format: 'ascii', version: Number(match[1]) };
  throw new FbxViewerError('NOT_FBX');
}

function startsWith(bytes: Uint8Array, magic: string): boolean {
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic.charCodeAt(i)) return false;
  }
  return true;
}
