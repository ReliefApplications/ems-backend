import { GraphQLObjectType } from 'graphql';
import applicationEdited from './applicationEdited';
import notification from './notification';
import recordAdded from './recordAdded';

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        applicationEdited,
        notification,
        recordAdded
    }
});

export default Subscription;
