import ya from 'yargs/yargs';
//import yh from 'yargs/helpers';

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


  console.log(argv)
  //ag.generateAbif("a", "./a.abif", [[1, "ACGTACGTACGTACGT"]])
}

main()
