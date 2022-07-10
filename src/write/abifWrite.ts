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
  rawData : Uint8Array;
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
    rawData: new Uint8Array(),
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
    rawData: new Uint8Array(),
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
    rawData: new Uint8Array(),
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
    rawData: new Uint8Array(),
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
    rawData: new Uint8Array(),
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
    rawData: new Uint8Array(),
    name: name,
    tagNumber: tagNum,
    elementType: 4,
    elementSize: 2,
    elementCount: vs.length,
    renderData: () => vs.map(v => io.mkInt16(v))
  }
}

export function dataLong(name: string, tagNum: number, vs: number[]) : AbifData{
  return {
    dataOffset: 0,
    rawData: new Uint8Array(),
    name: name,
    tagNumber: tagNum,
    elementType: 5,
    elementSize: 4,
    elementCount: vs.length,
    renderData: () => vs.map(v => io.mkInt32(v))
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
    rawData: new Uint8Array(),
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
export async function writeAbif(abifPath: string, ds: AbifData[]) : Promise<void> {
  const f = await fsp.open(abifPath, 'w')
  const raw = await buildAbif(ds);
  f.write(raw);
  f.close();
}

/* Build the ABIF file
   The structure will be
     - Header
         . "ABIF" magic number
         . version
         . dir entry that points to the directory entries
     - Data values []
     - Directory []   (point back to data values)
*/
export async function buildAbif(ds: AbifData[]) : Promise<Uint8Array> {
  // ------------------------------------------------------------------------------
  // - Header
  // ------------------------------------------------------------------------------
  const rawHeaderMagic = io.asciiToUin8Array("ABIF");
  const rawHeaderVersion = (io.mkUint16(101)) // Version 1.1

  // Dir entry that points to the start of the actual directory
  // Written with 0 as the offset, this will get patched later
  const dirPointer = dataHeaderDir(ds.length);
  //47 2 byte ints of empty space
  const rawHeaderReserved = new Uint8Array(47 * 2);
  // ------------------------------------------------------------------------------


  const rawDataValues = []
  const rawDirectory = []


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
      rawDataValues.push(raw);
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
    const dr = buildDirEntry( d )
    rawDirectory.push(dr)
  }
  // ------------------------------------------------------------------------------

  //fixup offset of directory
  //offset 26 = offset in header where directory_entry.dataOffset is
  dirPointer.dataOffset = dirStartOffset;
  const headerRootDir = buildDirEntry(dirPointer);
  const rawHeaderRootDir = headerRootDir;
  const combinedRawDataValues = concatArrays(rawDataValues)
  const combinedRawDirectory = concatArrays(rawDirectory)

  //Build the data array
  return concatArrays([rawHeaderMagic, rawHeaderVersion, rawHeaderRootDir, rawHeaderReserved, combinedRawDataValues, combinedRawDirectory])
}


export function buildDirEntry(d: AbifData ) : Uint8Array {
  const name = io.asciiToUin8Array( io.mkStrOfLen(d.name, 4) )
  const tag = io.mkInt32(d.tagNumber)
  const elemType = io.mkInt16(d.elementType)
  const elemSize = io.mkInt16(d.elementSize)
  const count = io.mkInt32(d.elementCount)
  const dataSize = io.mkInt32(d.elementSize * d.elementCount)
  const offset = d.dataOffset instanceof Uint8Array ? d.dataOffset : io.mkInt32(d.dataOffset)
  const reserved = io.mkInt32(0) //reserved datahandle

  return concatArrays([name, tag, elemType, elemSize, count, dataSize, offset, reserved])
}
// ###############################################################################################################################
