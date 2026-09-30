import { Ability, AbilityBuilder } from '@casl/ability';
import { Form, Record, Resource } from '@models';
import Exporter from '@utils/files/resourceExporter';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

describe('Exporter - draft records', () => {
  let databaseHelpers: DatabaseHelpers;
  let resource: Resource;
  let form: Form;
  let submitted: Record;
  let ownDraft: Record;
  let otherDraft: Record;
  const user = new Types.ObjectId();
  const otherUser = new Types.ObjectId();

  /** Columns of the export, a single text field */
  const columns = [
    {
      field: 'description',
      name: 'description',
      type: 'text',
      meta: { field: { name: 'description', type: 'text' } },
    },
  ];

  /**
   * Creates a record of the test resource.
   *
   * @param data record data
   * @param draft whether the record is a draft
   * @param createdBy creator of the record
   * @returns the created record
   */
  const createRecord = (
    data: Record['data'],
    draft: boolean,
    createdBy: Types.ObjectId
  ) =>
    Record.create({
      ...(!draft && { incrementalId: `2026-E${String(Date.now())}` }),
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data,
      draft,
      createdBy: { user: createdBy },
    });

  /**
   * Runs the pipeline exporting the given records, with the given parameters.
   *
   * @param params export parameters
   * @param ids records to export
   * @param relatedRecords whether the pipeline fetches related records
   * @returns exported rows
   */
  const exportRecords = async (
    params: any,
    ids: Types.ObjectId[],
    relatedRecords = false
  ) => {
    const { can, build } = new AbilityBuilder(Ability);
    can('read', 'Record');
    const req = {
      context: { user: { _id: user, ability: build() } },
      headers: {},
    };
    const exporter = new Exporter(req, {} as any, resource, {
      fields: columns,
      query: {},
      format: 'xlsx',
      timeZone: 'UTC',
      ...params,
    });
    const pipeline = await (exporter as any).buildPipeline(
      columns,
      ids,
      undefined,
      resource,
      relatedRecords
    );
    return Record.aggregate(pipeline);
  };

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    resource = await Resource.create({
      name: 'Export resource',
      fields: [{ name: 'description', type: 'text' }],
    });
    form = await Form.create({
      name: 'Export form',
      graphQLTypeName: 'ExportForm',
      resource: resource._id,
      core: true,
      fields: [{ name: 'description', type: 'text' }],
    });
    submitted = await createRecord({ description: 'submitted' }, false, user);
    ownDraft = await createRecord({ description: 'own draft' }, true, user);
    otherDraft = await createRecord(
      { description: 'other draft' },
      true,
      otherUser
    );
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  const allIds = () => [submitted._id, ownDraft._id, otherDraft._id];

  it('should only export submitted records by default', async () => {
    const rows = await exportRecords({}, allIds());
    expect(rows.map((x) => x.description)).toEqual(['submitted']);
  });

  it('should export the drafts of the current user for ownDrafts', async () => {
    const rows = await exportRecords(
      { recordVisibility: 'ownDrafts' },
      allIds()
    );
    expect(rows.map((x) => x.description)).toEqual(['own draft']);
  });

  it('should export every draft for allDrafts', async () => {
    const rows = await exportRecords(
      { recordVisibility: 'allDrafts' },
      allIds()
    );
    expect(rows.map((x) => x.description).sort()).toEqual([
      'other draft',
      'own draft',
    ]);
  });

  it('should never export drafts as related records', async () => {
    const rows = await exportRecords(
      { recordVisibility: 'allDrafts' },
      allIds(),
      true
    );
    expect(rows.map((x) => x.description)).toEqual(['submitted']);
  });
});
