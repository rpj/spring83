const fs = require('fs');
const path = require('path');
const test = require('tape');
const common = require('../common');

const static23Keys = [
  'a5e8086dd47d0380ed16c641070636a3f06fc89b6f6dde45e756f70fc83e0723',
  'f539c49d389b1e141c97450cdabc83d41615303106c07f63c8975b5dc83e0623',
  '47e0f417f42634b42917124c8c9709714ac28c632830c2f96f8e52beb83e0623',
  'e310afd5a0529279947e4bb79ae686543102a8e864867dd4b8e90101e83e0123',
  '45deb6f6d50b7b2e3a0aba5aa199823a3c0e64e5f604196e429bc41d683e0623',
  'a4813793a806d066c18f8a2d07a403393fecda667e5ccaa6fd76cfd5683e1023',
  'aba9bf0b5a98480cbfc9db2d536fb0d584e8144be5477afd762a13cc383e1123',
  '3cba5aede1312bda77c2a329c61aadb893dae1c160bd4c5b05d3bad3783e1023',
  'db8a22f49c7f98690106cc2aaac15201608db185b4ada99b5bf4f222883e1223'
];

const xNumKnownKeysMemo = new Map();
const xNumKnownKeys = (x) => {
  if (xNumKnownKeysMemo.has(x)) {
    return xNumKnownKeysMemo.get(x);
  }

  const n = Object.fromEntries(Array.from({ length: x }).map((v, i) => [i, v]));
  xNumKnownKeysMemo.set(x, n);
  return n;
};

test('pubKeyHexIsValid', function (t) {
  t.plan(static23Keys.length);
  static23Keys.forEach((boardKey) =>
    t.true(common.pubKeyHexIsValid(boardKey, true, new Date(Date.parse('2022-06-19'))), boardKey));
});

test('pubKeyHexIsValid against public-boards.json, strict', function (t) {
  const publicBoards = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public-boards.json')));
  t.plan(publicBoards.length);
  publicBoards.forEach((boardKey) => t.true(common.pubKeyHexIsValid(boardKey, true), boardKey));
});

test('getCurrentDifficultyFactor', (t) => {
  t.plan(4);
  t.equal(common.constants.maximumNumberOfBoards, 1e7);
  t.equal(common.getCurrentDifficultyFactor({}), 0);
  t.equal(common.getCurrentDifficultyFactor(xNumKnownKeys(1e5)), 1e-8);
  t.equal(common.getCurrentDifficultyFactor(xNumKnownKeys(common.constants.maximumNumberOfBoards)), 1);
});

test('keyIsUnderDifficultyThreshold', (t) => {
  const checks = [
    ['ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 0, false],
    ['7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', common.constants.maximumNumberOfBoards, false],
    ...static23Keys.map((k) => [k, 0, true]),
    ...static23Keys.map((k) => [k, 1e4, true])
  ];

  t.plan(checks.length);
  checks.forEach(([vec, i, exp]) =>
    t.equal(common.keyIsUnderDifficultyThreshold(vec, xNumKnownKeys(i)), exp, `${vec} :: ${i} :: ${exp}`));
});

test('findKeypairFile & readKeypairFile', async (t) => {
  const testPath = await common.findKeypairFile(common.constants.testPublicKey, __dirname);
  const pp = path.parse(testPath);
  t.plan(4);
  t.equal(pp.base, 'spring-83-keypair-2022-06-19-ab589f4dde9f.txt');
  t.equal(pp.dir.split(path.sep).at(-1), 'test');
  const kp = await common.readKeypairFile(testPath);
  t.equal(kp.public, common.constants.testPublicKey);
  t.equal(kp.private, '3371f8b011f51632fea33ed0a3688c26a45498205c6097c352bd4d079d224419');
});
