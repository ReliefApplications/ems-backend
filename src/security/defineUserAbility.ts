import mongoose from 'mongoose';
import { get } from 'lodash';
import {
  AbilityBuilder,
  Ability,
  InferSubjects,
  AbilityClass,
  MongoQuery,
  buildMongoQueryMatcher,
} from '@casl/ability';
import { $or, or, $and, and } from '@ucast/mongo2js';
import permissions from '@const/permissions';
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
  Step,
  User,
  Version,
  Workflow,
  PullJob,
  ReferenceData,
  Group,
  Template,
  DistributionList,
  CustomNotification,
} from '@models';

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
  | DistributionList
  | Form
  | Notification
  | Page
  | Permission
  | PullJob
  | Record
  | ReferenceData
  | Resource
  | Role
  | Group
  | Step
  | Template
  | User
  | Version
  | Workflow
  | CustomNotification;
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
 * @param options options of filters method
 * @param options.prefix The prefix to add to get the object with permissions
 * @param options.suffix The suffix to add to get the object with permissions
 * @returns mongo filters from type of permission required
 */
function filters(
  type: ObjectPermissions,
  user: User | Client,
  options?: {
    prefix?: string;
    suffix?: string;
  }
): MongoQuery {
  const prefix = options?.prefix ? `${options.prefix}.` : '';
  const suffix = options?.suffix ? `.${options.suffix}` : '';
  const key = `${prefix}permissions.${type}${suffix}`;
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
    // can read if user has one of the role of the application
    can('read', 'Application', {
      _id: {
        $in: user.roles.map((role: Role) => role.application),
      },
      status: 'active',
    });
    // can read if the user has permission canSee on the object
    can('read', ['Application', 'Page', 'Step'], filters('canSee', user));
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
      [
        'Application',
        'Dashboard',
        'Channel',
        'Page',
        'Step',
        'Workflow',
        'Template',
        'DistributionList',
        'CustomNotification',
      ]
    );
  } else {
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
    can('read', 'Form', filters('canSeeRecords', user, { suffix: 'role' }));
    can('read', 'Form', filters('canCreateRecords', user, { suffix: 'role' }));
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
    can('manage', 'Record');
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
    can('read', 'Resource', filters('canSeeRecords', user, { suffix: 'role' }));
    can(
      'read',
      'Resource',
      filters('canCreateRecords', user, { suffix: 'role' })
    );
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
    can('manage', 'Record');
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
    Creation / Access / Edition / Deletion of groups
  === */
  if (userGlobalPermissions.includes(permissions.canSeeGroups)) {
    can(['create', 'read', 'update', 'delete'], 'Group');
    // Add read access to logged user's groups
    can('read', 'Group', {
      _id: { $in: get(user, 'groups', []).map((group: Group) => group._id) },
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
    seenBy: { $ne: user._id },
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

  return abilityBuilder.build({ conditionsMatcher });
}
