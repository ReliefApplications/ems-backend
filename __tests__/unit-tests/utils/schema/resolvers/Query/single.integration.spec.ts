import mongoose from 'mongoose';
import { Ability } from '@casl/ability';
import { Record } from '@models';
import getSingleResolver from '@utils/schema/resolvers/Query/single';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { DatabaseHelpers } from '../../../../../helpers/database-helpers';

jest.mock('@services/logger.service');
jest.mock('@schema/shared', () => ({ graphQLAuthCheck: jest.fn() }));
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('single record query permissions', () => {
  let databaseHelpers: DatabaseHelpers;
  const formA = new mongoose.Types.ObjectId();
  const formB = new mongoose.Types.ObjectId();
  const resourceId = new mongoose.Types.ObjectId();
  let recordA: Record;
  let recordB: Record;
  let archivedRecord: Record;
  let draftRecord: Record;
  let seq = 0;

  /**
   * Saves a record in the database.
   *
   * @param form Form id of the record
   * @param extra Additional record properties
   * @returns The saved record
   */
  const createRecord = (form: mongoose.Types.ObjectId, extra: any = {}) =>
    new Record({
      incrementalId: `2026-S${String(++seq).padStart(7, '0')}`,
      form,
      _form: { _id: form, name: 'form' },
      resource: resourceId,
      data: { name: 'France', secret: 'classified' },
      ...extra,
    }).save();

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    recordA = await createRecord(formA);
    recordB = await createRecord(formB);
    archivedRecord = await createRecord(formA, { archived: true });
    draftRecord = await createRecord(formA, { draft: true });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    (extendAbilityForRecords as jest.Mock).mockReset();
  });

  /**
   * Runs the single record query as a new user with the given ability.
   * A new user id is used each time, so the ability cache never interferes.
   *
   * @param ability Ability returned when building the user ability
   * @param args Query arguments
   * @param userId Id of the user (optional, new id by default)
   * @returns Query result
   */
  const query = (
    ability: Ability,
    args: any,
    userId = new mongoose.Types.ObjectId()
  ) => {
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(ability);
    const context = {
      user: { _id: userId, attributes: {}, ability },
      i18next: { t: (key: string) => key },
    };
    return getSingleResolver()(null, args, context);
  };

  it('returns null for a user without any permission', async () => {
    const result = await query(new Ability([]), { id: recordA.id });
    expect(result).toBeNull();
  });

  it('returns the record with all its data for a user with full access', async () => {
    const result = await query(
      new Ability([{ action: 'manage', subject: 'all' }]),
      { id: recordA.id }
    );
    expect(result.id).toBe(recordA.id);
    expect(result.data).toEqual({ name: 'France', secret: 'classified' });
  });

  it('only returns records the user can read', async () => {
    const ability = new Ability([
      { action: 'read', subject: 'Record', conditions: { form: formA } },
    ]);
    expect((await query(ability, { id: recordA.id })).id).toBe(recordA.id);
    expect(await query(ability, { id: recordB.id })).toBeNull();
  });

  it('removes the fields the user cannot read', async () => {
    const result = await query(
      new Ability([
        { action: 'read', subject: 'Record' },
        {
          action: 'read',
          subject: 'Record',
          fields: ['data.secret'],
          inverted: true,
        },
      ]),
      { id: recordA.id }
    );
    expect(result.data).toEqual({ name: 'France' });
  });

  it('does not return archived records', async () => {
    const result = await query(
      new Ability([{ action: 'manage', subject: 'all' }]),
      { id: archivedRecord.id }
    );
    expect(result).toBeNull();
  });

  it('does not return drafts the user cannot read', async () => {
    const ability = new Ability([
      { action: 'read', subject: 'Record', conditions: { form: formB } },
    ]);
    const result = await query(ability, {
      id: draftRecord.id,
      recordVisibility: 'allDrafts',
    });
    expect(result).toBeNull();
  });

  it('overrides the record data with the given data', async () => {
    const result = await query(
      new Ability([{ action: 'manage', subject: 'all' }]),
      { id: recordA.id, data: { name: 'Germany' } }
    );
    expect(result.data).toEqual({ name: 'Germany' });
  });

  it('caches the user ability', async () => {
    const ability = new Ability([{ action: 'manage', subject: 'all' }]);
    const userId = new mongoose.Types.ObjectId();
    await query(ability, { id: recordA.id }, userId);
    await query(ability, { id: recordB.id }, userId);
    expect(extendAbilityForRecords).toHaveBeenCalledTimes(1);
  });
});
