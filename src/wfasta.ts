export type WFasta = {
  name: string,
  reads: WRead[],
}

export type WRead = {
  name: string,
  weight: number,
  read: string,
}

type Stage = 'header' | 'read';
type State = [Stage, number, WRead, WRead[]]

export function parseWFasta(name: string, raw: string): WFasta{
  const lines = raw.split(/\n|\r/);

  const doHeader = (line: string, ix: number, current: WRead): void => {
    const m = line.match(/>\s*(\{(\d+(\.\d+)?)\})?\s*(.+)/);
    if( !m ){
      throw `Expecting header starting with a '>' on line ${ix} got: ${line}`;
    }

    const mWeight = parseFloat(m[2] || "1");
    const mName = m[4] || "";

    if( Number.isNaN(mWeight) ){
      throw `Invalid weight. Expecting a float, got '${m[2]}'`;
    }

    current.name = mName.trim();
    current.weight = mWeight;
  };

  const r = lines.reduce( ([stage, ix, current, hist]: State, line_: string) => {
      const line = line_.trimEnd();

      // always ignore blank lines
      if( line == ""){
        return [stage, ix + 1, current, hist] as State;
      }

      // treat ; as a comment. Not standard but handy for this
      if( line.trimStart().startsWith(";") ){
        return [stage, ix + 1, current, hist] as State;
      }

      if( stage == 'header' ){
        doHeader(line, ix, current);
        return ['read', ix + 1, current, hist] as State;

      } else {
        if( line.startsWith(">") ){
          hist.push(current);
          current = emptyRead();
          doHeader(line, ix, current);
          return ['read', ix + 1, current, hist] as State;
        } else {
          current.read += line;
          return ['read', ix + 1, current, hist] as State;
        }
      }

    },
    ['header', 0, emptyRead(), [] ] as State );

  if( r[2].name!= "" ){
    r[3].push(r[2]);
  }

  const res = {
    name: name,
    reads: r[3]
  }

  return res;
}


function emptyRead() : WRead{
  return {name: "", weight: 0, read: ""};
}
