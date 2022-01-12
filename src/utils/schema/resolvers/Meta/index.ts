import { GraphQLID, GraphQLList } from 'graphql';
import {
  defaultMetaFieldsFlat,
  UserMetaType,
} from '../../../../const/defaultRecordFields';
import {
  getFields,
  getManyToOneMetaFields,
  getMetaFields,
} from '../../introspection/getFields';
import getReversedFields from '../../introspection/getReversedFields';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import meta from '../Query/meta';
import getMetaFieldResolver from './getMetaFieldResolver';

export const getMetaResolver = (name: string, data, id: string, ids) => {
  const metaFields = getMetaFields(data[name]);

  const entityFields = getFields(data[name]);

  const relationshipFields = Object.keys(entityFields)
    .filter(
      (x: any) =>
        entityFields[x].type === GraphQLID ||
        entityFields[x].type.toString() === GraphQLList(GraphQLID).toString()
    )
    .filter(isRelationshipField);

  const manyToOneFields = getManyToOneMetaFields(data[name]);

  const manyToOneResolvers = relationshipFields.reduce(
    (resolvers, fieldName) => {
      if (manyToOneFields[fieldName]) {
        const field = manyToOneFields[fieldName];
        return Object.assign({}, resolvers, {
          [field.name]: meta(field.resource),
        });
      }
    },
    {}
  );

  const defaultResolvers = defaultMetaFieldsFlat.reduce(
    (resolvers, fieldName) =>
      Object.assign({}, resolvers, {
        [fieldName]: () => {
          return fieldName === '_source'
            ? id
            : {
                name: fieldName,
              };
        },
      }),
    {}
  );

  const classicResolvers = Object.keys(metaFields)
    .filter((x) => !defaultMetaFieldsFlat.includes(x))
    .reduce(
      (resolvers, fieldName) =>
        Object.assign({}, resolvers, {
          [fieldName]: (entity) => {
            const field = relationshipFields.includes(fieldName)
              ? entity[
                  fieldName.substr(
                    0,
                    fieldName.length - (fieldName.endsWith('_id') ? 3 : 4)
                  )
                ]
              : entity[fieldName];
            return getMetaFieldResolver(field);
          },
        }),
      {}
    );

  const usersResolver = {
    createdBy: {
      type: UserMetaType,
      resolve(entity) {
        return entity ? true : false;
      },
    },
    lastUpdatedBy: {
      type: UserMetaType,
      resolve(entity) {
        return entity ? true : false;
      },
    },
  };

  const entities = Object.keys(data);
  const oneToManyResolvers = entities.reduce(
    // tslint:disable-next-line: no-shadowed-variable
    (resolvers, entityName) =>
      Object.assign(
        {},
        resolvers,
        Object.fromEntries(
          getReversedFields(data[entityName], id).map((x) => {
            return [x.relatedName, meta(ids[entityName])];
          })
        )
      ),
    {}
  );

  return Object.assign(
    {},
    defaultResolvers,
    classicResolvers,
    manyToOneResolvers,
    oneToManyResolvers,
    usersResolver
  );
};

export default getMetaResolver;
