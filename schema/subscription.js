/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const graphql = require('graphql');
const { PubSub } = require('graphql-subscriptions');
const { RecordType } = require('./types');

const {
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean,
    GraphQLList,
} = graphql;

const pubsub = new PubSub();

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        recordAdded: {
            type: RecordType,
            // resolve(payload) {
            //     return payload;
            // },
            subscribe() {
                return pubsub.asyncIterator('recordAdded');
            }
        }
    }
});

module.exports = Subscription;
