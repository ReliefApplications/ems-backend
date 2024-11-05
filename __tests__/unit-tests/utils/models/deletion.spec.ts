import {
  addOnBeforeDeleteMany,
  addOnBeforeDeleteOne,
} from '@utils/models/deletion';
import { Schema, model, Document } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

interface TestDoc extends Document {
  name: string;
}

const testSchema = new Schema<TestDoc>({
  name: String,
});

jest.mock('@services/logger.service');

let databaseHelpers: DatabaseHelpers;

describe('Mongoose Schema Deletion hooks', () => {
  let testModel: any;
  let mockCallback: jest.Mock;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a mock callback
    mockCallback = jest.fn();

    // Create a model from the schema
    testModel = model<TestDoc>('Test', testSchema);
  });

  afterEach(async () => {
    // Cleanup after each test
    await testModel.deleteMany({});
  });

  it('should call callback for deleteOne', async () => {
    addOnBeforeDeleteOne(testSchema, mockCallback);

    const doc = await testModel.create({ name: 'Test Document' });

    await testModel.deleteOne({ _id: doc._id });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
