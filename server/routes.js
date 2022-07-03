'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const mustache = require('mustache');
const federate = require('./federate');
const { version } = require('../package.json');
const {
  constants,
  minify,
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
let qrcodeRequestHandler = require('./qrcode');

async function attach (app, knownKeys, fqdn, contentDir, contactAddr, scheme) {
  const {
    rootTmpl, notFoundTmpl, testKeyTmpl, embedJsContent,
    embedJSONExample, qrcodeTmpl, getkeyTmpl
  } = await loadClientFiles();
  const shortener = await require('./shortener').init(contentDir, app);
  qrcodeRequestHandler = qrcodeRequestHandler.bind(null, fqdn, qrcodeTmpl);

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

  const postPutHandlerValidator = async function (validCallback, req, reply) {
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
      const metaCheck = documentHasRequiredMeta(req, app); // check in initialPutChecks prior, so will have a value

      if (headers['if-unmodified-since'] && metaCheck <= Date.parse(headers['if-unmodified-since'])) {
        app.log.warn('Past if-unmodified-since');
        reply.code(409);
        return;
      }

      if (!keyIsUnderDifficultyThreshold(req.params.key, knownKeys)) {
        app.log.warn('Difficulty threshold');
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

      // the content-length restriction is the *only* one not enforced for 'POST',
      // for obvious reasons (it's job is to reduce the board's size!)
      if (!(validatorResult === 413 && req.method === 'POST')) {
        reply.code(400);
        if (typeof validatorResult === 'number') {
          reply.code(validatorResult);
        }

        app.log.warn(`Bad header '${invalidName}: ${invalidValue}'`);
        return;
      }
    }

    return validCallback(req, reply, pathPrefix, boardPostCode);
  };

  if (constants.shortener.enabled) {
    app.post('/:key', postPutHandlerValidator.bind(null, async (req, reply) => {
      let { body } = req;
      const parsed = cheerio.load(body);
      const disabled = req.headers[constants.headerNames.shortenerDisable]?.split(/,\s+/) || [];

      if (!disabled.includes('shorten-links')) {
        const ignoreBoardLinks = disabled.includes('shorten-board-links');
        const promises = [];
        parsed('a').each((idx, ele) => {
          if (ele.attribs.href?.startsWith('http')) {
            promises.push(async () => {
              const { host, pathname } = new URL(ele.attribs.href);
              if (constants.shortener.knownS83Hosts.includes(host) && pathname.indexOf('/') === 0) {
                const pnSlice = pathname.slice(1);
                // don't shorten board links, if option was specified
                if (ignoreBoardLinks && pnSlice.length === 64 && pnSlice.match(constants.keyMatchRegex)) {
                  return [null, {}];
                }

                // don't try to shorten shortlinks!
                if (host === fqdn) {
                  const resolved = await shortener.resolve(pathname.slice(1));
                  if (resolved !== null) {
                    return [null, {}];
                  }
                }
              }

              return [ele, (await shortener.shorten(ele.attribs.href))];
            });
          }
        });

        (await Promise.all(promises.map(x => x()))).forEach(([ele, { shortId, isNew }]) => {
          if (ele === null) {
            return; // was a shortlink, not going to reshorten
          }

          const shortUrl = `${scheme}://${fqdn}/${shortId}`;

          if (shortUrl.length > ele.attribs.href.length) {
            if (isNew) {
              app.log.info(`Shortened (${shortUrl}) is longer than original (${ele.attribs.href})! skipping`);
            }
            return;
          }

          if (isNew) {
            app.log.info(`New shortening: ${ele.attribs.href} (${ele.attribs.href.length}) -> ${shortUrl} (${shortUrl.length})`);
          }

          ele.attribs.href = shortUrl;
        });

        body = parsed.root().html();
      }

      if (!disabled.includes('minify')) {
        body = await minify(Buffer.from(body, 'utf8'));
      }

      return body;
    }));
  }

  app.put('/:key', postPutHandlerValidator.bind(null, async (req, reply, pathPrefix, boardPostCode) => {
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

    const didFederate = await federate.add(req);
    if (!didFederate && req.headers.via) {
      boardPostCode = 203;
    }

    if (didFederate) {
      reply.header(constants.headerNames.federatedTo, constants.federate.knownS83Hosts
        .filter((h) => h !== fqdn).join(','));
    }

    reply.code(boardPostCode);
    app.log.info(`${{
      200: 'Updated',
      201: 'New',
      203: 'Federated'
    }[boardPostCode]} board posted!`);
  }));

  const getBoard = async function (req, reply) {
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

    if (req.headers[constants.headerNames.version] || req.query.embed !== undefined) {
      return body;
    }

    // REALLY need a better way to handle this...
    reply.header('Content-Security-Policy', reply.getHeader('Content-Security-Policy').replace('data:', "'self'"));
    return mustache.render(getkeyTmpl, { ...renderMap, body });
  };

  app.get('/:key.png', async (req, reply) => {
    req.headers['content-type'] = 'image/png';
    return qrcodeRequestHandler(req, reply);
  });

  app.get('/qrcode/:key', async (req, reply) => {
    return qrcodeRequestHandler(req, reply);
  });

  app.get('/:key', async (req, reply) => {
    if (req.params.key?.length === 64) {
      if (req.headers['content-type'] === 'image/png') {
        return qrcodeRequestHandler(req, reply);
      }
      return getBoard(req, reply);
    } else if (constants.shortener.enabled) {
      const resolved = await shortener.resolve(req.params.key);
      if (resolved) {
        reply.redirect(resolved);
        return;
      }
    }

    reply.code(404);
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
      pubBoards: getPublicBoards().filter(([, exists]) => exists === true).map(([key]) => key).sort().map(keyMapper),
      federated: constants.federate.knownS83Hosts.filter((x) => x !== fqdn).map((x) => ({ host: x })),
      version
    };

    if (process.env.NODE_ENV !== 'prod') {
      renderMap.devBanner = '<p>' + constants.devBanner.replaceAll('. ', '.</p><p>') + '</p>';
    }

    return mustache.render(rootTmpl, renderMap);
  });
}

module.exports = { attach };
