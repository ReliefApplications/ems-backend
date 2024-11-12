import {
  addOnBeforeDeleteMany,
  addOnBeforeDeleteOne,
} from '@utils/models/deletion';
import { Schema, model, Document } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { logger } from '@services/logger.service';

/** Test doc interface for jest */
interface TestDoc extends Document {
  name: string;
}

/** Test schema for jest */
const testSchema = new Schema<TestDoc>({
  name: String,
});

jest.mock('@services/logger.service');

let databaseHelpers: DatabaseHelpers;

describe('Mongoose Schema Deletion hooks', () => {
  let mockCallback: jest.Mock;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a mock callback
    mockCallback = jest.fn();
  });

  it('should call callback for deleteOne with query', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteOne(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockOne', testSchema);

    const doc = await testModel.create({ name: 'Test Document' });

    await testModel.deleteOne({ _id: doc._id });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should call callback for deleteOne with doc', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteOne(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockTwo', testSchema);

    const doc = await testModel.create({ name: 'Test Document' });
    await doc.deleteOne();

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should log an error if no documents found on deleteMany with query', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteMany(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockThree', testSchema);

    await testModel.deleteMany({ name: 'Nonexistent' });

    expect(logger.error).toHaveBeenCalledWith('No documents found');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should log an error if no documents found on deleteOne with query', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteMany(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockFour', testSchema);

    await testModel.deleteOne({ name: 'Nonexistent' });

    expect(logger.error).toHaveBeenCalledWith('No document found');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should catch error if error thrown in deleteOne hook', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteMany(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockFive', testSchema);

    const doc = await testModel.create({ name: 'Test Document' });

    const error = new Error('Test error');
    mockCallback.mockRejectedValueOnce(error);

    await testModel.deleteOne({ _id: doc._id });

    expect(logger.error).toHaveBeenCalledWith(
      error.message,
      expect.any(Object)
    );
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should catch error if error thrown in deleteMany hook', async () => {
    // Need to be added just before model declaration
    addOnBeforeDeleteMany(testSchema, mockCallback);
    // Create a model from the schema
    const testModel = model<TestDoc>('MockSix', testSchema);

    const doc = await testModel.create({ name: 'Test Document' });

    const error = new Error('Test error');
    mockCallback.mockRejectedValueOnce(error);

    await testModel.deleteMany({ _id: doc._id });

    expect(logger.error).toHaveBeenCalledWith(
      error.message,
      expect.any(Object)
    );
    expect(mockCallback).toHaveBeenCalled();
  });
});
