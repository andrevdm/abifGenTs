import * as ag from './abifGen'
import * as fa from '../wfasta'
import { promises as fsp } from 'fs';
import * as path from 'path';



// Run generation over a weighted FASTA
// Weighted fasta file should look like
//
//   > {0.1} name1
//   ACG
//   CGD
//   > name2
//   AAA
//   > {0.3} name1
//   AC
//   TT
//   > name4
//   C
//
// An AB1 is written per name across all input files, with weights summed up to 1
export async function runGen(src: string, dest: string): Promise<void>{
  const srcStat = await fsp.lstat(src);
  const srcFiles = [];

  // Source file(s)
  if( srcStat.isDirectory() ){
    //Get all fasta files in dir
    const ps = await fsp.readdir(src);
    srcFiles.push(...ps.filter(p => p.endsWith(".fasta")).map(p => path.join(src, p)));
  } else {
    srcFiles.push(src);
  }

  // Parsed files
  const ws = [];
  for( const p_ in srcFiles ){
    const p = srcFiles[p_];
    const t = await fsp.readFile(p, "utf8");
    ws.push(fa.parseWFasta(path.basename(p, ".fasta"), t));
  }

  // All reads
  const allReads1 = ws.map(w => w.reads).flat()
  const allReads = allReads1.reduce((a, r) => {
    // Group by name
    a.set(r.name, [...a.get(r.name) || [], r] );
    return a;
  },
  new Map<string, fa.WRead[]>);

  allReads.forEach( (rs, name) => {
    console.log(name);
    const reads: [number, string][] = rs.map(r => [r.weight, r.read])
    generateAbif(name, path.join(dest, name + ".ab1"), reads);
  })

  return;
}

export async function generateAbif(name: string, path: string, weightedFasta: [number, string][]){
  const raw = ag.generateAbif(name, weightedFasta);
  const f = await fsp.open(path, 'w')
  f.write(raw);
  f.close();
}
