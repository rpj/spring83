'use strict';

const cheerio = require('cheerio');
const ed = require('@noble/ed25519');
const {
  constants,
  pubKeyHexIsValid
} = require('../common');

const expectPutHeaders = Object.freeze({
  'content-type': constants.contentType,
  [constants.headerNames.version]: constants.protocolVersion,
  [constants.headerNames.signature]: async (v, context) => {
    const sigHex = v;

    if (!sigHex) {
      return 401;
    }

    if (!(await ed.verify(sigHex, Buffer.from(context.body), context.key))) {
      return 401;
    }
  },
  'content-length': (v) => {
    const vp = Number.parseInt(v);
    if (!Number.isNaN(vp) && vp > constants.maximumContentLength) {
      return 413;
    }
  }
});

const initialPutChecks = (app) => (Object.freeze({
  'missing body or key': (req) => !req.body || !req.params.key,
  'invalid pub key': (req) => !pubKeyHexIsValid(req.params.key, constants.strictVerification),
  'missing header(s)': (req) => !allExpectedHeadersExist(expectPutHeaders, req, app),
  'missing required <meta> tag attribute(s)': (req) => !documentHasRequiredMeta(req)
}));

function documentHasRequiredMeta (req) {
  return Date.parse(cheerio.load(req.body)('time')?.attr()?.datetime);
}

async function validateHeader (context, [header, val]) {
  const validator = expectPutHeaders?.[header];
  return [header, val, await {
    string: async () => !(val === validator),
    function: async () => validator(val, context)
  }?.[typeof validator]?.()];
}

function allExpectedHeadersExist (expectedMap, req, app) {
  const rv = Object.keys(expectedMap).map(k => req.headers[k]);
  if (rv.some(x => !x)) {
    app.log.warn(`allExpectedHeadersExist failure(s): ${rv.join(', ')}`);
  }
  return !rv.some(x => !x);
}

module.exports = {
  documentHasRequiredMeta,
  validateHeader,
  allExpectedHeadersExist,
  initialPutChecks
};
