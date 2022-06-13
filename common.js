const constants = Object.freeze({
  maximumContentLength: 2217,
  protocolVersion: '83',
  contentType: 'text/html;charset=utf-8',
  authorizationPreamble: 'Spring-83 Signature',
  keyMatchRegex: /[a-f0-9]{58}ed20(\d{2})$/
});

// 'strict' only allows keys valid *this year* to match
function pubKeyHexIsValid (pubKeyHex, strict = false) {
  const match = pubKeyHex.match(constants.keyMatchRegex);

  if (match && match.length === 2) {
    const lastTwoDigitsNum = Number.parseInt(match[1]);

    if (Number.isNaN(lastTwoDigitsNum)) {
      return false;
    }

    // "Furthermore, the final four characters, interpreted as a decimal number, must fall in the range 2022 .. 2099."
    if (lastTwoDigitsNum < 22) {
      return false;
    }

    if (strict && lastTwoDigitsNum !== new Date().getYear() - 100) {
      return false;
    }

    return true;
  }

  return false;
}

module.exports = {
  constants,

  pubKeyIsValid: (pubKeyData, strict = false) => pubKeyHexIsValid(Buffer.from(pubKeyData).toString('hex'), strict),
  pubKeyHexIsValid
};
