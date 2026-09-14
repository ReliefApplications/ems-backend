import { get } from 'lodash';
import uniqBy from 'lodash/uniqBy';
import { isObjectIdOrHexString } from 'mongoose';
import { resourcePermission } from '../../types/permission';

/** Permissions that can be set on a resource field */
export type FieldPermission = 'canSee' | 'canUpdate';

/**
 * Record permission families that make a role eligible for a field permission.
 * A role must hold at least one of them ( globally or filtered ).
 */
export const fieldPermissionPrerequisites: Record<
  FieldPermission,
  resourcePermission[]
> = {
  canSee: [resourcePermission.SEE_RECORDS, resourcePermission.CREATE_RECORDS],
  canUpdate: [
    resourcePermission.UPDATE_RECORDS,
    resourcePermission.CREATE_RECORDS,
  ],
};

/** Name of the opt-out list, on resource permissions, per field permission */
export const fieldsAutoGrantOptOutKey: Record<FieldPermission, string> = {
  canSee: 'fieldsAutoGrantCanSeeOptOut',
  canUpdate: 'fieldsAutoGrantCanUpdateOptOut',
};

/**
 * Compare two role identifiers ( ObjectId or string ).
 *
 * @param a first role
 * @param b second role
 * @returns whether both identify the same role
 */
const sameRole = (a: any, b: any) => String(a) === String(b);

/**
 * Extract the role of a permission entry, stored either as a plain role id
 * or as a { role, access } rule.
 *
 * @param entry permission entry
 * @returns role id, if any
 */
const roleOf = (entry: any) =>
  isObjectIdOrHexString(entry) ? entry : get(entry, 'role');

/**
 * Check whether a role holds ( globally or filtered ) at least one record
 * permission making it eligible for the given field permission.
 *
 * @param resourcePermissions resource permissions
 * @param role role to check
 * @param permission field permission
 * @returns whether the role is eligible
 */
export const isRoleEligibleForFieldPermission = (
  resourcePermissions: any,
  role: any,
  permission: FieldPermission
): boolean =>
  fieldPermissionPrerequisites[permission].some((family) =>
    get(resourcePermissions, family, []).some((p: any) =>
      sameRole(roleOf(p), role)
    )
  );

/**
 * Check whether a role opted out of the auto-grant of a field permission.
 *
 * @param resourcePermissions resource permissions
 * @param role role to check
 * @param permission field permission
 * @returns whether the role opted out
 */
export const isFieldsAutoGrantOptedOut = (
  resourcePermissions: any,
  role: any,
  permission: FieldPermission
): boolean =>
  get(resourcePermissions, fieldsAutoGrantOptOutKey[permission], []).some(
    (r: any) => sameRole(r, role)
  );

/**
 * Resolve whether a role has an effective fields-auto-grant permission.
 * Auto-grant is opt-out: it's implicitly on for any role eligible via record
 * permissions, unless the role has been explicitly added to the opt-out list.
 *
 * @param resourcePermissions resource permissions
 * @param role role to check
 * @param permission field permission
 * @returns whether auto-grant is currently effective for this role
 */
export const isFieldsAutoGrantActive = (
  resourcePermissions: any,
  role: any,
  permission: FieldPermission
): boolean =>
  isRoleEligibleForFieldPermission(resourcePermissions, role, permission) &&
  !isFieldsAutoGrantOptedOut(resourcePermissions, role, permission);

/**
 * Compute the list of role ids that should have a permission auto-granted on
 * newly created resource fields: roles eligible via record permissions, minus
 * those that opted out.
 *
 * @param resourcePermissions resource permissions
 * @param permission field permission
 * @returns list of role ids to grant the field permission to
 */
export const getAutoGrantedFieldRoles = (
  resourcePermissions: any,
  permission: FieldPermission
): any[] => {
  const eligibleRoles = uniqBy(
    fieldPermissionPrerequisites[permission].flatMap((family) =>
      get(resourcePermissions, family, [])
        .map(roleOf)
        .filter((role: any) => !!role)
    ),
    String
  );
  return eligibleRoles.filter(
    (role) => !isFieldsAutoGrantOptedOut(resourcePermissions, role, permission)
  );
};

/**
 * Compute the default permissions of a newly created resource field: roles
 * with resource-level access ( canSee / canUpdate ), plus roles for which
 * auto-grant is effective.
 *
 * @param resourcePermissions resource permissions
 * @returns default field permissions
 */
export const getDefaultFieldPermissions = (
  resourcePermissions: any
): Record<FieldPermission, any[]> => ({
  canSee: uniqBy(
    [
      ...get(resourcePermissions, 'canSee', []),
      ...getAutoGrantedFieldRoles(resourcePermissions, 'canSee'),
    ],
    String
  ),
  canUpdate: uniqBy(
    [
      ...get(resourcePermissions, 'canUpdate', []),
      ...getAutoGrantedFieldRoles(resourcePermissions, 'canUpdate'),
    ],
    String
  ),
});
