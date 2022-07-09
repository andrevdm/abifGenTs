import * as ag from './abifGen'

async function main(){
  ag.generateAbif("a", "./a.abif", [[1, "ACGT"]])
}

main()
