import { Types } from 'mongoose';
import { Client, User } from '@models';
import {
  findClientByToken,
  findUserByToken,
} from '@server/middlewares/findPrincipal';

jest.mock('@models');

/** Identity id carried by the token */
const OID = new Types.ObjectId().toHexString();

/**
 * Mocks the shared (automocked) findOne so that it answers per filter.
 *
 * @param answers list of [filter matcher, result]
 */
const mockFindOne = (answers: [(filter: any) => boolean, any][]) => {
  (User.findOne as jest.Mock).mockImplementation((filter: any) => {
    const found = answers.find(([matches]) => matches(filter));
    const result = found ? found[1] : null;
    const chain = {
      populate: jest.fn(() => chain),
      then: (resolve: any, reject: any) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  });
};

describe('findPrincipal (L-05)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('findUserByToken', () => {
    it('matches the identity id first', async () => {
      const bound = { _id: 'bound', oid: OID };
      mockFindOne([[(f) => f.oid === OID, bound]]);
      await expect(
        findUserByToken({ oid: OID, username: 'someone@who.int' })
      ).resolves.toBe(bound);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({ oid: OID });
    });

    it('falls back on the username only for accounts without identity id', async () => {
      const invited = { _id: 'invited', username: 'someone@who.int' };
      mockFindOne([
        [(f) => f.username === 'someone@who.int' && f.oid === null, invited],
      ]);
      await expect(
        findUserByToken({ oid: OID, username: 'someone@who.int' })
      ).resolves.toBe(invited);
      expect(User.findOne).toHaveBeenLastCalledWith({
        username: 'someone@who.int',
        oid: null,
      });
    });

    it('never returns an account bound to another identity with the same username', async () => {
      // The account exists with another oid: the username-only filter (oid: null) does not match it
      mockFindOne([
        [
          (f) => f.username === 'someone@who.int' && !('oid' in f),
          { _id: 'x' },
        ],
      ]);
      await expect(
        findUserByToken({ oid: OID, username: 'someone@who.int' })
      ).resolves.toBeNull();
      for (const [filter] of (User.findOne as jest.Mock).mock.calls) {
        expect(filter).not.toEqual({ username: 'someone@who.int' });
        expect(filter).not.toHaveProperty('$or');
      }
    });

    it('does not query by identity id when the token has none', async () => {
      mockFindOne([]);
      await findUserByToken({ username: 'someone@who.int' });
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.findOne).toHaveBeenCalledWith({
        username: 'someone@who.int',
        oid: null,
      });
    });

    it('returns null without querying when the token carries neither claim', async () => {
      mockFindOne([]);
      await expect(findUserByToken({})).resolves.toBeNull();
      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findClientByToken', () => {
    it('matches the identity id first, then the client id of unbound clients only', async () => {
      const unbound = { _id: 'unbound', clientId: 'app-id' };
      mockFindOne([
        [(f) => f.clientId === 'app-id' && f.oid === null, unbound],
      ]);
      await expect(
        findClientByToken({ oid: OID, clientId: 'app-id' })
      ).resolves.toBe(unbound);
      expect(Client.findOne).toHaveBeenNthCalledWith(1, { oid: OID });
      expect(Client.findOne).toHaveBeenNthCalledWith(2, {
        clientId: 'app-id',
        oid: null,
      });
    });

    it('returns null without querying when the token carries neither claim', async () => {
      mockFindOne([]);
      await expect(findClientByToken({})).resolves.toBeNull();
      expect(Client.findOne).not.toHaveBeenCalled();
    });
  });
});
