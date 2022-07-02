'use strict';

const cheerio = require('cheerio');
const { constants, s83Request } = require('../common');

const federationQueue = [];
let runtime;

function canFederateRequest (req) {
  if (!runtime.knownKeys[req.params.key]) {
    return false;
  }

  if (req.headers?.via) {
    runtime.app.log.info(`Skipping federation, Via header: ${req.headers.via}`);
    return false;
  }

  const shareMeta = cheerio.load(req.body)('meta[name=spring:share]')?.attr('content');
  if (shareMeta === 'false' || shareMeta === '0' || shareMeta === 'no') {
    runtime.app.log.info(`Skipping federation, <meta> spring:share ${shareMeta}`);
    return false;
  }

  return true;
}

async function add (req) {
  if (!canFederateRequest(req)) {
    return false;
  }

  return federationQueue.push(req.params.key);
}

async function federateOne (key) {
  runtime.app.log.info(`Federating ${key}`);

  const { body, metadata: { headers }, ingest } = runtime.knownKeys[key];
  const unmodifiedSince = headers?.['if-unmodified-since'] || new Date(ingest).toUTCString();

  const allRes = await Promise.allSettled(constants.federate.knownS83Hosts
    .filter((host) => host !== runtime.fqdn)
    .map(async (host) => {
      const res = await s83Request('PUT', 'https://' + host, key, unmodifiedSince,
        headers[constants.headerNames.signature], {
          via: '1.1 ' + runtime.fqdn
        }, Buffer.from(body, 'utf8'));

      const trimRes = { status: res.status, host, message: res.message, stack: res.stack };
      if (!res.ok) {
        if (!constants.federate.ignorableStatus.includes(res.status)) {
          runtime.app.log.warn(`${host} federation error... requeue? ${res.status}`);
          return { ok: false, ...trimRes };
        }
      }

      return { ok: res.ok, ...trimRes };
    }));

  runtime.app.log.info(`federateOne(${key}) results:`);
  allRes.forEach((res) => runtime.app.log.info(res.ok ? `${res.host} OK` : res));
  return allRes;
}

function init (app, contentDir, knownKeys, fqdn, dontLoop = false) {
  async function loop () {
    if (federationQueue.length > 0) {
      await federateOne(federationQueue.shift());
    }

    setTimeout(loop, constants.federate.rateLimitMs);
  }

  runtime = {
    app,
    contentDir,
    knownKeys,
    fqdn
  };

  if (dontLoop) {
    return;
  }

  loop();
}

module.exports = {
  canFederateRequest,
  init,
  add
};
