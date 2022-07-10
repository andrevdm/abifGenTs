import * as ag from './write/abifGen'

async function main(){
  ag.generateAbif("a", "./a.abif", [[1, "ACGTACGTACGTACGT"]])
}

main()
