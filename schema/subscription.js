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

// === SUBSCRIPTIONS ===
const Subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
        recordAdded: {
            type: RecordType,
            resolve(payload) {
                return payload;
            },
            subscribe() {
                PubSub.asyncIterator('recordAdded');
            }
        }
    }
});

module.exports = Subscription;
