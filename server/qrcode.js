const { constants } = require('../common');
const qrcode = require('qrcode');
const mustache = require('mustache');

module.exports = async (fqdn, qrcodeTmpl, req, reply) => {
  reply.code(404);

  if (req.params.key?.length === 64 && req.params.key.match(constants.keyMatchRegex)) {
    let encodeStr = req.params.key;

    if (req.query.full !== undefined) {
      const springHost = req.query.springHost ?? fqdn;

      if (!constants.federate.knownS83Hosts.includes(springHost)) {
        reply.code(400);
        return;
      }

      encodeStr = `https://${springHost}/${req.params.key}`;
    }

    reply.code(200);
    reply.type(req.headers['content-type'] ?? constants.contentType);

    if (req.headers['content-type'] === 'image/png') {
      return qrcode.toBuffer(encodeStr);
    }

    const qrcodeDataUrlBase64 = await qrcode.toDataURL([{ data: encodeStr, mode: 'byte' }]);
    return mustache.render(qrcodeTmpl, { qrcodeDataUrlBase64 });
  }
};
