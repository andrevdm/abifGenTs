import ya from 'yargs/yargs';

import * as ag from './write/abifGen'

async function main(){
  const argv = ya(process.argv.slice(2))
    .command("gen", "Generate ABIF(s) from a optionally weighted FASTA", {
      source: { type: 'string', alias: 's', demandOption: true, describe: ".fasta file or directory" },
      dest: { type: 'string', alias: 'd', demandOption: true, describe: "destination directory" },
    })

    .command("cmd2", "desc", {
      a: { type: 'boolean', default: false },
    })
    .argv;

  const args = await argv;

  switch(args["_"][0]){
    case "gen": return ag.runGen( args.source as string, args.dest as string );
    default: throw `Uknown command ${args["_"][0]}`
  }
}



main()
