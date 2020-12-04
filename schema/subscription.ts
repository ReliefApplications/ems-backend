import { GraphQLObjectType } from 'graphql';
import notification from './subscriptions/notification';
import recordAdded from './subscriptions/recordAdded';

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        notification,
        recordAdded
    }
});

export default Subscription;
