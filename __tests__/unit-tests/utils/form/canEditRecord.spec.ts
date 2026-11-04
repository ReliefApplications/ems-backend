import { Record, Resource, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { canEditRecord } from '@utils/form';
import { Types } from 'mongoose';

/**
 * Builds an ability granting the given actions on records.
 *
 * @param actions granted actions
 * @param deniedFields fields the user cannot update
 * @returns the ability
 */
const buildAbility = (actions: string[], deniedFields: string[] = []) =>
  ({
    can: jest.fn(
      (action: string, _subject: unknown, field?: string) =>
        actions.includes(action) &&
        !(field && deniedFields.includes(field.replace('data.', '')))
    ),
    cannot: jest.fn(
      (action: string, _subject: unknown, field?: string) =>
        !actions.includes(action) ||
        !!(field && deniedFields.includes(field.replace('data.', '')))
    ),
  } as unknown as AppAbility);

describe('canEditRecord', () => {
  const user = { _id: new Types.ObjectId() } as unknown as User;
  const resource = {
    fields: [{ name: 'description' }, { name: 'secret' }],
  } as unknown as Resource;

  /**
   * Builds a record.
   *
   * @param draft whether the record is a draft
   * @param author id of the author of the record
   * @returns the record
   */
  const buildRecord = (draft: boolean, author = user._id) =>
    ({
      draft,
      data: { description: 'old', secret: 'old' },
      createdBy: { user: author },
    } as unknown as Record);

  describe('Draft', () => {
    it('can be edited by its author with the permission to add records', () => {
      expect(
        canEditRecord(
          buildRecord(true),
          { description: 'new' },
          buildAbility(['create']),
          resource,
          user
        )
      ).toBe(true);
    });

    it('cannot be edited without the permission to add records, even with the permission to update them', () => {
      expect(
        canEditRecord(
          buildRecord(true),
          { description: 'new' },
          buildAbility(['update']),
          resource,
          user
        )
      ).toBe(false);
    });

    it('cannot be edited by another user', () => {
      expect(
        canEditRecord(
          buildRecord(true, new Types.ObjectId()),
          { description: 'new' },
          buildAbility(['create', 'update']),
          resource,
          user
        )
      ).toBe(false);
    });

    it('ignores the field permissions, as when adding a record', () => {
      expect(
        canEditRecord(
          buildRecord(true),
          { secret: 'new' },
          buildAbility(['create'], ['secret']),
          resource,
          user
        )
      ).toBe(true);
    });
  });

  describe('Submitted record', () => {
    it('can be edited with the permission to update it', () => {
      expect(
        canEditRecord(
          buildRecord(false),
          { description: 'new' },
          buildAbility(['update']),
          resource,
          user
        )
      ).toBe(true);
    });

    it('cannot be edited with the permission to add records only', () => {
      expect(
        canEditRecord(
          buildRecord(false),
          { description: 'new' },
          buildAbility(['create']),
          resource,
          user
        )
      ).toBe(false);
    });

    it('cannot be edited when a field cannot be updated', () => {
      expect(
        canEditRecord(
          buildRecord(false),
          { secret: 'new' },
          buildAbility(['update'], ['secret']),
          resource,
          user
        )
      ).toBe(false);
    });
  });
});
