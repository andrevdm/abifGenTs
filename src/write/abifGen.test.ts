import * as ag from './abifGen'

test('gen trace: 1 pos, 1 read', () => {
  const td = ag.generateTraceData([ [1, "A"] ], [100])
  expect(td.valsPerBase).toEqual(1);
  expect(td.data09G).toEqual([  0]);
  expect(td.data10A).toEqual([100]);
  expect(td.data11T).toEqual([  0]);
  expect(td.data12C).toEqual([  0]);
  expect(td.fasta).toEqual("A");
});


test('gen trace: 1 pos, 3 read', () => {
  const td = ag.generateTraceData([ [0.2, "A"], [0.5, "A"], [0.8, "G"] ], [100])
  expect(td.valsPerBase).toEqual(1);
  expect(td.data09G).toEqual([80]);
  expect(td.data10A).toEqual([70]);
  expect(td.data11T).toEqual([ 0]);
  expect(td.data12C).toEqual([ 0]);
  expect(td.fasta).toEqual("R");
});


test('gen trace: 2 pos, 3 read, unequal len', () => {
  const td = ag.generateTraceData([ [0.2, "A"], [0.5, "AT"], [0.8, "G"] ], [100])
  expect(td.valsPerBase).toEqual(1);
  expect(td.data09G).toEqual([80,  0]);
  expect(td.data10A).toEqual([70,  0]);
  expect(td.data11T).toEqual([ 0, 50]);
  expect(td.data12C).toEqual([ 0,  0]);
  expect(td.fasta).toEqual("RT");
});


test('gen trace: 2 pos, 3 read, unequal len, longer curve', () => {
  const td = ag.generateTraceData([ [0.2, "A"], [0.5, "AT"], [0.8, "G"] ], [100, 50])
  expect(td.valsPerBase).toEqual(2);
  expect(td.data09G).toEqual([80, 40,   0,  0]);
  expect(td.data10A).toEqual([70, 35,   0,  0]);
  expect(td.data11T).toEqual([ 0,  0,  50,  25]);
  expect(td.data12C).toEqual([ 0,  0,   0,  0]);
  expect(td.fasta).toEqual("RT");
});
