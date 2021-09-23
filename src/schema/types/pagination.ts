import { GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLObjectType, GraphQLList } from 'graphql';

const Edge = (itemType: any) => {
    return new GraphQLObjectType({
        name: 'EdgeType',
        fields: () => ({
            node: { type: itemType },
            cursor: { type: GraphQLString }
        })
    })
}

const PageInfo = new GraphQLObjectType({
    name: 'PageInfoType',
    fields: () => ({
        startCursor: { type: GraphQLString },
        endCursor: { type: GraphQLString },
        hasNextPage: { type: GraphQLBoolean }
    })
});

export const encodeCursor = (node) => {
    return Buffer.from(node, 'binary').toString('base64');
}

export const decodeCursor = (cursor) => {
    return Buffer.from(cursor, 'base64').toString('binary');
}

export const Page = (itemType: any) => {
    return new GraphQLObjectType({
        name: 'PageType',
        fields: () => ({
            totalCount: { type: GraphQLInt },
            edges: { type: new GraphQLList(Edge(itemType)) },
            pageInfo: { type: PageInfo }
        })
    })
}
