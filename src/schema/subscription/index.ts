import { GraphQLObjectType } from 'graphql';
import applicationUnlocked from './applicationUnlocked';
import applicationEdited from './applicationEdited';
import notification from './notification';
import recordAdded from './recordAdded';

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
