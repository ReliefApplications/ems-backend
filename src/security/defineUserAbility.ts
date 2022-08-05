import mongoose from 'mongoose';
import {
  AbilityBuilder,
  Ability,
  InferSubjects,
  AbilityClass,
  MongoQuery,
  buildMongoQueryMatcher,
} from '@casl/ability';
import { $or, or, $and, and } from '@ucast/mongo2js';
import permissions from '../const/permissions';
import {
  ApiConfiguration,
  Application,
  Channel,
  Client,
  Dashboard,
  Form,
  Notification,
  Page,
  Permission,
  Record,
  Resource,
  Role,
  Setting,
  Step,
  User,
  Version,
  Workflow,
  PullJob,
  ReferenceData,
} from '../models';

/** Define available permissions on objects */
export type ObjectPermissions = keyof (ApiConfiguration['permissions'] &
  Application['permissions'] &
  Form['permissions'] &
  Page['permissions'] &
  ReferenceData['permissions'] &
  Resource['permissions'] &
  Step['permissions']);

/** Define actions types for casl */
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

/** Define subjects types for casl */
type Models =
  | ApiConfiguration
  | Application
  | Channel
  | Dashboard
  | Form
  | Notification
  | Page
  | Permission
  | PullJob
  | Record
  | ReferenceData
  | Resource
  | Role
  | Setting
  | Step
  | User
  | Version
  | Workflow;
export type Subjects = InferSubjects<Models>;

export type AppAbility = Ability<[Actions, Subjects]>;

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/** Add support for $or and $and operators in filters */
export const conditionsMatcher = buildMongoQueryMatcher(
  { $or, $and },
  { or, and }
);

/**
 * Gets Mongo filters for testing if a user has a role registered
 * inside a permission type of an object.
 *
 * @param type permission type
 * @param user user to get ability of
 * @param prefix The prefix to add to get the object with permissions
 * @returns mongo filters from type of permission required
 */
function filters(
  type: ObjectPermissions,
  user: User | Client,
  prefix?: string
): MongoQuery {
  const key = prefix ? `${prefix}.permissions.${type}` : `permissions.${type}`;
  return {
    [key]: { $in: user.roles?.map((role) => role._id) },
  };
}

/**
 * Defines abilities for the given user. Then store them and define them again only on user change.
 * Defines document users can create, read, update and delete.
 *
 * @param user user to get ability of
 * @returns ability definition of the user
 */
