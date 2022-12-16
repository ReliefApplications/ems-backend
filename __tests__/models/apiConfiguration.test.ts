import { faker } from '@faker-js/faker';
import { ApiConfiguration } from '@models';
import { status, authType } from '@const/enumTypes';

/**
 * Test ApiConfiguration Model.
 */
describe('ApiConfiguration models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.internet.userName(),
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
      const saveData = await new ApiConfiguration(apiConfig).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test with incorrect api configuration status field', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.internet.userName(),
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
