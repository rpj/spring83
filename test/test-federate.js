'use strict';

const test = require('tape');
const federate = require('../server/federate');

const mockApp = {
  log: {
    warn: console.log,
    info: console.log
  }
};

test('canFederateRequest false spring:share meta', async (t) => {
  const m = '<meta name="spring:share" content="false"/>';
  federate.init(mockApp, './', { keybar: {} }, 'foo', true);
  t.plan(1);
  t.false(federate.canFederateRequest({
    body: m,
    params: { key: 'keybar' }
  }));
});

test('canFederateRequest false Via header', async (t) => {
  federate.init(mockApp, './', { keybar: {} }, 'foo', true);
  t.plan(2);
  t.false(federate.canFederateRequest({
    body: '<h1>foobar</h1>',
    params: { key: 'keybar' },
    headers: { via: '1.1 example.com' }
  }));
  t.false(federate.canFederateRequest({
    body: '<h1>foobar</h1>',
    params: { key: 'keybar' },
    headers: { via: '1.1 do-not-share' }
  }));
});
