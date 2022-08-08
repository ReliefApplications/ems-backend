import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import { Role } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { RoleType } from '../types';
import { Types } from 'mongoose';

/**
 * Parses the rules from the input to the format it is stored in the database
 *
 * @param rules The rules to parse
 * @returns The parsed rules
 */
const parseRules = (rules: any): any => {
  const parsedRules: any = {
    logic: rules.logic,
    rules: [],
  };
  for (const rule of rules.rules) {
    if ('rules' in rule) {
      parsedRules.rules.push(parseRules(rule));
    } else {
      if (rule.attribute?.category) {
        parsedRules.rules.push({
          attribute: {
            category: new Types.ObjectId(
              rule.attribute.category.id || rule.attribute.category._id
            ),
            value: rule.attribute.value,
            operator: rule.attribute.operator,
          },
        });
      } else {
        parsedRules.rules.push({
          group: new Types.ObjectId(rule.group.id || rule.group._id),
        });
      }
    }
  }
  return parsedRules;
};

/**
 * Edits a role's admin permissions, providing its id and the list of admin permissions.
 * Throws an error if not logged or authorized.
 */
export default {
  type: RoleType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    permissions: { type: new GraphQLList(GraphQLID) },
    channels: { type: new GraphQLList(GraphQLID) },
    rules: { type: GraphQLJSON },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ruleUpdate: any = {};
    if (args.rules) {
      const rules = args.rules;
      if (rules.add) {
        const pushRules = rules.add.map(parseRules);
        if (ruleUpdate.$addToSet)
          Object.assign(ruleUpdate.$addToSet, {
            rules: { $each: pushRules },
          });
        else
          Object.assign(ruleUpdate, {
            $addToSet: {
              rules: { $each: pushRules },
            },
          });
      }
      if (rules.remove) {
        const pullRules = rules.remove.map(parseRules);
        if (ruleUpdate.$pull)
          Object.assign(ruleUpdate.$pull, {
            rules: { $in: pullRules },
          });
        else
          Object.assign(ruleUpdate, {
            $pull: {
              rules: { $in: pullRules },
            },
          });
      }
    }

    const ability: AppAbility = context.user.ability;
    const update = {};
    Object.assign(
      update,
      args.permissions && { permissions: args.permissions },
      args.channels && { channels: args.channels },
      args.title && { title: args.title },
      args.description && { description: args.description },
      ruleUpdate.$pull && { $pull: ruleUpdate.$pull }
    );
    const filters = Role.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();

    // doing a separate update to avoid the following error:
    // Updating the path 'x' would create a conflict at 'x'
    if (ruleUpdate.$addToSet) {
      await Role.findOneAndUpdate(filters, { $addToSet: ruleUpdate.$addToSet });
    }

    const role = await Role.findOneAndUpdate(filters, update, { new: true });
    if (!role) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return role;
  },
};
