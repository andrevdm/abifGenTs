//import * as fs from 'fs'
import { promises as fsp } from 'fs';
//import { join } from 'path';


// -------------------------------------------------------------------------------------------------------------------------------
// Basic IO
// -------------------------------------------------------------------------------------------------------------------------------
interface ISetInt{
  (v : DataView) : void
}

function mkInt(size: number, fn : ISetInt) : Uint8Array {
  const a = new ArrayBuffer(size);
  const v = new DataView(a);
  fn(v)
  return new Uint8Array(a);
}

function mkUint8(i: number) : Uint8Array {
  return mkInt(1, v => v.setUint8(0, i) )
}

function mkUint16(i: number, littleEndian = false) : Uint8Array {
  return mkInt(2, v => v.setUint16(0, i, littleEndian) )
}

function mkUint32(i: number, littleEndian = false) : Uint8Array {
  return mkInt(4, v => v.setUint32(0, i, littleEndian) )
}

function mkInt8(i: number) : Uint8Array {
  return mkInt(1, v => v.setInt8(0, i) )
}

function mkInt16(i: number, littleEndian = false) : Uint8Array {
  return mkInt(2, v => v.setInt16(0, i, littleEndian) )
}

function mkInt32(i: number, littleEndian = false) : Uint8Array {
  return mkInt(4, v => v.setInt32(0, i, littleEndian) )
}

function mkStrOfLen(s: string, len: number){
  return s.padEnd(len, " ").slice(0, len)
}
// -------------------------------------------------------------------------------------------------------------------------------


// -------------------------------------------------------------------------------------------------------------------------------
// ABIF types
// -------------------------------------------------------------------------------------------------------------------------------
interface IRenderData{
  () : Uint8Array[]
}

type AbifData = {
  readonly name: string;
  readonly tagNumber: number;
  readonly elementType : number;
  readonly elementSize : number;
  readonly elementCount : number;
  readonly renderData : IRenderData;
}

type DirEntry = {
  readonly data: AbifData,
  dataOffset: number;
  //data : IWriteData;
}

function dirEntryFromData(d: AbifData) : DirEntry{
  const raw = concatArrays( d.renderData() );
  //TODO assert: raw.length == size * count
  return {
    data: d,
    dataOffset: 0, //TODO
    //data : IWriteData;
  }
}
// -------------------------------------------------------------------------------------------------------------------------------


// -------------------------------------------------------------------------------------------------------------------------------
// Data types
// -------------------------------------------------------------------------------------------------------------------------------
function concatArrays(as: Uint8Array[]) : Uint8Array {
  const size = as.reduce( (b, a) => b + a.length, 0)
  const combined = new Uint8Array(size);
  let offset = 0;
  as.forEach( a => {
    combined.set(a, offset);
    offset += a.length;
  } )
  return combined;
}

function dataHeaderDir(numEntries: number) : AbifData{
  return {
    name: "tdir",
    tagNumber: 1,
    elementType: 1023,
    elementSize: 28,
    elementCount: numEntries,
    renderData: () => []
  }
}


function dataNull(name: string, tagNum: number) : AbifData{
  return {
    name: name,
    tagNumber: tagNum,
    elementType: 1,
    elementSize: 1,
    elementCount: 0,
    renderData: () => []
  }
}

function dataBytes(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    name: name,
    tagNumber: tagNum,
    elementType: 1,
    elementSize: 1,
    elementCount: vs.length,
    renderData: () => vs.map(mkUint8)
  }
}
// -------------------------------------------------------------------------------------------------------------------------------


// -------------------------------------------------------------------------------------------------------------------------------
// ABIF write
// -------------------------------------------------------------------------------------------------------------------------------
async function writeHeader(f: fsp.FileHandle, numEntries: number) : Promise<void> {
  await f.write("ABIF")
  await f.write(mkUint16(101)) // Version 1.1

  //Dir entry that points to the start of the actual directory
  // Written with 0 as the offset, this will get patched later
  const dir = dataHeaderDir(numEntries);
  const dirPointer: DirEntry = {
    data: dir,
    dataOffset: 0,
  }

  await writeDirEntry(f, dirPointer);

  //47 2 byte ints of empty space
  await f.write(new Uint8Array(47 * 2))
}


async function writeDirEntry(f: fsp.FileHandle, d: DirEntry ) : Promise<void> {
  await f.write(mkStrOfLen(d.data.name, 4))
  await f.write(mkInt32(d.data.tagNumber))
  await f.write(mkInt16(d.data.elementType))
  await f.write(mkInt16(d.data.elementSize))
  await f.write(mkInt32(d.data.elementCount))
  await f.write(mkInt32(d.data.elementSize * d.data.elementCount))
  await f.write(mkInt32(d.dataOffset))
  await f.write(mkInt32(0))
}
// -------------------------------------------------------------------------------------------------------------------------------

async function main(){
  const f = await fsp.open("a.abif", 'w')
  await writeHeader(f, 1)


  await f.close()
}


main()
console.log("test")
