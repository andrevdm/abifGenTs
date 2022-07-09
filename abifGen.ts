import * as aw from './abifWrite'

export async function generateAbif(name: string, path: string, weightedFasta: [number, string][]){
  const ds = [
    aw.dataByte("dat1", 1, [1,2,3,4]),
    aw.dataChar("dat2", 1, "ABc"),
    aw.dataChar("dat3", 1, "ABcdef!!"),

    genBaseOrder(),
    genLane(1),
    genMobilityFileName(1, "KB_3500_POP7_BDTv3.mob"),
    genMobilityFileName(2, "KB_3500_POP7_BDTv3.mob"),
    genComment("TS ABIF generator"),
    genSampleName(name),
    genDyeStrength(53, 75, 79, 48),
  ]

  await aw.writeAbif(path, ds)
}


function genBaseOrder(): aw.AbifData {
  return aw.dataChar("FWO_", 1, "GATC")
}

function genLane(laneNum: number): aw.AbifData {
  return aw.dataShort("LANE", 1, [laneNum])
}

function genMobilityFileName(tag: number, fileName: string): aw.AbifData {
  return aw.dataPString("PDMF", tag, fileName)
}

function genComment(comment: string): aw.AbifData {
  return aw.dataPString("CMNT", 1, comment)
}

function genSampleName(name: string): aw.AbifData {
  return aw.dataPString("SMPL", 1, name)
}

function genDyeStrength(w: number, x: number, y: number, z: number): aw.AbifData {
  return aw.dataShort("S/N%", 1, [w, x, y, z])
}

