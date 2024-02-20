import { faker } from '@faker-js/faker';
import { ApiConfiguration } from '@models';
import { status, authType } from '@const/enumTypes';

/**
 * Test ApiConfiguration Model.
 */
describe('ApiConfiguration models tests', () => {
  let apiConfiguration: ApiConfiguration;
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.word.adjective(),
        status: status.pending,
        authType: authType.serviceToService,
        endpoint: faker.internet.url(),
        graphQLEndpoint: `${faker.internet.url()}/graphql`,
        pingUrl: 'PR',
        settings: {
          authTargetUrl: faker.internet.url(),
          apiClientID: faker.datatype.uuid(),
          safeSecret: faker.datatype.uuid(),
          scope: faker.word.adjective(),
        },
      };
      apiConfiguration = await new ApiConfiguration(apiConfig).save();
      expect(apiConfiguration._id).toBeDefined();
    }
  });

  test('test apiConfiguration with duplicate name', async () => {
    const duplicateApiConfig = {
      name: apiConfiguration.name,
    };
    expect(async () =>
      new ApiConfiguration(duplicateApiConfig).save()
    ).rejects.toThrow(
      'E11000 duplicate key error collection: test.apiconfigurations index: name_1 dup key'
    );
  });

  test('test with incorrect api configuration status field', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.word.adjective(),
        status: faker.datatype.number(),
        authType: authType.serviceToService,
        endpoint: faker.internet.url(),
        graphQLEndpoint: `${faker.internet.url()}/graphql`,
        pingUrl: 'PR',
        settings: {
          authTargetUrl: faker.internet.url(),
          apiClientID: faker.datatype.uuid(),
          safeSecret: faker.datatype.uuid(),
          scope: faker.word.adjective(),
        },
      };
      expect(async () =>
        new ApiConfiguration(apiConfig).save()
      ).rejects.toThrow(Error);
    }
  });
});
