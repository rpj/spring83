const headerNames = {
  difficulty: 'spring-difficulty',
  signature: 'spring-signature',
  version: 'spring-version',
  shortenerDisable: 'spring-shortener-disable',
  federatedTo: 'spring-federated-to'
};

const embeddedJsonExampleBoardKey = '808b9f782c590df9f0f5c8052117a4db96c079a128d871cd4cd3e73cc83e0523';

let knownS83Hosts = ['bogbody.biz', '0l0.lol', 'spring83.kindrobot.ca', 'spring83.rkas.net', 'spring83.mozz.us', 'lol.0l0.lol'];
if (process.env.NODE_ENV !== 'prod') {
  knownS83Hosts = ['0l0.lol', 'lol.0l0.lol'];
}

module.exports = {
  constants: Object.freeze({
    maximumContentLength: 2217,
    maximumNumberOfBoards: 10_000_000,
    protocolVersion: '83',
    contentType: 'text/html;charset=utf-8',
    keyMatchRegex: /83e(0[1-9]|1[0-2])(\d\d)$/,
    timeFudgeMs: 6000,
    boardTTLDays: 22,
    getKeySecurityPolicies: {
      none: ['default-src', 'child-src', 'frame-src', 'prefetch-src', ' object-src'],
      "self' 'nonce-fea012f5-2f5e-400c-b696-f98bb6845e57": ['script-src'],
      self: ['font-src'],
      'unsafe-inline': ['style-src'],
      'data:': ['img-src']
    },
    headerNames,
    clientFiles: {
      rootTmpl: 'root.tmpl.html',
      notFoundTmpl: '404.tmpl.html',
      testKeyTmpl: 'testkey.tmpl.html',
      embedJsContent: 'embed.js',
      embedJSONExample: 'embedded-json-example.tmpl.html',
      qrcodeTmpl: 'qrcode.tmpl.html',
      getkeyTmpl: 'getkey.tmpl.html'
    },
    defaultContentPath: '.content',
    defaultFQDN: 'example.com',
    strictVerification: true,
    difficultyFactorExp: 4,
    ttlCheckFreqMinutes: 11,
    keypairFilenamePrefix: 'spring-83-keypair',
    pubBoardsJsonFileName: 'public-boards.json',
    pubBoardRefreshFreqMinutes: 3,
    testPublicKey: 'ab589f4dde9fce4180fcf42c7b05185b0a02a5d682e353fa39177995083e0583',
    corsOptions: {
      origin: '*',
      methods: ['GET', 'PUT', 'POST'],
      allowedHeaders: ['Content-Type', 'If-Modified-Since', 'Spring-Signature', 'Spring-Version'],
      exposedHeaders: ['Content-Type', 'Last-Modified', ...Object.values(headerNames)]
    },
    putnewMinifyOptions: {
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: true,
      minifyCSS: true,
      conservativeCollapse: true
    },
    embeddedJsonExampleBoardKey,
    ttlExceptions: [
      embeddedJsonExampleBoardKey
    ],
    shortener: {
      enabled: true,
      dbFileName: 'shortener.sqlite3',
      idSize: 4,
      knownS83Hosts
    },
    federate: {
      rateLimitMs: 2700,
      // make sure your FQDN matches one of these or you'll federate to yourself!
      knownS83Hosts,
      ignorableStatus: [409, 502]
    },
    // each sentence of the dev banner will be split on rendering with <br/> tags
    devBanner: 'This is a development &amp; testing server. It and all of its data may disappear at any time. You are welcome to use it but your boards are <i>not safe</i> here.'
  })
};
