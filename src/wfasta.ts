export type WFasta = {
  name: string,
  reads: WRead[],
}

export interface WRead {
  name: string,
  weight: number,
  read: string,
}

interface WRead_ extends WRead {
  reverse: boolean;
}

type Stage = 'header' | 'read';
type State = [Stage, number, WRead_, WRead_[]]

export function parseWFasta(name: string, raw: string): WFasta{
  const lines = raw.split(/\n|\r/);

  const doHeader = (line: string, ix: number, current: WRead_): void => {
    const m = line.match(/>\s*(R?)\s*(\{(\d+(\.\d+)?)\})?\s*(.+)/);
    if( !m ){
      throw `Expecting header starting with a '>' on line ${ix} got: ${line}`;
    }

    const reverse = m[1] ? true : false;
    const mWeight = parseFloat(m[3] || "1");
    const mName = m[5] || "";

    if( Number.isNaN(mWeight) ){
      throw `Invalid weight. Expecting a float, got '${m[3]}'`;
    }

    current.name = mName.trim();
    current.weight = mWeight;
    current.reverse = reverse;
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

  //reverse if required
  r[3].forEach(r => {
    if(r.reverse){
      r.read = complementRead(r.read);
    }
  });

  const res = {
    name: name,
    reads: r[3]
  }

  return res;
}


function emptyRead() : WRead_{
  return {name: "", weight: 0, read: "", reverse: false};
}

export function complementRead(r: string): string{
  return [...r].map(s => {
    switch(s){
      case "A": return "T";
      case "C": return "G";
      case "G": return "C";
      case "T": return "A";
      default: return s;
    }
  }).join("");
}

