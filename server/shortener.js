'use strict';

const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite3').verbose();
const { nanoid } = require('nanoid/async');
const { constants } = require('../common');

let resolvedDbPath;
let db;
let app;

const ModuleObj = {
  init,
  shorten,
  resolve,
  close: async () => new Promise((resolve) => db.close(() => resolve(db = null)))
};

const CreateTable = 'CREATE TABLE shortener (shortId TEXT NOT NULL UNIQUE, url TEXT NOT NULL UNIQUE)';
const Shorten = 'INSERT INTO shortener VALUES (?, ?)';
const Resolve = 'SELECT url FROM shortener WHERE shortId = ?';
const UrlExists = 'SELECT shortId FROM shortener WHERE url = ?';
const AllShortIds = 'SELECT shortId FROM shortener';

const IdCollisionCheckSet = new Set();

async function init (contentDir = './', appRef) {
  resolvedDbPath = path.resolve(contentDir, constants.shortener.dbFileName);
  app = appRef;

  try {
    await fs.promises.stat(resolvedDbPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await new Promise((resolve, reject) => {
        (db = new sqlite.Database(resolvedDbPath))
          .run(CreateTable, (err) => {
            if (err === null) { resolve(); } else { reject(err); }
          });
      });
    } else {
      throw err;
    }
  }

  if (!db) {
    db = new sqlite.Database(resolvedDbPath);
  }

  await new Promise((resolve, reject) => {
    db.each(AllShortIds, [], function (err, row) {
      if (err) {
        return reject(err);
      }

      IdCollisionCheckSet.add(row.shortId);
    }, resolve);
  });

  return ModuleObj;
}

async function defaultIdGen () {
  let newId;
  let idSize = constants.shortener.idSize;
  for (let i = 1; !newId || IdCollisionCheckSet.has(newId); i++) {
    newId = await nanoid(idSize);
    if (!(i % 128)) {
      app.log.warn(`Having to bump idSize by one to ${idSize}...`);
      idSize += 1;
    }
  }
  return newId;
}

async function urlExists (url) {
  return new Promise((resolve, reject) => {
    db.each(UrlExists, [url], function (err, row) {
      if (err) {
        return reject(err);
      }

      resolve(row.shortId);
    }, function (err, numRow) {
      if (err) {
        reject(err);
      }

      if (numRow === 0) {
        resolve(null);
      }

      reject(numRow);
    });
  });
}

async function shorten (url, idGenerator = defaultIdGen) {
  url = encodeURI(url.trim());
  const extantShort = await urlExists(url);
  if (extantShort !== null) {
    return { shortId: extantShort, isNew: false };
  }

  const shortId = await idGenerator();

  return new Promise((resolve, reject) => {
    db.run(Shorten, [shortId, url], (err) => {
      if (err) {
        return reject(err);
      }

      resolve({ shortId, isNew: true });
    });
  });
}

async function resolve (shortId) {
  return new Promise((resolve, reject) => {
    db.each(Resolve, [shortId], function (err, row) {
      if (err) {
        return reject(err);
      }

      resolve(row.url);
    }, function (err, numRow) {
      if (err) {
        reject(err);
      }

      if (numRow === 0) {
        resolve(null);
      }

      reject(numRow);
    });
  });
}

module.exports = {
  init,
  shorten,
  resolve
};
