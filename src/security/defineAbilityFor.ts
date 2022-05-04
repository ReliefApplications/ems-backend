import {
  AbilityBuilder,
  Ability,
  InferSubjects,
  AbilityClass,
} from '@casl/ability';
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
  Step,
  User,
  Version,
  Workflow,
  PullJob,
} from '../models';
import mongoose from 'mongoose';

/*  Define types for casl usage
 */
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
type Models =
  | ApiConfiguration
  | Application
  | Channel
  | 'Channel'
  | Dashboard
  | Form
  | Notification
  | Page
  | Permission
  | PullJob
  | Record
  | Resource
  | Role
  | Step
  | User
  | Version
  | Workflow;
export type Subjects = InferSubjects<Models>;

export type AppAbility = Ability<[Actions, Subjects]>;
const appAbility = Ability as AbilityClass<AppAbility>;

/*  Define a const for common filters on permissions
 */
/**
 * Gets Mongo filters for ability test.
 *
 * @param type permission type
 * @param user user to get ability of
 * @returns mongo filters from type of permission required
 */
function filters(type: string, user: User | Client) {
  switch (type) {
    case 'canSee': {
      return {
        'permissions.canSee': {
          $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)),
        },
      };
    }
    case 'canUpdate': {
      return {
        'permissions.canUpdate': {
          $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)),
        },
      };
    }
    case 'canDelete': {
      return {
        'permissions.canDelete': {
          $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)),
        },
      };
    }
  }
}

/**
 * Defines abilities for the given user. Then store them and define them again only on user change.
 * Defines document users can create, read, update and delete.
 *
 * @param user user to get ability of
 * @returns ability definition of the user
 */
export default function defineAbilitiesFor(user: User | Client): AppAbility {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { can, cannot, rules } = new AbilityBuilder(appAbility);
  const userPermissionsTypes: string[] = user
    ? user.roles
      ? user.roles.flatMap((x) =>
          x.permissions.filter((y) => y.global).map((z) => z.type)
        )
      : []
    : [];

  /* ===
    Access of applications
  === */
  if (userPermissionsTypes.includes(permissions.canSeeApplications)) {
    can('read', [
      'Application',
      'Dashboard',
      'Channel',
      'Page',
      'Step',
      'Workflow',
    ]);
  } else {
    can('read', 'Application', {
      _id: {
        $in: user.roles.map((x) => mongoose.Types.ObjectId(x.application)),
      },
      status: 'active',
    });
    can('read', 'Application', filters('canSee', user));
  }

  /* ===
    Creation of applications
  === */
  if (userPermissionsTypes.includes(permissions.canCreateApplications)) {
    can('create', 'Application');
  }

  /* ===
    Creation / Access / Edition / Deletion of applications
  === */
  if (userPermissionsTypes.includes(permissions.canManageApplications)) {
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
  if (userPermissionsTypes.includes(permissions.canSeeForms)) {
    can('read', 'Form');
    can('read', 'Record');
  } else {
    if (user.roles.some((x) => !x.application)) {
      can('read', 'Form', filters('canSee', user));
    } else {
      can('read', 'Form');
    }
  }

  /* ===
    Creation of forms
  === */
  if (userPermissionsTypes.includes(permissions.canCreateForms)) {
    can(['create'], 'Form');
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
    can('read', 'Record');
  } else {
    if (user.roles.some((x) => !x.application)) {
      can('read', 'Resource', filters('canSee', user));
    } else {
      can('read', 'Resource');
    }
  }

  /* ===
    Creation of resources
  === */
  if (userPermissionsTypes.includes(permissions.canCreateResources)) {
    can(['create'], 'Resource');
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
    can(['create', 'read', 'update', 'delete'], ['Role', 'Channel']);
  } else {
    // Add applications permissions on roles access
    const applications = [];
    user.roles.map((role) => {
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
      _id: { $in: user.roles.map((x) => mongoose.Types.ObjectId(x._id)) },
    });
  }

  /* ===
    Creation / Access / Edition / Deletion of users
  === */
  if (userPermissionsTypes.includes(permissions.canSeeUsers)) {
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
    Creation / Access / Edition / Deletion of API configurations
  === */
  if (userPermissionsTypes.includes(permissions.canManageApiConfigurations)) {
    can(
      ['create', 'read', 'update', 'delete'],
      ['ApiConfiguration', 'PullJob']
    );
  } else {
    can('read', 'ApiConfiguration', filters('canSee', user));
    can('update', 'ApiConfiguration', filters('canUpdate', user));
    can('delete', 'ApiConfiguration', filters('canDelete', user));
  }

  return new Ability(rules);
}
