import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';
import { Types } from 'mongoose';

/** Page context type for queries/mutations argument */
export type PageContextArgs = {
  refData?: string | Types.ObjectId;
  resource: Types.ObjectId;
  displayField: string;
};

/** GraphQL Input Type for the page context */
export const PageContextInputType = new GraphQLInputObjectType({
  name: 'PageContextInputType',
  fields: () => ({
    refData: { type: GraphQLID },
    resource: { type: GraphQLID },
    displayField: { type: new GraphQLNonNull(GraphQLString) },
  }),
});
