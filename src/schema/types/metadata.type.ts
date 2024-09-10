import { Form, Resource } from '@models';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from 'security/defineUserAbility';
import { selectableDefaultRecordFieldsFlat } from '@const/defaultRecordFields';
import { get, sortBy } from 'lodash';
import { getFullChoices } from '@utils/form';
import {
  getMetaData,
  getOwnerOptions,
  getReferenceDataFields,
  getUsersOptions,
} from '@utils/form/metadata.helper';
import { referenceDataType } from '@const/enumTypes';
import { CustomAPI } from '@server/apollo/dataSources';
import { logger } from '@lib/logger';

/** GraphQL field metadata type definition */
export const FieldMetaDataType = new GraphQLObjectType({
  name: 'FieldMetaData',
  fields: () => ({
    automated: { type: GraphQLBoolean },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    editor: { type: GraphQLString },
    filter: { type: GraphQLJSON },
    filterable: { type: GraphQLBoolean },
    multiSelect: { type: GraphQLBoolean },
    canSee: {
      type: GraphQLBoolean,
      resolve: (parent, _, context) => {
        const ability: AppAbility = context.user._abilityForRecords;
        const ogParent: Form | Resource = context._parent;
        return ability.can('read', ogParent, `data.${parent.name}`);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      resolve: (parent, _, context) => {
        const ability: AppAbility = context.user._abilityForRecords;
        const ogParent: Form | Resource = context._parent;
        if (selectableDefaultRecordFieldsFlat.includes(parent.name)) {
          return false;
        } else {
          return ability.can('update', ogParent, `data.${parent.name}`);
        }
      },
    },
    options: {
      type: GraphQLJSON,
      resolve: async (parent, _, context) => {
        const ogParent: Form | Resource = context._parent;
        if (parent.name === 'form' || parent.name === 'lastUpdateForm') {
          const relatedForms = await Form.find({
            resource: get(ogParent, 'resource', ogParent.id),
          }).select('id name');
          return relatedForms.map((x) => {
            return {
              text: x.name,
              value: x.id,
            };
          });
        }
        if (
          ['radiogroup', 'dropdown', 'checkbox', 'tagbox'].includes(parent.type)
        ) {
          if (parent._field?.choicesByUrl) {
            return getFullChoices(parent._field, context);
          } else if (parent._referenceData) {
            // For ReferenceData children use object stored in field to create choices.
            const referenceData = parent._referenceData;
            let items: any[] = [];
            try {
              // If it's coming from an API Configuration, uses a dataSource.
              if (referenceData.type !== referenceDataType.static) {
                const dataSource: CustomAPI =
                  context.dataSources[referenceData.apiConfiguration.name];
                items = await dataSource.getReferenceDataItems(
                  referenceData,
                  referenceData.apiConfiguration
                );
              } else {
                items = referenceData.data;
              }
            } catch (err) {
              // Log error but continue execution
              logger.error(err.message, { stack: err.stack });
            }
            return sortBy(
              items.map((x) => ({
                value: String(x[parent.name]),
                text: String(x[parent.name]),
              })),
              (x) => x.text
            );
          } else {
            return get(parent._field, 'choices', []).map((x) => {
              return {
                text: get(x, 'text', x),
                value: get(x, 'value', x),
              };
            });
          }
        }
        if (['users', 'owner'].includes(parent.type)) {
          const ability: AppAbility = context.user._abilityForRecords;
          const canSee = ability.can('read', ogParent, `data.${parent.name}`);
          if (canSee) {
            if (parent.type === 'users') {
              return getUsersOptions(parent._field.applications);
            } else {
              return getOwnerOptions(parent._field.applications);
            }
          }
        }
      },
    },
    fields: {
      type: new GraphQLList(FieldMetaDataType),
      resolve: async (parent, _, context) => {
        if (['resource', 'resources'].includes(parent.type)) {
          return getMetaData(
            await Resource.findById(parent._field.resource),
            context,
            false
          );
        }
        if (parent._field?.referenceData) {
          return getReferenceDataFields(parent._field);
        }
        return parent.fields;
      },
    },
    usedIn: {
      type: new GraphQLList(GraphQLString),
    },
  }),
});
