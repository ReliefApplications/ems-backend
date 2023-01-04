import { corsMiddleware } from '@server/middlewares';

let sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  req,
  res,
  next;

describe('Cors middleware', () => {
  test('Cors middlewares without origin', async () => {
    req = {
      headers: {
        origin: '',
      },
    };
    (res = { send: sinon.spy() }), (next = sinon.spy());

    corsMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
