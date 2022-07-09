import * as ag from './abifGen'

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});


test('trivial gen trace', () => {
  const x = ag.generateTraceData([ [1, "A"] ], [100])
  console.log(x);
});
