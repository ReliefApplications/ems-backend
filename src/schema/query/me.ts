import { GraphQLError } from 'graphql';
import { User, Role } from '../../models';
import { UserType } from '../types';

/**
 * Checks if the user satisfies the given rule.
 *
 * @param user The user to check if satisfies the rule
 * @param r The rule to check against the user
 * @returns If the user satisfies the rule
 */
const satisfiesRule = (user: User, r: any) => {
  const op = r.logic === 'and' ? 'every' : 'some';
  return r.rules[op]((rule) => {
    if (rule.attribute?.category) {
      const attr = user.positionAttributes.find((a) =>
        a.category.equals(rule.attribute.category)
      );
      if (!attr) {
        return false;
      }
      const operator:
        | 'eq'
        | 'neq'
        | 'contains'
        | 'doesnotcontain'
        | 'startswith'
        | 'endswith'
        | 'isnull'
        | 'isnotnull'
        | 'isempty'
        | 'isnotempty' = rule.attribute.operator;

      switch (operator) {
        case 'eq':
          return attr.value === rule.attribute.value;
        case 'neq':
          return attr.value !== rule.attribute.value;
        case 'contains':
          return attr.value.includes(rule.attribute.value);
        case 'doesnotcontain':
          return !attr.value.includes(rule.attribute.value);
        case 'startswith':
          return attr.value.startsWith(rule.attribute.value);
        case 'endswith':
          return attr.value.endsWith(rule.attribute.value);
        case 'isnull':
          return attr.value === null;
        case 'isnotnull':
          return attr.value !== null;
        case 'isempty':
          return attr.value === '';
        case 'isnotempty':
          return attr.value !== '';
      }
    } else if (rule.group?.id) {
      return user.groups.some((g) => g.equals(rule.group));
    } else return satisfiesRule(user, rule);
  });
};

/**
 * Calculate roles based on role rules.
 * Returns user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  async resolve(parent, args, context) {
    const u = context.user;
    if (u) {
      // Calculate roles
      const user = await User.findById(u.id);
      const roles = await Role.find();
      const autoRoles: any[] = [];

      /* For each of the roles, if user doesn't have a role yet,
       and satisfies the rule, add the role to the autoRoles array */
      for (const role of roles)
        if (
          !user.roles.find((r) => r._id.equals(role._id)) &&
          role.rules.some((r) => satisfiesRule(u, r))
        )
          autoRoles.push(role._id);

      return User.findByIdAndUpdate(u.id, { autoRoles });
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