export default function defineUserAbility(user: User | Client): AppAbility {
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  const userGlobalPermissions: string[] =
    user?.roles?.flatMap((role: Role) =>
      role.permissions.filter((p) => p.global).map((p) => p.type)
    ) || [];

  /* ===
    Access of applications
  === */
  if (userGlobalPermissions.includes(permissions.canSeeApplications)) {
    can('read', [
      'Application',
      'Channel',
      'Dashboard',
      'Page',
      'Step',
      'Workflow',
    ]);
  } else {
    can('read', 'Application', {
      _id: {
        $in: user.roles.map((role: Role) => role.application),
      },
      status: 'active',
    });
    can('read', 'Application', filters('canSee', user));
  }

  /* ===
    Creation of applications
  === */
  if (userGlobalPermissions.includes(permissions.canCreateApplications)) {
    can('create', 'Application');
  }

  /* ===
    Creation / Access / Edition / Deletion of applications
  === */
  if (userGlobalPermissions.includes(permissions.canManageApplications)) {
    can(
      ['read', 'create', 'update', 'delete', 'manage'],
      ['Application', 'Dashboard', 'Channel', 'Page', 'Step', 'Workflow']
    );
  } else {
    // TODO: check
    can('read', ['Application', 'Page', 'Step'], filters('canSee', user));
    can('update', ['Application', 'Page', 'Step'], filters('canUpdate', user));
    can('delete', ['Application', 'Page', 'Step'], filters('canDelete', user));
  }

  /* ===
    Access of forms
  === */
  if (userGlobalPermissions.includes(permissions.canSeeForms)) {
    can('read', ['Form', 'Record']);
  } else {
    can('read', 'Form', filters('canSee', user));
  }

  /* ===
    Creation of forms
  === */
  if (userGlobalPermissions.includes(permissions.canCreateForms)) {
    can(['create'], 'Form');
  }

  /* ===
    Creation / Edition / Deletion of forms
  === */
  if (userGlobalPermissions.includes(permissions.canManageForms)) {
    can(['create', 'read', 'update', 'delete'], ['Form', 'Record']);
  } else {
    can('update', 'Form', filters('canUpdate', user));
    can('delete', 'Form', filters('canDelete', user));
  }

  /* ===
    Access of resources
  === */
  if (userGlobalPermissions.includes(permissions.canSeeResources)) {
    can('read', ['Resource', 'Record']);
  } else {
    can('read', 'Resource', filters('canSee', user));
  }

  /* ===
    Creation of resources
  === */
  if (userGlobalPermissions.includes(permissions.canCreateResources)) {
    can(['create'], 'Resource');
  }

  /* ===
    Creation / Edition / Deletion of resources
  === */
  if (userGlobalPermissions.includes(permissions.canManageResources)) {
    can(['create', 'read', 'update', 'delete'], ['Resource', 'Record']);
  } else {
    can('update', 'Resource', filters('canUpdate', user));
    can('delete', 'Resource', filters('canDelete', user));
  }

  /* ===
    Creation / Access / Edition / Deletion of roles
  === */
  if (userGlobalPermissions.includes(permissions.canSeeRoles)) {
    can(['create', 'read', 'update', 'delete'], ['Role', 'Channel']);
  } else {
    // Add applications permissions on roles access
    const applications = [];
    user.roles.map((role: Role) => {
      if (role.application) {
        if (
          role.permissions.some((perm) => perm.type === permissions.canSeeRoles)
        ) {
          applications.push(mongoose.Types.ObjectId(role.application));
        }
      }
    });
    can(['create', 'read', 'update', 'delete'], ['Role', 'Channel'], {
      application: applications,
    });
    // Add read access to logged user's roles
    can('read', 'Role', {
      _id: { $in: user.roles.map((role: Role) => role._id) },
    });
  }

  /* ===
    Creation / Access / Edition / Deletion of users
  === */
  if (userGlobalPermissions.includes(permissions.canSeeUsers)) {
    can(['create', 'read', 'update', 'delete'], 'User');
  } else {
    can('read', 'User');
    // const applications = [];
    // user.roles.map(role => {
    //   if (role.application) {
    //     if (role.permissions.some(perm => perm.type === permissions.canSeeUsers)) {
    //       applications.push(mongoose.Types.ObjectId(role.application));
    //     }
    //   }
    // });
    // can(['create', 'read', 'update', 'delete'], 'User', { 'roles.application': applications });
  }

  /* ===
    Access / Edition of notifications
  === */
  can(['read', 'update'], 'Notification', {
    channel: {
      $in: user.roles
        .map((role) =>
          role.channels
            ? role.channels.map((x) => mongoose.Types.ObjectId(x._id))
            : []
        )
        .flat(),
    },
    seenBy: { $ne: user.id },
  });

  /* ===
    Creation / Access / Edition / Deletion of API configurations, PullJobs and ReferenceData
  === */
  if (userGlobalPermissions.includes(permissions.canManageApiConfigurations)) {
    can(
      ['create', 'read', 'update', 'delete'],
      ['ApiConfiguration', 'PullJob', 'ReferenceData']
    );
  } else {
    can('read', 'ApiConfiguration', filters('canSee', user));
    can('update', 'ApiConfiguration', filters('canUpdate', user));
    can('delete', 'ApiConfiguration', filters('canDelete', user));
    can('read', 'ReferenceData', filters('canSee', user));
    can('update', 'ReferenceData', filters('canUpdate', user));
    can('delete', 'ReferenceData', filters('canDelete', user));
  }

  /* ===
    Access / Edition of settings
  === */
  if (
    userGlobalPermissions.includes(permissions.canSeeUsers) &&
    userGlobalPermissions.includes(permissions.canSeeRoles)
  ) {
    can(['read', 'update'], 'Setting');
  } else {
    can('read', 'Setting');
  }

  return abilityBuilder.build({ conditionsMatcher });
}
