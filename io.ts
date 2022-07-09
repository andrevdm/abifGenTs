export interface ISetInt{
  (v : DataView) : void
}

export function mkInt(size: number, fn : ISetInt) : Uint8Array {
  const a = new ArrayBuffer(size);
  const v = new DataView(a);
  fn(v)
  return new Uint8Array(a);
}

export function mkUint8(i: number) : Uint8Array {
  return mkInt(1, v => v.setUint8(0, i) )
}

export function mkUint16(i: number, littleEndian = false) : Uint8Array {
  return mkInt(2, v => v.setUint16(0, i, littleEndian) )
}

export function mkUint32(i: number, littleEndian = false) : Uint8Array {
  return mkInt(4, v => v.setUint32(0, i, littleEndian) )
}

export function mkInt8(i: number) : Uint8Array {
  return mkInt(1, v => v.setInt8(0, i) )
}

export function mkInt16(i: number, littleEndian = false) : Uint8Array {
  return mkInt(2, v => v.setInt16(0, i, littleEndian) )
}

export function mkInt32(i: number, littleEndian = false) : Uint8Array {
  return mkInt(4, v => v.setInt32(0, i, littleEndian) )
}

export function mkStrOfLen(s: string, len: number){
  return s.padEnd(len, " ").slice(0, len)
}
