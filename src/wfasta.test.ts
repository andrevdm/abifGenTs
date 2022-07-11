import * as wf from './wfasta';

test('wfasta: empty', () => {
  const r = wf.parseWFasta("nn", "");
  expect(r).toMatchObject({name: "nn", reads: []});
});

test('wfasta: blanks', () => {
  const r = wf.parseWFasta("nn", "\n\r\n\n\r\r\n\r;");
  expect(r).toMatchObject({name: "nn", reads: []});
});

test('wfasta: comments', () => {
  const r = wf.parseWFasta("nn", ";\n;\r;");
  expect(r).toMatchObject({name: "nn", reads: []});
});

test('wfasta: single unweighted, only header', () => {
  const r = wf.parseWFasta("nn", "\n>bla");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 1,
      read: ""
    }
  ]});
});

test('wfasta: single weighted, only header', () => {
  const r = wf.parseWFasta("nn", "\n>{0.5}bla");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.5,
      read: ""
    }
  ]});
});

test('wfasta: single weighted, only header with whitespace', () => {
  const r = wf.parseWFasta("nn", "\n> \t {0.5} bla ");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.5,
      read: ""
    }
  ]});
});

test('wfasta: single weighted, read', () => {
  const r = wf.parseWFasta("nn", "\n>{0.5}bla\nACGT");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.5,
      read: "ACGT"
    }
  ]});
});

test('wfasta: single weighted, read lines', () => {
  const r = wf.parseWFasta("nn", "\n>{0.9}bla\nAAAA \nCC\rGGG\nT");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.9,
      read: "AAAACCGGGT"
    }
  ]});
});

test('wfasta: multiple', () => {
  const r = wf.parseWFasta("nn", "\n>{0.9}bla\nAAAA\nGG\n>new\nTT\nC");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.9,
      read: "AAAAGG"
    },
    { name: "new",
      weight: 1,
      read: "TTC"
    },
  ]});
});

test('wfasta: multiple last empty', () => {
  const r = wf.parseWFasta("nn", "\n>{0.9}bla\nAAAA\nGG\n>new");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.9,
      read: "AAAAGG"
    },
    { name: "new",
      weight: 1,
      read: ""
    },
  ]});
});

test('wfasta: multiple, weights', () => {
  const r = wf.parseWFasta("nn", "\n>{0.9}bla\nAAAA\nGG\n> {0.6} new\nTT\nC\n>{0.4}xx");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.9,
      read: "AAAAGG"
    },
    { name: "new",
      weight: 0.6,
      read: "TTC"
    },
    { name: "xx",
      weight: 0.4,
      read: ""
    },
  ]});
});

test('wfasta: multiple, duplicate names', () => {
  const r = wf.parseWFasta("nn", "\n>{0.5}bla\nAAAA\nGG\n> {0.6} new\nTT\nC\n>{0.2}bla\nAA");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.5,
      read: "AAAAGG"
    },
    { name: "new",
      weight: 0.6,
      read: "TTC"
    },
    { name: "bla",
      weight: 0.2,
      read: "AA"
    },
  ]});
});

test('wfasta: multiple, duplicate names, reverse', () => {
  const r = wf.parseWFasta("nn", "\n>{0.5}bla\nAAAA\nGG\n>R{0.6} new\nTT\nC\n>{0.2}bla\nAA");
  expect(r).toMatchObject({name: "nn", reads: [
    { name: "bla",
      weight: 0.5,
      read: "AAAAGG"
    },
    { name: "new",
      weight: 0.6,
      read: "AAG"
    },
    { name: "bla",
      weight: 0.2,
      read: "AA"
    },
  ]});
});
