import { GraphQLID, GraphQLList } from 'graphql';
import {
  defaultMetaFieldsFlat,
  userMetaResolver,
} from '@const/defaultRecordFields';
import {
  getFields,
  getManyToOneMetaFields,
  getMetaFields,
} from '../../introspection/getFields';
import { NameExtension } from '../../introspection/getFieldName';
import getReversedFields from '../../introspection/getReversedFields';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import meta from '../Query/meta';
import getMetaFieldResolver from './getMetaFieldResolver';
import getMetaReferenceDataResolver from './getMetaReferenceDataResolver';
import { Types } from 'mongoose';
import { ReferenceData, Resource } from '@models';

/**
 * Gets the resolvers for each field of the document for a given resource
 *
 * @param name Name of the resource
 * @param data Resource fields by name
 * @param id Resource id
 * @param ids Resource ids by name
 * @param forms Array of objects with each form and it's id
 * @param referenceDatas list of available ref data
 * @returns A object with all the resolvers
 */
export const getMetaResolver = (
  name: string,
  data,
  id: string,
  ids,
  forms: { name: string; resource?: string }[],
  referenceDatas: ReferenceData[]
) => {
  const metaFields = getMetaFields(data[name]);

  const entityFields = getFields(data[name]);

  const relationshipFields = Object.keys(entityFields)
    .filter(
      (x: any) =>
        entityFields[x].type === GraphQLID ||
        entityFields[x].type.toString() ===
          new GraphQLList(GraphQLID).toString()
    )
    .filter(isRelationshipField);

  const manyToOneFields = getManyToOneMetaFields(data[name]);

  const manyToOneResolvers = relationshipFields.reduce(
    (resolvers, fieldName) => {
      if (manyToOneFields[fieldName]) {
        const field = manyToOneFields[fieldName];
        const relatedResource = Object.keys(ids).find(
          (x) => ids[x] == field.resource
        );
        if (relatedResource) {
          return Object.assign({}, resolvers, {
            [field.name]: meta(field.resource),
          });
        }
      }
    },
    {}
  );

  const defaultResolvers = defaultMetaFieldsFlat.reduce(
    (resolvers, fieldName) =>
      Object.assign({}, resolvers, {
        [fieldName]: () => {
          switch (fieldName) {
            case 'form': {
              const choices = forms.reduce((prev: any, curr: any) => {
                if (
                  new Types.ObjectId(curr.resource).equals(id) ||
                  new Types.ObjectId(curr._id).equals(id)
                ) {
                  prev.push({ value: curr._id, text: curr.name });
                }
                return prev;
              }, []);
              return {
                name: 'form',
                type: 'dropdown',
                choices,
                readOnly: true,
                permissions: {
                  canSee: true,
                  canUpdate: false,
                },
              };
            }
            case 'lastUpdateForm': {
              const choices = forms.reduce((prev: any, curr: any) => {
                if (
                  new Types.ObjectId(curr.resource).equals(id) ||
                  new Types.ObjectId(curr._id).equals(id)
                ) {
                  prev.push({ value: curr._id, text: curr.name });
                }
                return prev;
              }, []);
              return {
                name: 'lastUpdateForm',
                type: 'dropdown',
                choices,
                readOnly: true,
                permissions: {
                  canSee: true,
                  canUpdate: false,
                },
              };
            }
            case '_source': {
              return id;
            }
            case 'createdAt': {
              return {
                name: fieldName,
                type: 'datetime',
                readOnly: true,
                permissions: {
                  canSee: true,
                  canUpdate: false,
                },
              };
            }
            case 'modifiedAt': {
              return {
                name: fieldName,
                type: 'datetime',
                readOnly: true,
                permissions: {
                  canSee: true,
                  canUpdate: false,
                },
              };
            }
            default: {
              return {
                name: fieldName,
                readOnly: true,
                permissions: {
                  canSee: true,
                  canUpdate: false,
                },
              };
            }
          }
        },
      }),
    {}
  );

  const classicResolvers = Object.keys(metaFields)
    .filter((x) => !defaultMetaFieldsFlat.includes(x))
    .reduce(
      (resolvers, fieldName) =>
        Object.assign({}, resolvers, {
          [fieldName]: async (parent) => {
            const field = relationshipFields.includes(fieldName)
              ? parent[
                  fieldName.slice(
                    0,
                    fieldName.length - (fieldName.endsWith('_id') ? 3 : 4)
                  )
                ]
              : parent[fieldName];

            if (field) {
              return getMetaFieldResolver(field);
            }

            // For relationship fields
            if (parent.resource) {
              const resource = await Resource.findOne({
                _id: parent.resource,
              }).select('fields');

              const relatedFields = resource.fields.reduce((prev, curr) => {
                prev[curr.name] = curr;
                return prev;
              });

              return getMetaFieldResolver(relatedFields[fieldName]);
            }
          },
        }),
      {}
    );

  const usersResolver = {
    createdBy: (parent, args, context, info) => {
      return userMetaResolver(info);
    },
    lastUpdatedBy: (parent, args, context, info) => {
      return userMetaResolver(info);
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

  const referenceDataResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.referenceData))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.slice(0, fieldName.length - 4)
      );
      const referenceData = referenceDatas.find(
        (x: any) => x._id == field.referenceData.id
      );
      if (referenceData) {
        return Object.assign({}, resolvers, {
          [field.name]: getMetaReferenceDataResolver(field, referenceData),
        });
      }
    }, {});

  return Object.assign(
    {},
    defaultResolvers,
    classicResolvers,
    manyToOneResolvers,
    oneToManyResolvers,
    usersResolver,
    referenceDataResolvers
  );
};

export default getMetaResolver;
