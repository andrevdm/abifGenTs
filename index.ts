import * as aw from './abifWrite'

async function main(){
  const ds = [
    aw.dataByte("dat1", 1, [1,2,3,4]),
    aw.dataChar("dat2", 1, "ABc"),
    aw.dataChar("dat3", 1, "ABcdef!!"),
  ]

  await aw.writeAbif("a.abif", ds)
}

main()
