import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { FormType, UserType } from '.';
import { Form, Resource, User } from '@models';
import { Connection } from './pagination.type';
import getDisplayText from '@utils/form/getDisplayText';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL Draft Record type definition */
export const DraftRecordType = new GraphQLObjectType({
  name: 'DraftRecord',
  fields: () => ({
    id: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
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
  }),
});

/** GraphQL draft record connection type definition */
export const DraftRecordConnectionType = Connection(DraftRecordType);
