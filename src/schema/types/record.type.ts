import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '@models';
import { Connection } from './pagination.type';
import getDisplayText from '@utils/form/getDisplayText';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { accessibleBy } from '@casl/mongoose';
import { getDraftRecordFilter } from '@utils/filter';

/** GraphQL Record type definition */
export const RecordType = new GraphQLObjectType({
  name: 'Record',
  fields: () => ({
    id: { type: GraphQLID },
    incrementalId: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    archived: { type: GraphQLBoolean },
    draft: { type: GraphQLBoolean },
    form: {
      type: FormType,
      async resolve(parent, args, context) {
        const form = await Form.findById(parent.form);
        const ability = await extendAbilityForRecords(context.user, form);
        if (ability.can('read', form)) {
          return form;
        }
      },
    },
    resource: {
      type: FormType,
      async resolve(parent, args, context) {
        const resource = await Resource.findById(parent.resource);
        const ability = await extendAbilityForRecords(context.user, resource);
        if (ability.can('read', resource)) {
          return resource;
        }
      },
    },
    data: {
      type: GraphQLJSON,
      args: {
        display: { type: GraphQLBoolean },
        replaceTranslations: {
          type: GraphQLBoolean,
          defaultValue: false,
        },
      },
      async resolve(parent, args, context) {
        let lang = context.locale;
        if (lang) {
          lang = lang.toLowerCase();
        }

        const source =
          args.display || (lang && args.replaceTranslations)
            ? parent.resource
              ? await Resource.findById(parent.resource).select('fields')
              : await Form.findById(parent.form).select('fields')
            : null;

        const data = parent.data ? { ...parent.data } : {};

        // Replace fields with translated versions when available
        if (lang && args.replaceTranslations && source && source.fields) {
          for (const field of source.fields) {
            if (field.translateField && field.translateTo) {
              const targetLang = field.translateTo.toLowerCase();
              if (targetLang === lang) {
                const targetField = field.name;
                const sourceField = field.translateField;
                if (
                  data[targetField] !== undefined &&
                  data[targetField] !== null &&
                  data[targetField] !== ''
                ) {
                  data[sourceField] = data[targetField];
                }
                delete data[targetField];
              }
            }
          }
        }

        if (args.display && source) {
          const res = {};
          for (const field of source.fields) {
            const name = field.name;
            if (data[name] !== undefined && data[name] !== null) {
              res[name] = data[name];
              // Get the display field from the linked record if any
              if (field.resource && field.displayField) {
                try {
                  const record = await Record.findOne({
                    _id: data[name],
                    archived: { $ne: true },
                    ...getDraftRecordFilter(),
                  });
                  res[name] = record.data[field.displayField];
                } catch {
                  res[name] = null;
                }
              }
              // Get the text instead of the value for choices, fetch it if needed.
              if (
                field.choices ||
                field.choicesByUrl ||
                field.choicesByGraphQL
              ) {
                res[name] = await getDisplayText(field, data[name], context);
              }
            } else {
              res[name] = null;
            }
          }
          return res;
        }
        return data;
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      async resolve(parent) {
        const versions = await Version.find().where('_id').in(parent.versions);
        return versions;
      },
    },
    createdBy: {
      type: UserType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const user = await User.findOne({
          _id: parent.createdBy.user,
          ...accessibleBy(ability, 'read').User,
        });
        return user;
      },
    },
    modifiedBy: {
      type: UserType,
      async resolve(parent) {
        if (parent.versions && parent.versions.length > 0) {
          const lastVersion = await Version.findById(parent.versions.pop());
          if (lastVersion) {
            const user = await User.findById(lastVersion.createdBy);
            return user;
          }
        }
        if (parent.createdBy && parent.createdBy.user) {
          // if no version yet, the last modifier is the creator
          const user = await User.findById(parent.createdBy.user);
          return user;
        } else {
          return null;
        }
      },
    },
    validationErrors: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: 'ValidationError',
          fields: () => ({
            question: { type: GraphQLString },
            errors: { type: new GraphQLList(GraphQLString) },
          }),
        })
      ),
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const parentForm: Form = await Form.findById(
          parent.form,
          'fields permissions resource structure'
        );
        const ability = await extendAbilityForRecords(context.user, parentForm);
        return ability.can('update', parent);
      },
    },
  }),
});

/** GraphQL record connection type definition */
export const RecordConnectionType = Connection(RecordType);
