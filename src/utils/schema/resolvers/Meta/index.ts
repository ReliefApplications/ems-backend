import { GraphQLID, GraphQLList } from 'graphql';
import { defaultMetaFieldsFlat, UserMetaType } from '../../../../const/defaultRecordFields';
import { getManyToOneMetaFields, getMetaFields } from '../../introspection/getFields';
import getReversedFields from '../../introspection/getReversedFields';
import { getRelatedTypeName, getRelationshipFromKey } from '../../introspection/getTypeFromKey';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import meta from '../Query/meta';
import getMetaFieldResolver from './getMetaFieldResolver';

export const getMetaResolver = (name: string, data, id: string, ids) => {

    const fields = getMetaFields(data[name])

    const entityFields = Object.keys(fields);

    const relationshipFields = Object.keys(Object.values(fields).filter((x: any) =>
        (x.type === GraphQLID || x.type.toString() === GraphQLList(GraphQLID).toString())))
        .filter(isRelationshipField);

    const manyToOneFields = getManyToOneMetaFields(data[name]);

    const manyToOneResolvers = relationshipFields.reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: meta(manyToOneFields[fieldName])
            })
        },
        {}
    );

    const defaultResolvers = defaultMetaFieldsFlat.reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: () => {
                    return fieldName === '_source' ? id : {
                        name: fieldName
                    }
                }
            }),
        {}
    );

    const classicResolvers = entityFields.filter(x => !defaultMetaFieldsFlat.includes(x)).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    const field = relationshipFields.includes(fieldName) ?
                        entity[fieldName.substr(0, fieldName.length - (fieldName.endsWith('_id') ? 3 : 4))] :
                        entity[fieldName];
                    getMetaFieldResolver(field);
                }
            }),
        {}
    );

    const usersResolver = {
        createdBy: {
            type: UserMetaType,
            resolve(entity) {
                return entity ? true : false;
            }
        },
        lastUpdatedBy: {
            type: UserMetaType,
            resolve(entity) {
                return entity ? true : false;
            }
        }
    }

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        // tslint:disable-next-line: no-shadowed-variable
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(() => {
                    return [getRelationshipFromKey(entityName), meta(ids[entityName])];
                })
            )
            )
        , {}
    );

    return Object.assign({}, defaultResolvers, classicResolvers, manyToOneResolvers, oneToManyResolvers, usersResolver);
}

export default getMetaResolver;
