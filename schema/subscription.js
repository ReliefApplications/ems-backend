/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const pubsub = require('../server/pubsub');
const { NotificationType } = require('./types');

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
        }
    }
});

module.exports = Subscription;
