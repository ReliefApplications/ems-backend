import { Types } from 'mongoose';
import { Application, Page, Resource, Role, Record, Channel } from '@models';
import { duplicatePage } from '@services/page.service';
import { copyFolder } from '@utils/files/copyFolder';

/** The ID of the app that will cloned for each structure */
const BASE_APP_ID = new Types.ObjectId('64dec0ab3fb2a1f0738dfa85');

/** The ID of the worker user */
const WORKER_ID = new Types.ObjectId('651b61b82313350f9e79c772');

/** The ID for the super admin role */
const SUPER_ADMIN_ROLE_ID = new Types.ObjectId('64934ecc859314002ab554aa');

/** Application page id map */
const APPLICATION_PAGES = [
  {
    page: 'home',
    id: '6511b4428e4cb3d8a3f2ae95',
  },
  {
    page: 'profile',
    id: '6514f289b142af3432b462a6',
  },
  {
    page: 'structure_wf',
    id: '64eccda0ce4e9e591c67c3ae',
  },
  {
    page: 'existing_families',
    id: '64e2dea97e04114a27ed18a1',
  },
  {
    page: 'family_wf',
    id: '64df7fc915ea987a144ac804',
  },
  {
    page: 'emergency',
    id: '64f14f7f2a0ef630b33a4473',
  },
  {
    page: 'transfer',
    id: '651ec21173365d9cf2b6ef25',
  },
  {
    page: 'stats',
    id: '64fadb750ab329275ef43572',
  },
  {
    page: 'library',
    id: '64ecce68ce4e9e15ab67c7d8',
  },
] as const;

/** Role names */
const ROLE_PERMISSIONS_MAP = {
  'administrateur (chef de structure)': [
    new Types.ObjectId('64934ecc859314002ab554a0'),
    new Types.ObjectId('64934ecc859314002ab5549e'),
    new Types.ObjectId('64a6eba2a20927002a1e9c63'),
  ],
  utilisateur: [new Types.ObjectId('64a6eba2a20927002a1e9c63')],
  'utilisateur plus': [new Types.ObjectId('64a6eba2a20927002a1e9c63')],
};

/** Original roles IDs */
const ROLE_ID_MAP = {
  admin: new Types.ObjectId('6511573d8e4cb3d8a3f22a72'),
  user: new Types.ObjectId('6511574c8e4cb3d8a3f22a82'),
  userPlus: new Types.ObjectId('651157468e4cb3d8a3f22a7a'),
};

/**
 * Gets the permissions of a resource for a list of roles
 *
 * @param roles List of roles
 * @param structureID ID of the structure
 * @param structureName Name of the structure
 * @returns The permissions of the resource for the roles
 */
