import { GraphQLObjectType } from 'graphql';
import { camelize, singularize } from 'inflection';
import getFields from './getFields';

export default (data) => {

    return Object.keys(data)
    .map((typeName) => ({
        name: camelize(singularize(typeName)),
        fields: getFields(data[typeName]),
    }))
    .map((typeObject: any) => new GraphQLObjectType(typeObject));
};
