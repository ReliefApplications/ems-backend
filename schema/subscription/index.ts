import { GraphQLObjectType } from 'graphql';
import notification from './notification';
import recordAdded from './recordAdded';

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        notification,
        recordAdded
    }
});

export default Subscription;
