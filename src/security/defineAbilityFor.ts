import { AbilityBuilder, Ability, InferSubjects, AbilityClass } from '@casl/ability';
import permissions from '../const/permissions';
import { ApiConfiguration, Application, Channel, Client, Dashboard, Form, Notification, Page, Permission, Record, Resource, Role, Step, User, Version, Workflow } from '../models';
import mongoose from 'mongoose';

/*  Define types for casl usage
 */
export type Actions = 'create' | 'read' | 'update' | 'delete';
type Models = ApiConfiguration | Application | Channel | 'Channel' | Client | Dashboard | Form | Notification | Page | Permission | Record | Resource | Role | Step | User | Version | Workflow
export type Subjects = InferSubjects<Models>;

export type AppAbility = Ability<[Actions, Subjects]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

/*  Define a const for common filters on permissions
 */
function filters(type: string, user: User) {
  switch (type) {
    case 'canSee': {
      return { 'permissions.canSee': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id)) } };
    }
    case 'canCreate': {
      return { 'permissions.canCreate': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id)) } };
    }
    case 'canUpdate': {
      return { 'permissions.canUpdate': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id)) } };
    }
    case 'canDelete': {
      return { 'permissions.canDelete': { $in: user.roles.map(x => mongoose.Types.ObjectId(x._id)) } };
    }
  }
}

/*  Define abilities for the given user. Then store them and define them again only on user change.
 *  Define document users can create, read, update and delete.
 */
export default function defineAbilitiesFor(user: User): AppAbility {
  const { can, cannot, rules } = new AbilityBuilder(AppAbility);
  const userPermissionsTypes: string[] = user ? user.roles ? user.roles.flatMap(x=> x.permissions.filter(y => y.global).map(z => z.type)) : [] : [];

  /* ===
    Access of applications
  === */
  if (userPermissionsTypes.includes(permissions.canSeeApplications)) {
    can('read', 'Application');
  } else {
    can('read', 'Application', { '_id': { $in: user.roles.map(x => mongoose.Types.ObjectId(x.application)) } });
    can('read', 'Application', filters('canSee', user));
    cannot('read', 'Application', { status: { $ne: 'active' }});
  }

  /* ===
    Creation / Access / Edition / Deletion of applications
  === */
  if (userPermissionsTypes.includes(permissions.canManageApplications)) {
    can(['read', 'create', 'update', 'delete'], ['Application', 'Dashboard', 'Channel', 'Page', 'Step', 'Workflow']);
  } else {
    // TODO: check
    can('read', ['Application', 'Page', 'Step'], filters('canSee', user));
    can('update', ['Application', 'Page', 'Step'], filters('canUpdate', user));
    can('delete', ['Application', 'Page', 'Step'], filters('canDelete', user));
  }

  /* ===
    Access of clients
  === */
  can('read', 'Client');
  can('update', 'Client');
  can('delete', 'Client');

  /* ===
    Access of forms
  === */
  if (userPermissionsTypes.includes(permissions.canSeeForms)) {
    can('read', 'Form');
  } else {
    if (user.roles.some(x => !x.application)) {
      can('read', 'Form', filters('canSee', user));
    } else {
      can('read', 'Form');
    }
  }

  /* ===
    Creation / Edition / Deletion of forms
  === */
  if (userPermissionsTypes.includes(permissions.canManageForms)) {
    can(['create', 'update', 'delete'], 'Form');
    can(['create', 'read', 'update', 'delete'], 'Record');
  } else {
    can('update', 'Form', filters('canUpdate', user));
    can('delete', 'Form', filters('canDelete', user));
  }

  /* ===
    Access of resources
  === */
  if (userPermissionsTypes.includes(permissions.canSeeResources)) {
    can('read', 'Resource');
  } else {
    if (user.roles.some(x => !x.application)) {
      can('read', 'Resource', filters('canSee', user));
    } else {
      can('read', 'Resource');
    }
  }

  /* ===
    Creation / Edition / Deletion of resources
  === */
  if (userPermissionsTypes.includes(permissions.canManageResources)) {
    can(['create', 'update', 'delete'], 'Resource');
    can(['create', 'read', 'update', 'delete'], 'Record');
  } else {
    can('update', 'Resource', filters('canUpdate', user));
    can('delete', 'Resource', filters('canDelete', user));
  }

  /* ===
    Creation / Access / Edition / Deletion of roles
  === */
  if (userPermissionsTypes.includes(permissions.canSeeRoles)) {
    can(['create', 'read', 'update', 'delete'], 'Role');
  } else {
    const applications = [];
    user.roles.map(role => {
      if (role.application) {
        if (role.permissions.some(perm => perm.type === permissions.canSeeRoles)) {
          applications.push(mongoose.Types.ObjectId(role.application));
        }
      }
    });
    can(['create', 'read', 'update', 'delete'], 'Role', { application: applications });
    // can(['create', 'read', 'update', 'delete'], 'Application', ['roles'], { '_id': { $in: applications } });
  }

  /* ===
    Creation / Access / Edition / Deletion of users
  === */
  if (userPermissionsTypes.includes(permissions.canSeeUsers)) {
    can(['create', 'read', 'update', 'delete'], 'User');
  } else {
    const applications = [];
    user.roles.map(role => {
      if (role.application) {
        if (role.permissions.some(perm => perm.type === permissions.canSeeUsers)) {
          applications.push(mongoose.Types.ObjectId(role.application));
        }
      }
    });
    can(['create', 'read', 'update', 'delete'], 'User', { application: applications });
  }

  /* ===
    Access / Edition of notifications
  === */
  can(['read', 'update'], 'Notification', {
    channel: { $in: user.roles.map(role => role.channels.map(x => mongoose.Types.ObjectId(x._id))).flat()},
    seenBy: { $ne: user.id }
  });

  /* ===
    Creation / Access / Edition / Deletion of API configurations
  === */
  if (userPermissionsTypes.includes(permissions.canManageApiConfigurations)) {
    can(['create', 'read', 'update', 'delete'], 'ApiConfiguration');
  } else {
    can('read', 'ApiConfiguration', filters('canSee', user));
    can('update', 'ApiConfiguration', filters('canUpdate', user));
    can('delete', 'ApiConfiguration', filters('canDelete', user));
  }

  return new Ability(rules);
}