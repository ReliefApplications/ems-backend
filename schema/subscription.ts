import graphql from 'graphql';
import pubsub from '../server/pubsub';
import { NotificationType, RecordType } from './types';
import { withFilter } from 'apollo-server-express';

const {
    GraphQLObjectType,
    GraphQLID
} = graphql;

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        notification: {
            type: NotificationType,
            subscribe() {
                return pubsub.asyncIterator(['notification']);
            }
        },
        recordAdded: {
            type: RecordType,
            args: {
                resource: { type: GraphQLID },
                form: { type: GraphQLID },
            },
            subscribe: withFilter(
                () => pubsub.asyncIterator('record_added'),
                (payload, variables) => {
                    if (variables.resource) {
                        return payload.recordAdded.resource === variables.resource;
                    }
                    if (variables.form) {
                        return payload.recordAdded.form === variables.form;
                    }
                    return true;
                }
            )
        }
    }
});

export default Subscription;
