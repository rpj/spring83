const os = require('os');
const fs = require('fs');
const path = require('path');
const test = require('tape');
const { nanoid } = require('nanoid');
const { constants } = require('../common');
const shortener = require('../server/shortener');
const tape = require('tape');

const cd = path.resolve(os.tmpdir(), nanoid());
const p = path.resolve(cd, constants.shortener.dbFileName);

fs.mkdir(cd, () => {
  tape.onFinish(() => {
    fs.rm(p, () => {
      fs.rmdir(cd, () => {});
    });
  });

  test('init', async (t) => {
    const db = await shortener.init(cd);
    t.plan(1);
    try {
      await fs.promises.stat(p);
      t.pass();
    } catch {
      t.fail();
    } finally {
      await db.close();
    }
  });

  test('init, add, init again', async (t) => {
    const db = await shortener.init(cd);
    const newId = (await db.shorten('https://example.com/foobarbaz')).shortId;
    await db.close();

    const reDb = await shortener.init(cd);
    const resolved = await reDb.resolve(newId);

    t.plan(2);
    t.equal(resolved, 'https://example.com/foobarbaz');
    t.equal(newId, (await db.shorten('https://example.com/foobarbaz')).shortId);
  });

  test('resolve nothing', async (t) => {
    const db = await shortener.init(cd);
    t.plan(1);
    t.equal(null, await db.resolve('foobar'));
  });

  test('collision', async (t) => {
    const db = await shortener.init(cd);
    const { shortId, isNew } = await db.shorten('https://example.com/collide');
    t.plan(3);
    t.equal(isNew, true);
    const extantId = await db.shorten('https://example.com/collide', async () => shortId);
    t.equal(extantId.shortId, shortId);
    t.equal(extantId.isNew, false);
  });
});
