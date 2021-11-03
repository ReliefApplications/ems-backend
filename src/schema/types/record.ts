import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from 'graphql';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '../../models';

export const RecordType = new GraphQLObjectType({
  name: 'Record',
  fields: () => ({
    id: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    archived: { type: GraphQLBoolean },
    form: {
      type: FormType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const form = await Form.findOne(Form.accessibleBy(ability).where({ _id: parent.form }).getFilter());
        if (!form) {
          // If user is admin and can see parent application, it has access to it
          if (context.user.isAdmin && await canAccessContent(parent.form, 'read', ability)) {
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
        disableCommentFormatting: { type: GraphQLBoolean },
      },
      async resolve(parent, args) {
        if (!args.disableCommentFormatting) {
          const fields = (await Form.findById(parent.form).select('fields')).fields;
          for (const key in parent.data) {
            if (Object.prototype.hasOwnProperty.call(parent.data, key)) {
              const field = fields.find(x => x.name === key);
              if (field.type === 'comment') {
                const newKey = key.replace('_comment', '-Comment');
                parent.data[newKey] = parent.data[key];
                delete parent.data[key];
              }
            }
          }
        }
        if (args.display) {
          const source = parent.resource ? await Resource.findById(parent.resource) : await Form.findById(parent.form);
          const res = {};
          if (source) {
            for (const field of source.fields) {
              const name = field.name;
              if (parent.data[name]) {
                res[name] = parent.data[name];
                if (field.resource && field.displayField) {
                  try {
                    const record = await Record.findOne({ _id: parent.data[name], archived: { $ne: true } });
                    res[name] = record.data[field.displayField];
                  } catch {
                    res[name] = null;
                  }
                } else {
                  res[name] = parent.data[name];
                }
              } else {
                res[name] = null;
              }
            }
            return res;
          } else {
            return parent.data;
          }
        } else {
          return parent.data;
        }
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
        return User.findById(parent.createdBy.user).accessibleBy(ability, 'read');
      },
    },
  }),
});
