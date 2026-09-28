import editEmailNotification from '@schema/mutation/editEmailNotification.mutation';
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
  individualEmailToDistributionList: false,
  csFilter: {
    logic: 'and',
    filters: [{ field: 'region', operator: 'eq', value: '{{Block 1.region}}' }],
  },
  ...overrides,
});

/** Minimal valid notification payload */
const buildNotification = (overrides: Record<string, any> = {}) => ({
  name: 'Weekly digest',
  applicationId: new mongoose.Types.ObjectId(),
  notificationType: 'email',
  datasets: [
    {
      name: 'Block 2',
      resource: new mongoose.Types.ObjectId().toString(),
      reference: null,
      query: { name: 'allRecords', fields: [{ name: 'title' }], filter: {} },
      individualEmail: false,
    },
  ],
  emailDistributionList: new mongoose.Types.ObjectId(),
  subscriptionList: [],
  restrictSubscription: false,
  status: 'active',
  recipientsType: 'email',
  isDraft: false,
  isDeleted: 0,
  ...overrides,
});

describe('editEmailNotification Resolver', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let application: mongoose.Types.ObjectId;
  let existing: any;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    application = new mongoose.Types.ObjectId();
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
    existing = await new EmailNotification(
      buildNotification({ applicationId: application })
    ).save();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await EmailNotification.deleteMany({});
  });

  /**
   * Runs the mutation against the existing notification.
   *
   * @param notification Notification payload
   * @returns Mutation result
   */
  const edit = (notification: any) =>
    editEmailNotification.resolve(
      null,
      {
        id: existing._id,
        application: application.toString(),
        notification,
      },
      context
    );

  it('rejects an unauthenticated user', async () => {
    context.user = null;
    await expect(edit(buildNotification())).rejects.toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'common.errors.userNotLogged'
    );
  });

  describe('recipient source rule', () => {
    it('rejects dropping the distribution list when no dataset sends separately', async () => {
      await expect(
        edit(buildNotification({ emailDistributionList: null }))
      ).rejects.toThrow('common.errors.dataNotFound');

      const stored = await EmailNotification.findById(existing._id).lean();
      expect(stored.emailDistributionList).toBeDefined();
    });

    it('accepts dropping the distribution list once a dataset sends separately', async () => {
      const result = await edit(
        buildNotification({
          emailDistributionList: null,
          datasets: [separateDataset()],
        })
      );

      expect(result.emailDistributionList).toBeNull();
      expect(result.datasets[0].individualEmail).toBe(true);
    });

    it('lets a draft drop every recipient source', async () => {
      const result = await edit(
        buildNotification({ emailDistributionList: null, isDraft: true })
      );

      expect(result.isDraft).toBe(true);
    });
  });

  describe('Common Services filter persistence', () => {
    it('updates the per-dataset filter and the distribution list toggle', async () => {
      const dataset = separateDataset({
        individualEmailToDistributionList: true,
      });

      await edit(buildNotification({ datasets: [dataset] }));

      const stored = await EmailNotification.findById(existing._id).lean();
      expect(stored.datasets).toHaveLength(1);
      expect(stored.datasets[0].csFilter).toEqual(dataset.csFilter);
      expect(stored.datasets[0].individualEmailToDistributionList).toBe(true);
    });

    it('clears a previously saved filter when the payload drops it', async () => {
      await edit(buildNotification({ datasets: [separateDataset()] }));
      await edit(
        buildNotification({
          datasets: [separateDataset({ csFilter: null })],
        })
      );

      const stored = await EmailNotification.findById(existing._id).lean();
      expect(stored.datasets[0].csFilter).toBeNull();
    });
  });

  it('rejects a user who cannot update notifications', async () => {
    (extendAbilityForApplications as jest.Mock).mockReturnValue({
      cannot: jest.fn().mockReturnValue(true),
      can: jest.fn().mockReturnValue(false),
    });

    await expect(edit(buildNotification())).rejects.toThrow(
      'common.errors.permissionNotGranted'
    );
  });
});
