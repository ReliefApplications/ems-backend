import { GraphQLInt, GraphQLBoolean, GraphQLObjectType, GraphQLList, GraphQLNonNull, GraphQLID } from 'graphql';

const Edge = (itemType: any) => {
    return new GraphQLObjectType({
        name: `${itemType.name}Edge`,
        fields: () => ({
            node: { type: itemType },
            cursor: { type: new GraphQLNonNull(GraphQLID) }
        })
    });
};

const PageInfo = new GraphQLObjectType({
    name: 'PageInfo',
    fields: () => ({
        startCursor: { type: GraphQLID },
        endCursor: { type: GraphQLID },
        hasNextPage: { type: GraphQLBoolean }
    })
});

export const encodeCursor = (node) => {
    return Buffer.from(node, 'binary').toString('base64');
};

export const decodeCursor = (cursor) => {
    return Buffer.from(cursor, 'base64').toString('binary');
};

export const Connection = (itemType: any) => {
    return new GraphQLObjectType({
        name: `${itemType.name}Connection`,
        fields: () => ({
            totalCount: { type: GraphQLInt },
            edges: { type: new GraphQLList(Edge(itemType)) },
            pageInfo: { type: PageInfo }
        })
    });
};
