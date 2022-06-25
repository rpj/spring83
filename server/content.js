'use strict';

const fs = require('fs');
const path = require('path');
const {
  constants,
  boardExistsLocally
} = require('../common');

function applyGenericGETReplyHeaders (reply, isRoot = false) {
  reply.type(constants.contentType);
  reply.header(constants.headerNames.version, constants.protocolVersion);

  if (!isRoot) {
    reply.header('Content-Security-Policy', Object.entries(constants.getKeySecurityPolicies)
      .reduce((a, [policyValue, directivesList]) => {
        let emitValue = policyValue;
        if (policyValue.indexOf(':') === -1) {
          emitValue = `'${policyValue}'`;
        }
        return (a += directivesList.map((directive) => `${directive} ${emitValue};`).join(' ') + ' ');
      }, ''));
  }
}

async function ttlKiller (knownKeys, contentDir, app) {
  const expiry = new Date(Date.now() - constants.boardTTLDays * 24 * 60 * 60 * 1000);
  app.log.info(`ttlKiller awake, expiry=${expiry}`);
  const nonExemptEntries = Object.entries(knownKeys)
    .filter(([k]) => !constants.ttlExceptions.includes(k));
  for (const [key, { metadata: { ingest } }] of nonExemptEntries) {
    const ttlCheck = Date.parse(ingest);
    if (ttlCheck < expiry) {
      app.log.warn(`TTL expired for ${key} ${ingest}`);
      const pPrefix = path.join(contentDir, key);
      await fs.promises.rm(pPrefix + '.html');
      await fs.promises.rm(pPrefix + '.json');
      delete knownKeys[key];
    } else {
      const daysTtl = Number((ttlCheck - expiry) / (1000 * 60 * 60 * 24)).toFixed(0);
      app.log.info(`${key} (${ingest}) has ${daysTtl} days TTL`);
      knownKeys[key].metadata.daysTtl = daysTtl;
    }
  }

  setTimeout(ttlKiller.bind(null, knownKeys, contentDir, app), constants.ttlCheckFreqMinutes * 60 * 1000);
}

let pubBoards = [];
async function refreshPubBoards (contentDir) {
  setTimeout(refreshPubBoards.bind(null, contentDir), constants.pubBoardRefreshFreqMinutes * 60 * 1000);
  try {
    pubBoards = await Promise.all(JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', constants.pubBoardsJsonFileName)))
      .map(async (key) => [key, await boardExistsLocally(contentDir, key)]));
  } catch {}
}

let clientFilesCache;
async function loadClientFiles () {
  if (!clientFilesCache) {
    clientFilesCache = Object.fromEntries(await Promise.all(
      Object.entries(constants.clientFiles).map(async ([namePfx, fileName]) =>
        ([namePfx, (await fs.promises.readFile(path.join(__dirname, '..', 'client', fileName))).toString('utf8')]))));
  }

  return clientFilesCache;
}

module.exports = {
  applyGenericGETReplyHeaders,
  ttlKiller,
  refreshPubBoards,
  loadClientFiles,
  getPublicBoards: () => [...pubBoards]
};
