import { ReferenceData } from '@models';
import { faker } from '@faker-js/faker';
import { referenceDataType } from '@const/enumTypes';

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

      const inputData = {
        name: faker.random.alpha(10),
        graphQLTypeName: faker.random.alpha(10),
        valueField: 'name',
        query: faker.random.alpha(10),
        type: referenceDataType.graphql,
        data: referenceData,
      };
      const saveData = await new ReferenceData(inputData).save();
      expect(saveData._id).toBeDefined();
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
    }
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
      expect(async () => new ReferenceData(inputData).save()).rejects.toThrow(
        Error
      );
    }
  });
});
