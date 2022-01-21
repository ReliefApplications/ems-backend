import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '../../models';
import { Connection } from './pagination';
import getDisplayText from '../../utils/form/getDisplayText';

export const RecordType = new GraphQLObjectType({
  name: 'Record',
  fields: () => ({
    id: { type: GraphQLID },
    incrementalId: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    archived: { type: GraphQLBoolean },
    form: {
      type: FormType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const form = await Form.findOne(
          Form.accessibleBy(ability).where({ _id: parent.form }).getFilter()
        );
        if (!form) {
          // If user is admin and can see parent application, it has access to it
          if (
            context.user.isAdmin &&
            (await canAccessContent(parent.form, 'read', ability))
          ) {
            return Form.findById(parent.form);
          }
        } else {
          return form;
        }
      },
    },
    data: {
      type: GraphQLJSON,
      args: {
        display: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        if (args.display) {
          const source = parent.resource
            ? await Resource.findById(parent.resource)
            : await Form.findById(parent.form);
          if (source) {
            const res = {};
            for (const field of source.fields) {
              const name = field.name;
              if (parent.data[name]) {
                res[name] = parent.data[name];
                // Get the display field from the linked record if any
                if (field.resource && field.displayField) {
                  try {
                    const record = await Record.findOne({
                      _id: parent.data[name],
                      archived: { $ne: true },
                    });
                    res[name] = record.data[field.displayField];
                  } catch {
                    res[name] = null;
                  }
                }
                // Get the text instead of the value for choices, fetch it if needed.
                if (field.choices || field.choicesByUrl) {
                  res[name] = await getDisplayText(
                    field,
                    parent.data[name],
                    context
                  );
                }
              } else {
                res[name] = null;
              }
            }
            return res;
          }
        }
        return parent.data;
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      resolve(parent) {
        return Version.find().where('_id').in(parent.versions);
      },
    },
    createdBy: {
      type: UserType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return User.findById(parent.createdBy.user).accessibleBy(
          ability,
          'read'
        );
      },
    },
    modifiedBy: {
      type: UserType,
      async resolve(parent) {
        if (parent.versions && parent.versions.length > 0) {
          const lastVersion = await Version.findById(parent.versions.pop());
          if (lastVersion) {
            return User.findById(lastVersion.createdBy);
          }
        }
        if (parent.createdBy && parent.createdBy.user) {
          // if no version yet, the last modifier is the creator
          return User.findById(parent.createdBy.user);
        } else {
          return null;
        }
      },
    },
  }),
});

export const RecordConnectionType = Connection(RecordType);
