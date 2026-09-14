import {
  getAutoGrantedFieldRoles,
  getDefaultFieldPermissions,
  isFieldsAutoGrantActive,
  isRoleEligibleForFieldPermission,
} from '@utils/form/fieldsAutoGrant';
import { Types } from 'mongoose';

describe('fieldsAutoGrant helpers', () => {
  const roleA = new Types.ObjectId();
  const roleB = new Types.ObjectId();
  const roleC = new Types.ObjectId();
  const roleD = new Types.ObjectId();

  /** @returns the ids, as strings, of the given list */
  const ids = (list: any[]) => list.map((x) => String(x)).sort();

  const permissions = {
    canSee: [roleA],
    canUpdate: [roleA],
    canSeeRecords: [{ role: roleB }, { role: roleC, access: {} }],
    canCreateRecords: [{ role: roleD }],
    canUpdateRecords: [],
    fieldsAutoGrantCanSeeOptOut: [roleC],
    fieldsAutoGrantCanUpdateOptOut: [roleD],
  };

  describe('isRoleEligibleForFieldPermission', () => {
    it('should accept roles with see or create records access for canSee', () => {
      expect(
        isRoleEligibleForFieldPermission(permissions, roleB, 'canSee')
      ).toBe(true);
      expect(
        isRoleEligibleForFieldPermission(permissions, roleD, 'canSee')
      ).toBe(true);
    });

    it('should accept filtered access', () => {
      expect(
        isRoleEligibleForFieldPermission(permissions, roleC, 'canSee')
      ).toBe(true);
    });

    it('should accept roles with update or create records access for canUpdate', () => {
      expect(
        isRoleEligibleForFieldPermission(permissions, roleD, 'canUpdate')
      ).toBe(true);
      expect(
        isRoleEligibleForFieldPermission(permissions, roleB, 'canUpdate')
      ).toBe(false);
    });

    it('should ignore resource-level access', () => {
      expect(
        isRoleEligibleForFieldPermission(permissions, roleA, 'canSee')
      ).toBe(false);
    });

    it('should compare string and ObjectId roles', () => {
      expect(
        isRoleEligibleForFieldPermission(permissions, String(roleB), 'canSee')
      ).toBe(true);
    });

    it('should handle missing permissions', () => {
      expect(isRoleEligibleForFieldPermission(undefined, roleB, 'canSee')).toBe(
        false
      );
    });
  });

  describe('isFieldsAutoGrantActive', () => {
    it('should be on by default for eligible roles', () => {
      expect(isFieldsAutoGrantActive(permissions, roleB, 'canSee')).toBe(true);
    });

    it('should be off for roles that opted out', () => {
      expect(isFieldsAutoGrantActive(permissions, roleC, 'canSee')).toBe(false);
      expect(isFieldsAutoGrantActive(permissions, roleD, 'canUpdate')).toBe(
        false
      );
    });

    it('should be off for roles that are not eligible', () => {
      expect(isFieldsAutoGrantActive(permissions, roleA, 'canSee')).toBe(false);
      expect(isFieldsAutoGrantActive(permissions, roleB, 'canUpdate')).toBe(
        false
      );
    });
  });

  describe('getAutoGrantedFieldRoles', () => {
    it('should list eligible roles minus opted out ones', () => {
      expect(ids(getAutoGrantedFieldRoles(permissions, 'canSee'))).toEqual(
        ids([roleB, roleD])
      );
      expect(ids(getAutoGrantedFieldRoles(permissions, 'canUpdate'))).toEqual(
        []
      );
    });

    it('should not duplicate roles with several rules', () => {
      const withDuplicates = {
        canSeeRecords: [{ role: roleB }, { role: roleB, access: {} }],
        canCreateRecords: [{ role: roleB }],
      };
      expect(ids(getAutoGrantedFieldRoles(withDuplicates, 'canSee'))).toEqual(
        ids([roleB])
      );
    });

    it('should skip entries without role', () => {
      const withBrokenEntry = {
        canSeeRecords: [{ access: {} }, { role: roleB }],
      };
      expect(ids(getAutoGrantedFieldRoles(withBrokenEntry, 'canSee'))).toEqual(
        ids([roleB])
      );
    });
  });

  describe('getDefaultFieldPermissions', () => {
    it('should combine resource-level access with auto-granted roles', () => {
      const defaults = getDefaultFieldPermissions(permissions);
      expect(ids(defaults.canSee)).toEqual(ids([roleA, roleB, roleD]));
      expect(ids(defaults.canUpdate)).toEqual(ids([roleA]));
    });

    it('should not duplicate a role that has both', () => {
      const defaults = getDefaultFieldPermissions({
        canSee: [roleB],
        canSeeRecords: [{ role: roleB }],
      });
      expect(ids(defaults.canSee)).toEqual(ids([roleB]));
    });

    it('should return empty lists when the resource has no permissions', () => {
      const defaults = getDefaultFieldPermissions(undefined);
      expect(defaults.canSee).toEqual([]);
      expect(defaults.canUpdate).toEqual([]);
    });
  });
});
