const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KEY_MATCH_RX = /ed20(\d{2})$/;

const start = Number(new Date());
let rounds = 0;

function sighandle (signal) {
  console.error(`Aborted after ${rounds} rounds before finding a match (${Number(new Date()) - start})!`);
}

['SIGINT', 'SIGHUP'].forEach(sig => process.on(sig, sighandle));

async function main () {
  const rundir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'spring83-genkey-'));
  console.log(`Temp run dir: ${rundir}`);
  const pkeyPem = path.join(rundir, 'pkey');
  const pkeyFile = `${pkeyPem}.parsed`;

  let matchedKey;

  const CMDS_OPTS = [
    [
      'genpkey',
      '-out',
      pkeyPem,
      '-algorithm',
      'ed25519'
    ],
    [
      'asn1parse',
      '-in',
      pkeyPem,
      '-strparse',
      '12',
      '-out',
      pkeyFile
    ]
  ];

  while (matchedKey === undefined) {
    ++rounds;

    for (const cmdOpts of CMDS_OPTS) {
      const r = spawnSync('openssl', cmdOpts);
      if (r.status !== 0) {
        throw new Error(`invocation "${cmdOpts.join(' ')}" failed: ${r.stderr}`)
      }
    }


    const privBuf = await fs.promises.readFile(pkeyFile);
    const pkHex = privBuf.slice(2).toString('hex');
    const match = pkHex.match(KEY_MATCH_RX);

    if (match && match.length === 2) {
      const lastTwoDigitsNum = Number.parseInt(match[1]);

      if (Number.isNaN(lastTwoDigitsNum)) {
        continue;
      }

      // "Furthermore, the final four characters, interpreted as a decimal number, must fall in the range 2022 .. 2099."
      if (lastTwoDigitsNum < 22) {
        continue;
      }

      matchedKey = pkHex;
    }
  }

  console.log(matchedKey);
  console.log(rounds);
  console.log(Number(new Date()) - start);

  console.log(await fs.promises.readFile(pkeyPem));

  const pubKeyFile = `${pkeyPem}.pub`;
  const pubKeyRes = spawnSync('openssl', [
    'pkey',
    '-in',
    pkeyPem,
    '-out',
    pubKeyFile,
    '-pubout'
  ]);

  if (pubKeyRes.status !== 0) {
    throw new Error(`pubkey ${pubKeyRes.stderr}`);
  }

  console.log(await fs.promises.readFile(pubKeyFile));

  // await fs.promises.rm(rundir, { recursive: true });
}

main();
