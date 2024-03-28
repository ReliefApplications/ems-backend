import { ReferenceData } from '@models';
import { faker } from '@faker-js/faker';
import { referenceDataType } from '@const/enumTypes';
import { camelCase, toUpper } from 'lodash';

/**
 * Test ReferenceData Model.
 */
describe('ReferenceData models tests', () => {
  test('test ReferenceData model with correct data also with graphql type', async () => {
    for (let i = 0; i < 1; i++) {
      const referenceData = [];
      for (let j = 0; j < 10; j++) {
        referenceData.push({
          name: faker.address.country(),
          value: faker.address.countryCode(),
        });
      }
      const name = faker.random.alpha(10);
      const inputData = {
        name: name,
        graphQLTypeName: name,
        valueField: 'name',
        query: faker.random.alpha(10),
        type: referenceDataType.graphql,
        data: referenceData,
      };
      const saveData = await new ReferenceData(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test ReferenceData model with correct data also with static type', async () => {
    for (let i = 0; i < 1; i++) {
      const referenceData = [];
      for (let j = 0; j < 10; j++) {
        referenceData.push({
          name: faker.address.country(),
          value: faker.address.countryCode(),
        });
      }

      const inputData = {
        name: faker.random.alpha(10),
        graphQLTypeName: faker.random.alpha(10),
        valueField: 'name',
        type: referenceDataType.static,
        fields: ['name', 'value'],
        data: referenceData,
      };
      const saveData = await new ReferenceData(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test ReferenceData model with correct data also with rest type', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        graphQLTypeName: faker.random.alpha(10),
        valueField: faker.word.adjective(),
        type: referenceDataType.rest,
        fields: [faker.word.adjective(), faker.word.adjective()],
      };
      const saveData = await new ReferenceData(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test ReferenceData getGraphQLTypeName without space in form name', () => {
    const formName = faker.random.alpha(10);
    expect(ReferenceData.getGraphQLTypeName(formName)).toEqual(
      `${camelCase(formName).replace(/^(.)/, toUpper)}Ref`
    );
  });

  test('test ReferenceData getGraphQLTypeName with space in form name', () => {
    const formName = faker.name.fullName();
    expect(ReferenceData.getGraphQLTypeName(formName)).toEqual(
      `${camelCase(formName).replace(/^(.)/, toUpper)}Ref`
    );
  });

  test('test ReferenceData model with wrong type', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        graphQLTypeName: faker.random.alpha(10),
        valueField: faker.word.adjective(),
        type: faker.random.alpha(10),
        fields: [faker.word.adjective(), faker.word.adjective()],
      };
      expect(async () => new ReferenceData(inputData).save()).rejects.toThrow();
    }
  });

  test('should check for duplicate by name', async () => {
    const name = faker.random.alpha(10);
    // Create a ReferenceData document with a specific name
    const referenceData = new ReferenceData({
      name, // Provide a name that doesn't exist in the collection
      graphQLTypeName: name,
      // ... other fields ...
    });

    // Save the initial document to the collection
    await referenceData.save();

    // Attempt to create a new ReferenceData document with the same name
    const duplicateReferenceData = new ReferenceData({
      name, // Provide the same name to check for duplication
      graphQLTypeName: name,
      // ... other fields ...
    });

    // Expect the save operation to be rejected with a duplicate key error
    await expect(duplicateReferenceData.save()).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('should check for duplicate by graphQLTypeName', async () => {
    const graphQLTypeName = faker.random.alpha(10);
    // Create a ReferenceData with a specific graphQLTypeName
    const referenceData1 = await new ReferenceData({
      name: faker.random.alpha(10),
      graphQLTypeName,
      type: referenceDataType.graphql,
    }).save();

    // Try to create a new ReferenceData with the same graphQLTypeName
    await expect(
      new ReferenceData({
        name: faker.random.alpha(10),
        graphQLTypeName,
        type: referenceDataType.graphql,
      }).save()
    ).rejects.toThrowError(/duplicate key error/);

    // Try to create a new ReferenceData with a different graphQLTypeName
    await expect(
      new ReferenceData({
        name: faker.random.alpha(10),
        graphQLTypeName: faker.random.alpha(10),
        type: referenceDataType.graphql,
      }).save()
    ).resolves.toBeTruthy();

    // Cleanup after tests
    await ReferenceData.deleteOne({ _id: referenceData1._id });
  });
});
