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


export function genBaseOrder(): aw.AbifData {
  return aw.dataChar("FWO_", 1, "GATC")
}

export function genLane(laneNum: number): aw.AbifData {
  return aw.dataShort("LANE", 1, [laneNum])
}

export function genMobilityFileName(tag: number, fileName: string): aw.AbifData {
  return aw.dataPString("PDMF", tag, fileName)
}

export function genComment(comment: string): aw.AbifData {
  return aw.dataPString("CMNT", 1, comment)
}

export function genSampleName(name: string): aw.AbifData {
  return aw.dataPString("SMPL", 1, name)
}

export function genDyeStrength(w: number, x: number, y: number, z: number): aw.AbifData {
  return aw.dataShort("S/N%", 1, [w, x, y, z])
}

export type TraceData ={
  data09G: number[]
  data10A: number[]
  data11T: number[]
  data12C: number[]
  valsPerBase: number
  fasta: string
}

export function generateTraceData( weightedFasta: [number, string][],
                                   // Values for a base that was present. This defines the shape of the chromatogram curve, and defines the number of values per base
                                   curve = [0, 0, 128, 512, 1024, 1024, 512, 128, 0, 0]
                                 ): TraceData{

  // Get [ [weight, expanded nucs] ]
  const ws:[number, string[]][] = weightedFasta.map( ([w, ns]) => {
    const nucs = [...ns.toUpperCase()].map(unIupac);
    return [w, nucs]
  });


  const longestRead = Math.max(...ws.map(([, ns]) => ns.length))

  // For a position get the total weight if the position has the nucleotide we are looking for. Limit to 0..1
  const getWeightedTrace = (ix:number, nuc:string):number[] => {
    // Find all weights for the given nucleotide at this position
    const weights = ws.map( ([w, ns]) => (ns[ix] || "").includes(nuc) ? w : 0 );
    // Total weight 0..1
    const weight = Math.max( 0, Math.min(1, weights.reduce((a,b) => a + b, 0) ) );
    // Weighted curve
    return curve.map( v => v * weight );
  }

  // Total weight across all reads
  const getWeightedTraces = (nuc:string):number[][] => {
    const ts = [];
    for( let i = 0; i < longestRead; ++i ){
      ts.push(getWeightedTrace(i, nuc))
    }
    return ts;
  }

  const fasta1:string[][] = [];
  for( let i = 0; i < longestRead; ++i ){
    //all nucleotides at a position
    fasta1.push(ws.map( ([,ns]) => ns[i] || "" ));
  }
  const fasta2 = fasta1.map(s => iupac(s.join("")));

  const td: TraceData = {
    data09G: getWeightedTraces("G").flat(),
    data10A: getWeightedTraces("A").flat(),
    data11T: getWeightedTraces("T").flat(),
    data12C: getWeightedTraces("C").flat(),
    valsPerBase: curve.length,
    fasta: fasta2.join("")
  }

  return td;
}


// Convert a IUPAC ambiguity code to the set of nucleotides it represents
export function unIupac(s: string): string{
  switch(s.slice(0, 1)){
    case 'T': return "T"
    case 'C': return "C"
    case 'A': return "A"
    case 'G': return "G"

    case 'U': return "T"
    case 'M': return "AC"
    case 'R': return "AG"
    case 'W': return "AT"
    case 'S': return "CG"
    case 'Y': return "CT"
    case 'K': return "GT"
    case 'V': return "ACG"
    case 'H': return "ACT"
    case 'D': return "AGT"
    case 'B': return "CGT"

    case 'N': return "GATC"
    case 'X': return "GATC"

    default: return ""
  }
}


export function iupac(s: string): string{
  const a = s.includes("A");
  const c = s.includes("C");
  const g = s.includes("G");
  const t = s.includes("T");

  switch( [a, c, g, t] ){
    case [true,  false, false, false]: return "A"
    case [false, true,  false, false]: return "C"
    case [false, false, true,  false]: return "G"
    case [false, false, false, true ]: return "T"
    case [true,  true,  false, false]: return "M"
    case [true,  false, true,  false]: return "R"
    case [true,  false, false, true ]: return "W"
    case [false, true,  true,  false]: return "S"
    case [false, true,  false, true ]: return "Y"
    case [false, false, true,  true ]: return "K"
    case [true,  true,  true,  false]: return "V"
    case [true,  true,  false, true ]: return "H"
    case [true,  false, true,  true ]: return "D"
    case [false, true,  true,  true ]: return "B"
    case [true,  true,  true,  true ]: return "N"
    default: return "_";
  }
}

