import { FbxViewerError } from '../errors';
import { bufferOf } from '../test/samples';
import { readFbxHeader } from './fbxHeader';

function binaryHeader(version: number): ArrayBuffer {
  const bytes = new Uint8Array(27);
  bytes.set(new TextEncoder().encode('Kaydara FBX Binary  '), 0);
  bytes[20] = 0;
  bytes[21] = 0x1a;
  bytes[22] = 0;
  new DataView(bytes.buffer).setUint32(23, version, true);
  return bytes.buffer;
}

describe('readFbxHeader', () => {
  it('バイナリ形式のバージョンを読む', () => {
    expect(readFbxHeader(binaryHeader(7400))).toEqual({ format: 'binary', version: 7400 });
  });

  it('ASCII 形式のバージョンを読む', () => {
    const text =
      '; FBX 7.4.0 project file\nFBXHeaderExtension:  {\n\tFBXHeaderVersion: 1003\n\tFBXVersion: 7400\n}';
    expect(readFbxHeader(bufferOf(text))).toEqual({ format: 'ascii', version: 7400 });
  });

  it('7.0 未満は UNSUPPORTED_VERSION', () => {
    expect(() => readFbxHeader(binaryHeader(6100))).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_VERSION', detail: '6100' }),
    );
  });

  it('FBX でなければ NOT_FBX', () => {
    try {
      readFbxHeader(bufferOf('hello world'));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(FbxViewerError);
      expect((e as FbxViewerError).code).toBe('NOT_FBX');
    }
  });

  it('空のファイルは NOT_FBX', () => {
    expect(() => readFbxHeader(new ArrayBuffer(0))).toThrowError(
      expect.objectContaining({ code: 'NOT_FBX' }),
    );
  });
});
