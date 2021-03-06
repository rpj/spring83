'use strict';

const fs = require('fs');
const path = require('path');
const { fetch } = require('undici');
const { constants } = require('./constants');
const minifier = require('html-minifier-terser');

async function s83Request (method, host, pubKeyHex, unmodifiedSince, sigHex, extraHeaders, htmlFileBytes) {
  const reqObj = {
    method,
    headers: {
      'content-type': constants.contentType,
      [constants.headerNames.version]: constants.protocolVersion,
      'if-unmodified-since': unmodifiedSince,
      [constants.headerNames.signature]: sigHex,
      ...extraHeaders
    }
  };

  if (htmlFileBytes?.length > 0) {
    reqObj.body = htmlFileBytes;
  }

  try {
    return await fetch(`${host}/${pubKeyHex}`, reqObj);
  } catch (err) {
    return { ok: false, status: -1, message: err.message, stack: err.stack };
  }
}

async function minify (htmlFileBytes) {
  return Buffer.from(await minifier.minify(htmlFileBytes.toString('utf8'), constants.putnewMinifyOptions), 'utf8');
}

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
  return path.join(root, await (await fs.promises.readdir(path.resolve(root))).find((p) => {
    const parsed = path.parse(p);
    return parsed.name.indexOf(constants.keypairFilenamePrefix) === 0 && parsed.name.indexOf(pkPrefix) !== -1;
  }));
}

async function boardExistsLocally (contentDir, pubKey) {
  return (await Promise.all(['html', 'json'].map(async (ext) => {
    try {
      return Boolean(await fs.promises.stat(path.join(contentDir, `${pubKey}.${ext}`)));
    } catch {}
    return false;
  }))).every(x => x === true);
}

// 'strict' is no longer used but left in because i used STUPIDLY allowed a
// defaulted parameter in the middle of the f'ing set, and i'm too lazy to
// go hunt down all the call sites right now. THIS IS WHY YOU DON'T DO THAT!
function pubKeyHexIsValid (pubKeyHex, strict = false, injectDate) {
  const match = pubKeyHex.match(constants.keyMatchRegex);

  if (match && match.length === 3) {
    const monthDigits = Number.parseInt(match[1]);
    const yearDigits = Number.parseInt(match[2]);

    if (Number.isNaN(monthDigits) || Number.isNaN(yearDigits)) {
      return false;
    }

    const pastExpiryDate = new Date(`20${yearDigits - 2}-${monthDigits}-01`);
    const adjYearDigits = yearDigits + (monthDigits === 12 ? 1 : 0);
    const adjMonthDigits = (monthDigits === 12 ? 0 : monthDigits) + 1;
    const futExpiryDate = new Date(`20${adjYearDigits}-${String(adjMonthDigits).padStart(2, '0')}-01`);
    const now = injectDate || new Date();

    if (now < pastExpiryDate || now > futExpiryDate) {
      return false;
    }

    return true;
  }

  return false;
}

function getCurrentDifficultyFactor (knownKeys) {
  return (Object.keys(knownKeys).length / constants.maximumNumberOfBoards) ** constants.difficultyFactorExp;
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

  return pubKey.readBigUInt64BE() < BigInt((2 ** 64) * (1.0 - getCurrentDifficultyFactor(knownKeys))) - BigInt(1);
}

module.exports = {
  pubKeyIsValid: (pubKeyData, strict = false) => pubKeyHexIsValid(Buffer.from(pubKeyData).toString('hex'), strict),
  pubKeyHexIsValid,
  getCurrentDifficultyFactor,
  keyIsUnderDifficultyThreshold,
  findKnownKeys,
  keyPairFilename,
  readKeypairFile,
  boardExistsLocally,
  findKeypairFile,
  minify,
  s83Request
};
