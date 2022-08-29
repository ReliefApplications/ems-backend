import { GraphQLObjectType } from 'graphql';
import applicationUnlocked from './applicationUnlocked.subscription';
import applicationEdited from './applicationEdited.subscription';
import notification from './notification.subscription';
import recordAdded from './recordAdded.subscription';

/** GraphQL subscriptions type definition */
const Subscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    applicationUnlocked,
    applicationEdited,
    notification,
    recordAdded,
  },
});

export default Subscription;
