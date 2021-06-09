import { GraphQLObjectType } from 'graphql';
import applicationUnlocked from './applicationUnlocked';
import notification from './notification';
import recordAdded from './recordAdded';

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        applicationUnlocked,
        notification,
        recordAdded
    }
});

export default Subscription;
