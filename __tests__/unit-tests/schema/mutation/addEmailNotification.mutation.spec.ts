import addEmailNotification from '@schema/mutation/addEmailNotification.mutation';
import { EmailNotification } from '@models';
import { Context } from '@server/apollo/context';
import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@security/extendAbilityForApplication', () => jest.fn());

/** A send-separate dataset with its own recipient sources */
const separateDataset = (overrides: Record<string, any> = {}) => ({
  name: 'Block 1',
  resource: new mongoose.Types.ObjectId().toString(),
  reference: null,
  query: { name: 'allRecords', fields: [{ name: 'email' }], filter: {} },
  individualEmail: true,
  individualEmailFields: [{ name: 'email' }],
  individualEmailToDistributionList: true,
  csFilter: {
    logic: 'and',
    filters: [
      { field: 'country', operator: 'eq', value: '{{Block 1.country}}' },
    ],
  },
  ...overrides,
});

/** A regular dataset that supplies no recipient */
const commonDataset = (overrides: Record<string, any> = {}) => ({
  name: 'Block 2',
  resource: new mongoose.Types.ObjectId().toString(),
  reference: null,
  query: { name: 'allRecords', fields: [{ name: 'title' }], filter: {} },
  individualEmail: false,
  ...overrides,
});

/** Minimal valid notification payload */
const buildNotification = (overrides: Record<string, any> = {}): any => ({
  name: 'Weekly digest',
  applicationId: new mongoose.Types.ObjectId(),
  notificationType: 'email',
  datasets: [commonDataset()],
  emailDistributionList: new mongoose.Types.ObjectId(),
  subscriptionList: [],
  restrictSubscription: false,
  status: 'active',
  recipientsType: 'email',
  isDraft: false,
  isDeleted: 0,
  ...overrides,
});

describe('addEmailNotification Resolver', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    context = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        name: 'Tester',
        username: 'tester@x.com',
      },
      i18next: { t: jest.fn((key: string) => key) },
    } as unknown as Context;
    (extendAbilityForApplications as jest.Mock).mockReturnValue({
      cannot: jest.fn().mockReturnValue(false),
      can: jest.fn().mockReturnValue(true),
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await EmailNotification.deleteMany({});
  });

  it('rejects an unauthenticated user', async () => {
    await expect(
      addEmailNotification.resolve(
        null,
        { notification: buildNotification() },
        { ...context, user: null } as any
      )
    ).rejects.toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'common.errors.userNotLogged'
    );
  });

  describe('recipient source rule', () => {
    it('rejects a notification with neither a distribution list nor a send-separate dataset', async () => {
      await expect(
        addEmailNotification.resolve(
          null,
          {
            notification: buildNotification({ emailDistributionList: null }),
          },
          context
        )
      ).rejects.toThrow('common.errors.dataNotFound');
      expect(await EmailNotification.countDocuments()).toBe(0);
    });

    it('accepts a send-separate dataset in place of a distribution list', async () => {
      const result = await addEmailNotification.resolve(
        null,
        {
          notification: buildNotification({
            emailDistributionList: null,
            datasets: [commonDataset(), separateDataset()],
          }),
        },
        context
      );

      expect(result.emailDistributionList).toBeNull();
      expect(result.datasets).toHaveLength(2);
    });

    it('ignores a send-separate dataset that has no resource', async () => {
      await expect(
        addEmailNotification.resolve(
          null,
          {
            notification: buildNotification({
              emailDistributionList: null,
              datasets: [separateDataset({ resource: null, reference: null })],
            }),
          },
          context
        )
      ).rejects.toThrow('common.errors.dataNotFound');
    });

    it('counts a reference-backed send-separate dataset as a recipient source', async () => {
      const result = await addEmailNotification.resolve(
        null,
        {
          notification: buildNotification({
            emailDistributionList: null,
            datasets: [separateDataset({ resource: null, reference: 'ref-1' })],
          }),
        },
        context
      );

      expect(result.datasets).toHaveLength(1);
    });

    it('lets a draft be saved without any recipient source', async () => {
      const result = await addEmailNotification.resolve(
        null,
        {
          notification: buildNotification({
            emailDistributionList: null,
            isDraft: true,
          }),
        },
        context
      );

      expect(result.isDraft).toBe(true);
    });
  });

  describe('Common Services filter persistence', () => {
    it('stores the per-dataset filter and the distribution list toggle', async () => {
      const dataset = separateDataset();
      const result = await addEmailNotification.resolve(
        null,
        { notification: buildNotification({ datasets: [dataset] }) },
        context
      );

      const stored = await EmailNotification.findById(result._id).lean();
      expect(stored.datasets[0].csFilter).toEqual(dataset.csFilter);
      expect(stored.datasets[0].individualEmailToDistributionList).toBe(true);
      expect(stored.datasets[0].individualEmailFields).toEqual([
        { name: 'email' },
      ]);
    });

    it('defaults the distribution list toggle to false', async () => {
      const result = await addEmailNotification.resolve(
        null,
        {
          notification: buildNotification({
            datasets: [
              separateDataset({
                individualEmailToDistributionList: undefined,
                csFilter: undefined,
              }),
            ],
          }),
        },
        context
      );

      const stored = await EmailNotification.findById(result._id).lean();
      expect(stored.datasets[0].individualEmailToDistributionList).toBe(false);
      expect(stored.datasets[0].csFilter).toBeUndefined();
    });
  });

  it('rejects a user who cannot create notifications', async () => {
    (extendAbilityForApplications as jest.Mock).mockReturnValue({
      cannot: jest.fn().mockReturnValue(true),
      can: jest.fn().mockReturnValue(false),
    });

    await expect(
      addEmailNotification.resolve(
        null,
        { notification: buildNotification() },
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
  });
});