const getResourcesPermissions = (
  roles: Role[],
  structureID: string,
  structureName: string
) => {
  const [adminRole, userRole, userPlusRole] = roles.map(
    (r) => r._id as Types.ObjectId
  );
  if (!adminRole || !userRole || !userPlusRole || !structureID) {
    return null;
  }

  const accessFilter = {
    logic: 'or',
    filters: [
      {
        field: 'registered_by',
        operator: 'eq',
        value: structureID,
      },
      {
        field: 'registered_by',
        operator: 'eq',
        value: null,
      },
      {
        field: 'id',
        operator: 'eq',
        value: structureID,
      },
      {
        field: 'id',
        operator: 'eq',
        value: new Types.ObjectId(structureID),
      },
      {
        field: 'name_struct',
        operator: 'eq',
        value: structureName,
      },
    ],
  };

  const getPerms = (
    getPermissionForRoles: ('admin' | 'user' | 'userPlus')[],
    options?: { filter?: boolean }
  ) => {
    const perms: { role: Types.ObjectId; access?: typeof accessFilter }[] = [];
    if (getPermissionForRoles.includes('admin')) {
      perms.push(
        Object.assign(
          { role: adminRole },
          options?.filter ? { access: accessFilter } : {}
        )
      );
    }
    if (getPermissionForRoles.includes('user')) {
      perms.push(
        Object.assign(
          { role: userRole },
          options?.filter ? { access: accessFilter } : {}
        )
      );
    }
    if (getPermissionForRoles.includes('userPlus')) {
      perms.push(
        Object.assign(
          { role: userPlusRole },
          options?.filter ? { access: accessFilter } : {}
        )
      );
    }

    return perms;
  };

  return {
    // Document resource
    '64d52f618e7db3d85022efab': {
      canCreateRecords: [],
      canSeeRecords: getPerms(['admin', 'user', 'userPlus']),
      canUpdateRecords: [],
      canDeleteRecords: [],
    },
    // Structure resource
    '649ade1ceae9f87c89918868': {
      canCreateRecords: [],
      canSeeRecords: getPerms(['admin', 'user', 'userPlus'], { filter: true }),
      canUpdateRecords: getPerms(['admin'], { filter: true }),
      canDeleteRecords: [],
    },
    // Aid resource
    '64e6e0933c7bf3962bf4f04c': {
      canCreateRecords: getPerms(['admin', 'user', 'userPlus']),
      canSeeRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canUpdateRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canDeleteRecords: getPerms(['admin'], { filter: true }),
    },
    // Family resource
    '64de75fd3fb2a11c988dddb2': {
      canCreateRecords: getPerms(['admin', 'user', 'userPlus']),
      canSeeRecords: getPerms(['admin', 'user', 'userPlus']),
      canUpdateRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canDeleteRecords: getPerms(['admin'], { filter: true }),
    },
    // Person resource
    '64de7da43fb2a179b18de287': {
      canCreateRecords: getPerms(['admin', 'user', 'userPlus']),
      canSeeRecords: getPerms(['admin', 'user', 'userPlus']),
      canUpdateRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canDeleteRecords: getPerms(['admin'], { filter: true }),
    },
    // Staff resource
    '649e9ec5eae9f89219921eff': {
      canCreateRecords: getPerms(['admin', 'user', 'userPlus']),
      canSeeRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canUpdateRecords: getPerms(['admin', 'user', 'userPlus'], {
        filter: true,
      }),
      canDeleteRecords: getPerms(['admin'], { filter: true }),
    },
    // Family transfer
    '651cc305ae23f4bcd3f3f67a': {
      canCreateRecords: getPerms(['admin', 'user', 'userPlus']),
      canSeeRecords: getPerms(['admin', 'user', 'userPlus']),
      canUpdateRecords: [],
      canDeleteRecords: [],
    },
  };
};

/**
 * Creates a new application for given a new structure
 *
 * @param rec Record of the new structure
 */
