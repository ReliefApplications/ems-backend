import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } from 'graphql';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType, VersionType } from '.';
import { Form, Resource, Record, Version, User } from '../../models';
import { CustomAPI } from '../../server/apollo/dataSources';

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
        showTextChoices: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        if (args.display || args.showTextChoices) {
          const source = parent.resource ? await Resource.findById(parent.resource) : await Form.findById(parent.form);
          if (source) {
            const res = {};
            for (const field of source.fields) {
              const name = field.name;
              if (parent.data[name]) {
                res[name] = parent.data[name];
                // Get the display field from the linked record if any
                if (args.display && field.resource && field.displayField) {
                  try {
                    const record = await Record.findOne({ _id: parent.data[name], archived: { $ne: true } });
                    res[name] = record.data[field.displayField];
                  } catch {
                    res[name] = null;
                  }
                }
                // Get the text instead of the value for choices, fetch it if needed.
                if (args.showTextChoices && (field.choices || field.choicesByUrl)) {
                  let choices: any[] = field.choices;
                  if (field.choicesByUrl) {
                    const url: string = field.choicesByUrl.url;
                    if (url.includes('http://localhost:3000/') || url.includes('{SAFE_API}')) {
                      const safeURL: string = url.includes('http://localhost:3000/') ? 'http://localhost:3000/' : '{SAFE_API}';
                      const endpointArray: string[] = url.substring(url.indexOf(safeURL) + safeURL.length).split('/');
                      const apiName: string = endpointArray.shift();
                      const endpoint: string = endpointArray.join('/');
                      const dataSource: CustomAPI = context.dataSources[apiName];
                      if (dataSource) {
                        choices = await dataSource.getChoices(endpoint, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
                      }
                    } else {
                      const dataSource: CustomAPI = context.dataSources._rest;
                      choices = await dataSource.getChoices(url, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
                    }
                  }
                  if (choices && choices.length) {
                    const choice = choices.find(x => x.value ? x.value === res[name] : x === res[name]);
                    if (choice && choice.text) {
                      res[name] = choice.text;
                    }
                  }
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
        return User.findById(parent.createdBy.user).accessibleBy(ability, 'read');
      },
    },
    modifiedBy: {
      type: UserType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (parent.versions.length > 0) {
          const lastVersion = await Version.findOneAndDelete().where('_id').in(parent.versions).sort({ createdAt: -1 }).limit(1);
          if (lastVersion) {
            return User.findById(lastVersion.createdBy).accessibleBy(ability, 'read');
          } else {
            // if no version yet, the last modifier is the creator
            return User.findById(parent.createdBy.user).accessibleBy(ability, 'read');
          }
        } else {
          return null;
        }
      },
    },
  }),
});
