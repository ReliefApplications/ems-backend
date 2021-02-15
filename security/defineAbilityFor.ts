import { AbilityBuilder, Ability, InferSubjects, AbilityClass } from '@casl/ability'
import permissions from '../const/permissions';
import { Application, Channel, Dashboard, Form, Notification, Page, Permission, Record, Resource, Role, Step, User, Version, Workflow } from '../models';
import checkPermission from '../utils/checkPermission';
import mongoose from 'mongoose';

type Actions = 'create' | 'read' | 'update' | 'delete';
type Models = Application | Channel | 'Channel' | Dashboard | Form | Notification | Page | Permission | Record | Resource | Role | Step | User | Version | Workflow 
type Subjects = InferSubjects<Models>;

type AppAbility = Ability<[Actions, Subjects]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

/*  Define abilities for the given user.
 *  Define document users can create, read, update and delete.
 */
export default function defineAbilitiesFor(user: User): AppAbility {
  const { can, cannot, rules } = new AbilityBuilder(AppAbility);

  if (checkPermission(user, permissions.canSeeApplications)) {
    can('read', 'Application');
  } else {
    const filters = {
      'permissions.canSee': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id))}
  };
    can('read', 'Application', filters);
  }
  return new Ability(rules);
};
