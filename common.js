'use strict';

const fs = require('fs');
const path = require('path');

const constants = Object.freeze({
  maximumContentLength: 2217,
  maximumNumberOfBoards: 10_000_000,
  protocolVersion: '83',
  contentType: 'text/html;charset=utf-8',
  keyMatchRegex: /83e(0[1-9]|1[0-2])(\d\d)$/,
  unmodifiedSinceTimeFudgeMs: 6000,
  boardTTLDays: 22,
  getKeySecurityPolicies: {
    none: ['default-src', 'script-src', 'script-src-attr', 'script-src-elem',
      'child-src', 'frame-src', 'prefetch-src', ' object-src'],
    self: ['font-src'],
    'unsafe-inline': ['style-src'],
    'data:': ['img-src']
  },
  headerNames: {
    difficulty: 'spring-difficulty',
    signature: 'spring-signature',
    version: 'spring-version'
  },
  rootTemplateName: 'root.tmpl.html',
  defaultContentPath: '.content',
  defaultFQDN: 'example.com',
  strictVerification: true,
  maxKey64: (2 ** 64 - 1),
  ttlCheckFreqMinutes: 11,
  keypairFilenamePrefix: 'spring-83-keypair'
});

function keyPairFilename (publicKey, root = __dirname) {
  if (typeof publicKey !== 'string') {
    return keyPairFilename(Buffer.from(publicKey).toString('hex'), root);
  }

  const sDate = new Date();
  return path.join(root, [
    constants.keypairFilenamePrefix,
    sDate.toISOString().replace(/T.*$/, ''),
    publicKey.slice(0, 12)
  ].join('-') + '.txt');
}

async function findKeypairFile (publicKey, root) {
  if (typeof publicKey !== 'string') {
    return findKeypairFile(Buffer.from(publicKey).toString('hex'), root);
  }
  const pkPrefix = publicKey.slice(0, 12);
  return path.join(root, await (await fs.promises.readdir(root)).find((p) => {
    const parsed = path.parse(p);
    return parsed.name.indexOf(constants.keypairFilenamePrefix) === 0 && parsed.name.indexOf(pkPrefix) !== -1;
  }));
}

// 'strict' only allows keys that are usable *now* to match
function pubKeyHexIsValid (pubKeyHex, strict = false) {
  const match = pubKeyHex.match(constants.keyMatchRegex);

  if (match && match.length === 3) {
    const monthDigits = Number.parseInt(match[1]);
    const lastTwoDigitsNum = Number.parseInt(match[2]);

    if (Number.isNaN(monthDigits) || Number.isNaN(lastTwoDigitsNum)) {
      return false;
    }

    const curYearTwoDigit = (new Date().getYear() - 100);

    if (!(lastTwoDigitsNum > curYearTwoDigit - 2 && lastTwoDigitsNum <= curYearTwoDigit + 1)) {
      return false;
    }

    if (strict && lastTwoDigitsNum !== curYearTwoDigit + 1) {
      return false;
    }

    return true;
  }

  return false;
}

function getCurrentDifficultyFactor (knownKeys) {
  return (Object.keys(knownKeys).length / constants.maximumNumberOfBoards) ** 4;
}

async function readKeypairFile (filePath) {
  const fStr = (await fs.promises.readFile(filePath)).toString('utf8');
  return {
    private: fStr.substring(0, 64),
    public: fStr.substring(64, 128)
  };
}

async function findKnownKeys (contentDir, expectMatchingKeyPairs = false) {
  return (await Promise.all((await fs.promises.readdir(contentDir)).filter((p) => {
    const parsed = path.parse(p);
    return parsed.name.match(constants.keyMatchRegex) && parsed.ext === '.html';
  })
    .map(path.parse)
    .filter(({ name }) => pubKeyHexIsValid(name, constants.strictVerification))
    .map(async (pObj) => ([
      pObj.name,
      (await fs.promises.readFile(path.join(contentDir, pObj.name + pObj.ext))).toString('utf8'),
      expectMatchingKeyPairs
        ? await readKeypairFile(await findKeypairFile(pObj.name, contentDir))
        : JSON.parse(await fs.promises.readFile(path.join(contentDir, pObj.name + '.json')))
    ]))))
    .reduce((a, [key, body, metadata]) => ({ [key]: { body, metadata }, ...a }), {});
}

function keyIsUnderDifficultyThreshold (pubKey, knownKeys) {
  if (typeof pubKey === 'string') {
    return keyIsUnderDifficultyThreshold(Buffer.from(pubKey, 'hex'), knownKeys);
  }

  return pubKey.readBigInt64BE() < BigInt(constants.maxKey64 * (1.0 - getCurrentDifficultyFactor(knownKeys)));
}

module.exports = {
  constants,
  pubKeyIsValid: (pubKeyData, strict = false) => pubKeyHexIsValid(Buffer.from(pubKeyData).toString('hex'), strict),
  pubKeyHexIsValid,
  getCurrentDifficultyFactor,
  keyIsUnderDifficultyThreshold,
  findKnownKeys,
  keyPairFilename,
  readKeypairFile
};
