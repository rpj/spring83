const headerNames = {
  difficulty: 'spring-difficulty',
  signature: 'spring-signature',
  version: 'spring-version'
};

const embeddedJsonExampleBoardKey = '808b9f782c590df9f0f5c8052117a4db96c079a128d871cd4cd3e73cc83e0523';

module.exports = {
  constants: Object.freeze({
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
    headerNames,
    clientFiles: {
      rootTmpl: 'root.tmpl.html',
      notFoundTmpl: '404.tmpl.html',
      testKeyTmpl: 'testkey.tmpl.html',
      embedJsContent: 'embed.js',
      embedJSONExample: 'embedded-json-example.tmpl.html'
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
      methods: ['GET', 'PUT'],
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
    ]
  })
};