const onStructureAdded = async (rec: Record) => {
  const { name_struct: structName } = rec?.data ?? {};
  const id: Types.ObjectId = rec._id;

  // If the structure name or id is not defined, do nothing
  if (!structName || !id) {
    console.error('[NEW STRUCTURE APP]: Could not get structure name or id');
    return;
  }

  // We fetch the example app
  const baseApp = await Application.findById(BASE_APP_ID).populate({
    path: 'pages',
    model: 'Page',
  });
  const newApp = new Application({
    name: structName,
    status: baseApp.status,
    description: id.toString(),
    permissions: baseApp.permissions,
    createdBy: WORKER_ID,
    pages: [],
    sideMenu: baseApp.sideMenu,
  });

  // Copy files from base application
  if (baseApp.cssFilename) {
    await copyFolder('applications', baseApp.id, newApp.id);
    newApp.cssFilename = baseApp.cssFilename.replace(baseApp.id, newApp.id);
  }

  // Create three roles for each new application
  const rolesToAdd = Object.keys(ROLE_PERMISSIONS_MAP).map(
    (title: keyof typeof ROLE_PERMISSIONS_MAP) => {
      const newRole = new Role({
        title,
        application: newApp.id,
        permissions: ROLE_PERMISSIONS_MAP[title],
        channels: [],
        autoAssignment:
          title === 'administrateur (chef de structure)'
            ? [
                {
                  logic: 'and',
                  filters: [
                    {
                      field: '{{groups}}',
                      operator: 'contains',
                      value: ['65230eff73365d9cf2c00787'],
                    },
                  ],
                },
              ]
            : [],
      });

      return newRole;
    }
  );

  // Get the permissions for the resources
  const resourcesPermissions = getResourcesPermissions(
    rolesToAdd,
    id.toString(),
    rec.data?.name_struct
  );

  if (!resourcesPermissions) {
    console.error('[NEW STRUCTURE APP]: Could not get resources permissions');
    return;
  }

  // First query all the resources
  const resources = await Resource.find({
    _id: { $in: Object.keys(resourcesPermissions) },
  });

  // Loop through the resources to add the permissions
  for (const resource of resources) {
    const currPermissions = resource.permissions;
    const newPermissions = resourcesPermissions[resource._id] ?? {
      canSee: [],
      canUpdate: [],
    };

    // Fields permissions
    resource.fields.forEach((field) => {
      const fieldPerms = field.permissions;
      for (const permType of ['canSee', 'canUpdate'] as const) {
        if ((fieldPerms || {})[permType]?.length) {
          // Check if original role is in the permissions
          const adminCanSee = !!fieldPerms[permType].find((x) =>
            ROLE_ID_MAP.admin.equals(x)
          );
          const userCanSee = !!fieldPerms[permType].find((x) =>
            ROLE_ID_MAP.user.equals(x)
          );
          const userPlusCanSee = !!fieldPerms[permType].find((x) =>
            ROLE_ID_MAP.userPlus.equals(x)
          );

          // If the original role is in the permissions, add the new roles
          if (adminCanSee) {
            fieldPerms[permType].push(rolesToAdd[0]._id);
          }
          if (userCanSee) {
            fieldPerms[permType].push(rolesToAdd[1]._id);
          }
          if (userPlusCanSee) {
            fieldPerms[permType].push(rolesToAdd[2]._id);
          }
        }
      }

      resource.markModified('fields');
    });

    // Init the permissions if not defined
    if (!currPermissions) {
      resource.permissions = newPermissions;
      continue;
    }

    // Add the permissions
    [
      'canCreateRecords',
      'canSeeRecords',
      'canUpdateRecords',
      'canDeleteRecords',
    ].forEach((perm) => {
      if (newPermissions[perm].length) {
        if (!currPermissions[perm]) {
          currPermissions[perm] = [];
        }
        currPermissions[perm].push(...newPermissions[perm]);
      }
    });
  }

  // Save the resources
  await Promise.all(resources.map((r) => r.save()));

  // Save the roles
  await Role.insertMany(rolesToAdd);

  // Create a role Channel for each role
  const roleChannels = rolesToAdd.map(
    (r) =>
      new Channel({
        title: `Role - ${structName} - ${r.title}`,
        role: r._id,
      })
  );

  // Update the super admin to subscribe to the new channels
  const superAdmin = await Role.findById(SUPER_ADMIN_ROLE_ID);
  superAdmin.channels.push(...roleChannels.map((c) => c._id));
  superAdmin.markModified('channels');
  await superAdmin.save();

  // Save the role channels
  await Channel.insertMany(roleChannels);

  // Duplicate pages
  for (let i = 0; i < APPLICATION_PAGES.length; i++) {
    const p = APPLICATION_PAGES[i];
    // Get page from base app
    const page = (baseApp.pages as Page[]).find((x) => x._id.equals(p.id));
    if (!page) {
      continue;
    }

    const permissions = rolesToAdd
      .map((r) => r._id)
      .filter((r) => {
        // If administrateur (chef de structure), access to all pages
        if (r.equals(rolesToAdd[0]._id)) {
          return true;
        }
        // If utilisateur plus, no access to structure_wf
        if (r.equals(rolesToAdd[1]._id)) {
          return p.page !== 'structure_wf';
        }
        // If utilisateur, no access to structure_wf and stats
        if (r.equals(rolesToAdd[2]._id)) {
          return p.page !== 'structure_wf' && p.page !== 'stats';
        }
        return false;
      });

    // Duplicate the page
    const newPage: Page = await duplicatePage(page, undefined, {
      canSee: permissions,
      canUpdate: [],
      canDelete: [],
    });

    // Add the new page to the new app
    newApp.pages.push(newPage._id);
  }
  // We save the new app
  await newApp.save();
};

export default onStructureAdded;