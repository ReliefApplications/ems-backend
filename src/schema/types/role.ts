import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Permission,
  User,
  Application,
  Channel,
  RoleRule,
  PositionAttributeCategory,
  Group,
} from '../../models';
import { ApplicationType, PermissionType, ChannelType } from '.';
import { AppAbility } from '../../security/defineAbilityFor';

/**
 * Populates a RoleRule object
 *
 * @param rules The RoleRule object
 * @returns The populated RoleRule object
 */
const populateRules = async (rules: any): Promise<RoleRule> => {
  const populatedRules: RoleRule = {
    logic: rules.logic,
    rules: [],
  };
  for (const rule of rules.rules) {
    if ('rules' in rule) {
      populatedRules.rules.push(await populateRules(rule));
    } else {
      if (rule.attribute?.category) {
        const attrCategory = await PositionAttributeCategory.findById(
          rule.attribute.category
        );

        populatedRules.rules.push({
          attribute: {
            category: attrCategory,
            value: rule.attribute.value,
            operator: rule.attribute.operator,
          },
        });
      } else {
        const group = await Group.findById(rule.group);
        populatedRules.rules.push({ group });
      }
    }
  }
  return populatedRules;
};

/** GraphQL Role type definition */
export const RoleType = new GraphQLObjectType({
  name: 'Role',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    title: {
      type: GraphQLString,
      args: {
        appendApplicationName: { type: GraphQLBoolean },
      },
      async resolve(parent, args) {
        if (args.appendApplicationName) {
          const application = await Application.findById(
            parent.application,
            'name'
          );
          return `${application.name} - ${parent.title}`;
        } else {
          return parent.title;
        }
      },
    },
    description: { type: GraphQLString },
    permissions: {
      type: new GraphQLList(PermissionType),
      resolve(parent) {
        return Permission.find().where('_id').in(parent.permissions);
      },
    },
    usersCount: {
      type: GraphQLInt,
      resolve(parent) {
        return User.find({ roles: parent.id }).count();
      },
    },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findById(parent.application).accessibleBy(
          ability,
          'read'
        );
      },
    },
    channels: {
      type: new GraphQLList(ChannelType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Channel.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.channels);
      },
    },
    rules: {
      type: new GraphQLList(GraphQLJSON),
      async resolve(parent) {
        const { rules } = parent;

        return rules.map(async (rule) => populateRules(rule));
      },
    },
  }),
});
