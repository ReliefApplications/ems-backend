import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import { Layer } from '@models';
import { Connection } from './pagination.type';

/**
 * GraphQL Layer type.
 */
export const LayerType = new GraphQLObjectType({
  name: 'Layer',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    //sublayers: { type: GraphQLJSON },
    sublayers: {
      type: new GraphQLList(LayerType),
      async resolve(parent) {
        return Layer.find({ _id: { $in: parent.sublayers } });
      },
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
  }),
});

/** GraphQL layer connection type definition */
export const LayerConnectionType = Connection(LayerType);
