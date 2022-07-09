import { promises as fsp } from 'fs';
//import { join } from 'path';

import * as io from './io'



// ###############################################################################################################################
// ABIF types
// ###############################################################################################################################
export interface IRenderData{
  () : Uint8Array[]
}

//Data, includes all the info required for a dir entry
export type AbifData = {
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
export function concatArrays(as: Uint8Array[]) : Uint8Array {
  const size = as.reduce( (b, a) => b + a.length, 0)
  const combined = new Uint8Array(size);
  let offset = 0;
  as.forEach( a => {
    combined.set(a, offset);
    offset += a.length;
  } )
  return combined;
}

export function dataHeaderDir(numEntries: number) : AbifData{
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


export function dataNull(name: string, tagNum: number) : AbifData{
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

export function dataByte(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 1,
    elementSize: 1,
    elementCount: vs.length,
    renderData: () => vs.map(io.mkUint8)
  }
}

export function dataChar(name: string, tagNum: number, s: string) : AbifData{
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

export function dataWord(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 3,
    elementSize: 2,
    elementCount: vs.length,
    renderData: () => vs.map(v => io.mkUint16(v))
  }
}

export function dataShort(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 4,
    elementSize: 2,
    elementCount: vs.length,
    renderData: () => vs.map(v => io.mkInt16(v))
  }
}

export function dataPString(name: string, tagNum: number, s: string) : AbifData{
  const utf = new TextEncoder();
  const u = utf.encode(s);

  if(u.length > 255){
    throw `String too large for a pString, max is 255, got ${u.length}: ${u}`
  }

  return {
    dataOffset: 0,
    name: name,
    tagNumber: tagNum,
    elementType: 18,
    elementSize: 1,
    elementCount: s.length + 1,
    renderData: () => [io.mkUint8(u.length), u]
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
export async function writeAbif(abifPath: string, ds: AbifData[]) : Promise<void> {
  const f = await fsp.open(abifPath, 'w')

  // ------------------------------------------------------------------------------
  // - Header
  // ------------------------------------------------------------------------------
  await f.write("ABIF")
  await f.write(io.mkUint16(101)) // Version 1.1

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
  //offset 26 = offset in header where directory_entry.dataOffset is
  await f.write(io.mkInt32(dirStartOffset), null, null, 26)
  await f.close()
}


export async function writeDirEntry(f: fsp.FileHandle, d: AbifData ) : Promise<void> {
  await f.write(io.mkStrOfLen(d.name, 4))
  await f.write(io.mkInt32(d.tagNumber))
  await f.write(io.mkInt16(d.elementType))
  await f.write(io.mkInt16(d.elementSize))
  await f.write(io.mkInt32(d.elementCount))
  await f.write(io.mkInt32(d.elementSize * d.elementCount))

  if( d.dataOffset instanceof Uint8Array ){
    await f.write(d.dataOffset)
  } else {
    await f.write(io.mkInt32(d.dataOffset))
  }

  await f.write(io.mkInt32(0)) //reserved datahandle
}
// ###############################################################################################################################
