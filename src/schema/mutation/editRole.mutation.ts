import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { get, has, isEqual } from 'lodash';
import { Role } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorCode, getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the editRole mutation */
type EditRoleArgs = {
  id: string | Types.ObjectId;
  permissions?: string[] | Types.ObjectId[];
  channels?: string[] | Types.ObjectId[];
  title?: string;
  description?: string;
  autoAssignment?: any;
};

/**
 * Removes transient query-builder controls before comparing assignment rules.
 *
 * @param value rule value to normalize
 * @returns normalized rule value
 */
const normalizeAutoAssignmentRule = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeAutoAssignmentRule);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (rule, [key, item]) => {
        if (key !== 'inTheLast') {
          rule[key] = normalizeAutoAssignmentRule(item);
        }
        return rule;
      },
      {}
    );
  }
  return value;
};

/**
 * Edit a role's admin permissions, providing its id and the list of admin permissions.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RoleType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    permissions: { type: new GraphQLList(GraphQLID) },
    channels: { type: new GraphQLList(GraphQLID) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    autoAssignment: {
      type: GraphQLJSON,
    },
  },
  async resolve(_parent: unknown, args: EditRoleArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const autoAssignmentUpdate: any = {};
      if (args.autoAssignment) {
        if (has(args.autoAssignment, 'add')) {
          Object.assign(autoAssignmentUpdate, {
            $addToSet: {
              autoAssignment: normalizeAutoAssignmentRule(
                get(args.autoAssignment, 'add')
              ),
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
        args.description && { description: args.description }
      );

      const filters = Role.find(accessibleBy(ability, 'update').Role)
        .where({ _id: args.id })
        .getFilter();

      // Save operations. Adding try / catch to detect duplication issues.
      try {
        if (has(args.autoAssignment, 'remove')) {
          const role = await Role.findOne(filters).select('autoAssignment');
          if (!role) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
          const ruleToRemove = role.autoAssignment.find((rule) =>
            isEqual(
              normalizeAutoAssignmentRule(rule),
              normalizeAutoAssignmentRule(get(args.autoAssignment, 'remove'))
            )
          );
          if (ruleToRemove) {
            Object.assign(autoAssignmentUpdate, {
              $pull: { autoAssignment: ruleToRemove },
            });
            Object.assign(update, { $pull: autoAssignmentUpdate.$pull });
          }
        }

        // doing a separate update to avoid the following error:
        // Updating the path 'x' would create a conflict at 'x'
        if (autoAssignmentUpdate.$addToSet) {
          await Role.findOneAndUpdate(filters, {
            $addToSet: autoAssignmentUpdate.$addToSet,
          });
        }

        await Role.findOneAndUpdate(filters, update, { new: true });
        const role = await Role.findOneAndUpdate(
          filters,
          { $pull: { autoAssignment: null } },
          { new: true }
        );
        if (!role) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        return role;
      } catch (error) {
        // Detect duplication error
        if (getErrorCode(error) === 11000) {
          throw new GraphQLError('Role with this name already exists.');
        } else {
          throw error;
        }
      }
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
