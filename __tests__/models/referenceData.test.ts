import { ReferenceData } from '@models';
import { faker } from '@faker-js/faker';
import { referenceDataType } from '@const/enumTypes';
import { camelCase, toUpper } from 'lodash';

/**
 * Test ReferenceData Model.
 */
describe('ReferenceData models tests', () => {
  let name = '';
  test('test ReferenceData model with correct data also with graphql type', async () => {
    for (let i = 0; i < 1; i++) {
      const referenceData = [];
      for (let j = 0; j < 10; j++) {
        referenceData.push({
          name: faker.address.country(),
          value: faker.address.countryCode(),
        });
      }
      name = faker.random.alpha(10);
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

  test('test ReferenceData with duplicate name', async () => {
    const duplicateReferenceData = {
      name: name,
      graphQLTypeName: ReferenceData.getGraphQLTypeName(name),
    };
    expect(async () =>
      new ReferenceData(duplicateReferenceData).save()
    ).rejects.toThrow(
      'E11000 duplicate key error collection: test.referencedatas index: name_1 dup key'
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
      expect(async () => new ReferenceData(inputData).save()).rejects.toThrow(
        Error
      );
    }
  });
});
