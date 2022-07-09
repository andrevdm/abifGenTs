//import * as fs from 'fs'
import { promises as fsp } from 'fs';
//import { join } from 'path';


// ###############################################################################################################################
// Basic IO
// ###############################################################################################################################
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
// ###############################################################################################################################


// ###############################################################################################################################
// ABIF types
// ###############################################################################################################################
interface IRenderData{
  () : Uint8Array[]
}

//Data, includes all the info required for a dir entry
type AbifData = {
  readonly name: string;
  readonly tagNumber: number;
  readonly elementType : number;
  readonly elementSize : number;
  readonly elementCount : number;
  readonly renderData : IRenderData;
  dataOffset: number | Uint8Array;
}
// ###############################################################################################################################


// ###############################################################################################################################
// Data types
// ###############################################################################################################################
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
    dataOffset: 0,
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
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 1,
    elementSize: 1,
    elementCount: 0,
    renderData: () => []
  }
}

function dataByte(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 1,
    elementSize: 1,
    elementCount: vs.length,
    renderData: () => vs.map(mkUint8)
  }
}

function dataChar(name: string, tagNum: number, s: string) : AbifData{
  const utf = new TextEncoder();
  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 2,
    elementSize: 1,
    elementCount: s.length,
    renderData: () => [utf.encode(s)]
  }
}
// ###############################################################################################################################


// ###############################################################################################################################
// ABIF write
// ###############################################################################################################################

/* Write the ABIF file
   The structure will be
     - Header
         . "ABIF" magic number
         . version
         . dir entry that points to the directory entries
     - Data values []
     - Directory []   (point back to data values)
*/
async function writeAbif(f: fsp.FileHandle, ds: AbifData[]) : Promise<void> {
  // ------------------------------------------------------------------------------
  // - Header
  // ------------------------------------------------------------------------------
  await f.write("ABIF")
  await f.write(mkUint16(101)) // Version 1.1

  // Dir entry that points to the start of the actual directory
  // Written with 0 as the offset, this will get patched later
  const dirPointer = dataHeaderDir(ds.length);
  await writeDirEntry(f, dirPointer);
  //47 2 byte ints of empty space
  await f.write(new Uint8Array(47 * 2))
  // ------------------------------------------------------------------------------


  // ------------------------------------------------------------------------------
  // - data values
  // ------------------------------------------------------------------------------
  let dataOffset = 128; //128 == end of header

  for( const d_ in ds ){
    const d = ds[d_];
    const dataSize = d.elementSize * d.elementCount;

    // Get the raw data bytes
    const raw = concatArrays(d.renderData());

    if( raw.length != dataSize ){
      throw `Invalid data size in ${d.name}. Got ${raw.length}, expected ${dataSize}`;
    }

    // Only write data if its greater than 4 bytes in size, for 4 or less the data will be written in the entry
    if( dataSize > 4 )
    {
      await f.write(raw);
      d.dataOffset = dataOffset;
      dataOffset += dataSize;
    } else {
      // Raw data is stored in the directory entry's offset field
      const rawOffset = new Uint8Array(4)
      rawOffset.set(raw);
      d.dataOffset = rawOffset;
    }
  }
  // ------------------------------------------------------------------------------


  // ------------------------------------------------------------------------------
  // - Directory
  // ------------------------------------------------------------------------------
  const dirStartOffset = dataOffset;
  for(const d_ in ds){
    const d = ds[d_];
    await writeDirEntry( f, d )
  }
  // ------------------------------------------------------------------------------

  //fixup offset of directory
  await f.sync()
  await f.write(mkInt32(dirStartOffset), null, null, 26)
}


async function writeDirEntry(f: fsp.FileHandle, d: AbifData ) : Promise<void> {
  await f.write(mkStrOfLen(d.name, 4))
  await f.write(mkInt32(d.tagNumber))
  await f.write(mkInt16(d.elementType))
  await f.write(mkInt16(d.elementSize))
  await f.write(mkInt32(d.elementCount))
  await f.write(mkInt32(d.elementSize * d.elementCount))

  if( d.dataOffset instanceof Uint8Array ){
    await f.write(d.dataOffset)
  } else {
    await f.write(mkInt32(d.dataOffset))
  }

  await f.write(mkInt32(0)) //reserved datahandle
}
// ###############################################################################################################################


async function main(){
  const f = await fsp.open("a.abif", 'w')

  const ds = [
    dataByte("dat1", 1, [1,2,3,4]),
    dataChar("dat2", 1, "ABc"),
    dataChar("dat3", 1, "ABcdef!!"),
  ]

  await writeAbif(f, ds)


  await f.close()
}


main()
