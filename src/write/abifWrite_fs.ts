import { promises as fsp } from 'fs';
import * as aw from './abifWrite'

export async function writeAbif(abifPath: string, ds: aw.AbifData[]) : Promise<void> {
  const f = await fsp.open(abifPath, 'w')
  const raw = aw.buildAbif(ds);
  f.write(raw);
  f.close();
}

