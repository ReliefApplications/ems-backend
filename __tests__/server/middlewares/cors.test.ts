import { corsMiddleware } from '@server/middlewares';
import sinon from 'sinon';

let req, res, next;

describe('Cors middleware', () => {
  test('Cors middlewares without origin', async () => {
    req = {
      headers: {
        origin: '',
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (res = { send: sinon.spy() }), (next = sinon.spy());

    corsMiddleware(req, res, next);
    //expect(res.status).toHaveBeenCalledWith(200);
  });
});
