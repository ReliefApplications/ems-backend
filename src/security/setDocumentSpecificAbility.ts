import { User } from '../models';
import mongoose from 'mongoose';
import { Actions, Subjects } from './defineAbilityFor';

/**
 * Uses permissions field to set ability for the given document.
 *  There are three cases :
 *  - Role and attributes are given so the user must have this specific role and all the attributes
 *  - Only attributes are given so the user lust have all of them no matter of his roles
 *  - Only role is given so the user must have it no matter of his attributes
 *
 * @param can method to test ability of user
 * @param user user to test
 * @param actions actions to perform
 * @param subject ability subject
 */
export function setDocumentSpecificAbility(
  can,
  user: User,
  actions: Actions[],
  subject: Subjects[]
) {
  for (const action of actions) {
    let permissionKey: string;
    switch (action.toString()) {
      case 'read': {
        permissionKey = 'permissions.canSee';
        break;
      }
      case 'update': {
        permissionKey = 'permission.canUpdate';
        break;
      }
      case 'delete': {
        permissionKey = 'permission.canDelete';
        break;
      }
      default: {
        break;
      }
    }
    const filters = [
      {
        $elemMatch: {
          role: { $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)) },
          attributes: user.positionAttributes.map((x) =>
            mongoose.Types.ObjectId(x.value)
          ),
        },
      },
      {
        $elemMatch: {
          role: null,
          attributes: user.positionAttributes.map((x) =>
            mongoose.Types.ObjectId(x.value)
          ),
        },
      },
      {
        $elemMatch: {
          role: { $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)) },
          attributes: { $size: 0 },
        },
      },
    ];
    for (const filter of filters) {
      const condition = {};
      condition[permissionKey] = filter;
      can(action, subject, condition);
    }
  }
}
