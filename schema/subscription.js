/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const pubsub = require('../server/pubsub');
const { NotificationType, RecordType } = require('./types');
const { withFilter } = require('apollo-server-express');

const {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean,
    GraphQLList,
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
                    console.log(payload);
                    if (variables.form) {
                        return payload.recordAdded.form === variables.form;
                    }
                    if (variables.resource) {
                        return payload.recordAdded.resource === variables.resource;
                    }
                    return true;
                }
            )
        }
    }
});

module.exports = Subscription;
