import { GraphQLError } from 'graphql';
import { graphQLAuthCheck } from '@schema/shared';
import pubsub from '@server/pubsub';
import subscription from '@schema/subscription/recordAdded.subscription';

jest.mock('@schema/shared');
jest.mock('@server/pubsub');
jest.mock('@services/logger.service');

describe('recordAdded subscription (L-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pubsub as jest.Mock).mockResolvedValue({
      asyncIterator: jest.fn(() => ({ next: jest.fn(), return: jest.fn() })),
    });
  });

  it('refuses unauthenticated subscribers before touching the event bus', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {
      throw new GraphQLError('common.errors.userNotLogged');
    });
    await expect(
      subscription.subscribe(null, {}, { user: null } as any)
    ).rejects.toThrow('common.errors.userNotLogged');
    expect(pubsub).not.toHaveBeenCalled();
  });

  it('subscribes authenticated users', async () => {
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    const context: any = { user: { _id: 'user' } };
    await subscription.subscribe(null, { form: 'form' }, context);
    expect(graphQLAuthCheck).toHaveBeenCalledWith(context);
    expect(pubsub).toHaveBeenCalled();
  });
});
