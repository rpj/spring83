'use strict';

const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const {
  constants,
  pubKeyHexIsValid,
  getCurrentDifficultyFactor,
  keyIsUnderDifficultyThreshold
} = require('../common');
const {
  validateHeader,
  initialPutChecks,
  documentHasRequiredMeta
} = require('./validation');
const {
  loadClientFiles,
  getPublicBoards,
  applyGenericGETReplyHeaders
} = require('./content');

async function attach (app, knownKeys, fqdn, contentDir, contactAddr) {
  const { rootTmpl, notFoundTmpl, testKeyTmpl, embedJsContent, embedJSONExample } = await loadClientFiles();

  app.get(`/${constants.clientFiles.embedJsContent}`, (req, reply) => {
    reply.code(200);
    reply.type('text/javascript');
    return embedJsContent;
  });

  app.get(`/${constants.clientFiles.embedJSONExample.replace('.tmpl', '')}`, (req, reply) => {
    reply.code(200);
    reply.type(constants.contentType);
    return mustache.render(embedJSONExample, {
      fqdn,
      embeddedJsonExampleBoardKey: constants.embeddedJsonExampleBoardKey
    });
  });

  app.put('/:key', async (req, reply) => {
    if (req.params?.key === constants.testPublicKey) {
      reply.code(401);
      return;
    }

    if (getCurrentDifficultyFactor(knownKeys) >= 1.0) {
      app.log.warn('getCurrentDifficultyFactor');
      reply.code(403);
      return;
    }

    const putCheckRes = Object.entries(initialPutChecks(app))
      .find(([, checkFunc]) => checkFunc(req));

    if (putCheckRes) {
      app.log.warn(putCheckRes[0]);
      app.log.warn('putCheckRes');
      reply.code(400);
      return;
    }

    const pathPrefix = path.join(contentDir, req.params.key);
    let boardPostCode = 201;

    try {
      const { headers } = JSON.parse(await (await fs.promises.readFile(`${pathPrefix}.json`)).toString('utf8'));
      boardPostCode = 200;
      const metaCheck = documentHasRequiredMeta(req); // check in initialPutChecks prior, so will have a value

      if (headers['if-unmodified-since'] && metaCheck <= Date.parse(headers['if-unmodified-since'])) {
        app.log.warn('past if-unmodified-since');
        reply.code(409);
        return;
      }

      if (!keyIsUnderDifficultyThreshold(req.params.key, knownKeys)) {
        app.log.warn('difficulty threshold');
        reply.code(403);
        return;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    const validationContext = { body: req.body, key: req.params.key };
    const firstInvalid = (await Promise.all(Object.entries(req.headers)
      .map(validateHeader.bind(null, validationContext))))
      .find(([,, invalid]) => Boolean(invalid));

    if (firstInvalid) {
      const [invalidName, invalidValue, validatorResult] = firstInvalid;

      reply.code(400);
      if (typeof validatorResult === 'number') {
        reply.code(validatorResult);
      }

      app.log.warn(`bad header '${invalidName}: ${invalidValue}'`);
      return;
    }

    const writeOpts = { mode: 0o660 };
    const metadata = {
      headers: req.headers,
      ingest: new Date()
    };

    await fs.promises.writeFile(`${pathPrefix}.html`, req.body, writeOpts);
    await fs.promises.writeFile(`${pathPrefix}.json`, JSON.stringify(metadata), writeOpts);

    knownKeys[req.params.key] = {
      body: req.body,
      metadata
    };

    reply.code(boardPostCode);
    app.log.info(`${{
      200: 'Updated',
      201: 'New'
    }[boardPostCode]} board posted!`);
  });

  app.get('/:key', async (req, reply) => {
    const renderMap = {};
    const render = () => mustache.render(notFoundTmpl, renderMap);

    reply.code(404);
    applyGenericGETReplyHeaders(reply);

    if (req.params.key === constants.testPublicKey) {
      const umsDate = new Date();
      renderMap.datetime = umsDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      renderMap.rgb1 = { red: Math.floor(Math.random() * 255), green: Math.floor(Math.random() * 255), blue: Math.floor(Math.random() * 255) };
      renderMap.rgb2 = { red: Math.floor(Math.random() * 255), green: Math.floor(Math.random() * 255), blue: Math.floor(Math.random() * 255) };
      reply.code(200);
      return mustache.render(testKeyTmpl, renderMap);
    }

    if (!pubKeyHexIsValid(req.params.key, constants.strictVerification)) {
      app.log.warn('invalid key');
      return render();
    }

    renderMap.key = req.params.key;

    if (!knownKeys[req.params.key]) {
      app.log.warn('invalid content');
      return render();
    }

    const { body, metadata: { headers, ingest } } = knownKeys[req.params.key];
    if (!body || !headers[constants.headerNames.signature]) {
      app.log.warn('invalid content fields');
      return;
    }

    const sig = headers[constants.headerNames.signature];
    if (!sig) {
      app.log.warn('invalid sig');
      return;
    }

    reply.code(200);
    reply.header(constants.headerNames.signature, sig);
    reply.header('last-modified', new Date(ingest).toUTCString());
    return body;
  });

  app.get('/', async (req, reply) => {
    applyGenericGETReplyHeaders(reply, true);
    reply.header(constants.headerNames.difficulty, getCurrentDifficultyFactor(knownKeys));
    const keyMapper = (key) => ({
      key,
      ttl: knownKeys[key]?.metadata?.daysTtl,
      key_display: key.slice(0, 16)
    });
    const renderMap = {
      fqdn,
      contactAddr,
      boards: Object.keys(knownKeys).map(keyMapper),
      pubBoards: getPublicBoards().filter(([, exists]) => exists === true).map(([key]) => key).sort().map(keyMapper)
    };

    return mustache.render(rootTmpl, renderMap);
  });
}

module.exports = { attach };