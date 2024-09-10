import { Client, Role } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Client Model.
 */
describe('Client models tests', () => {
  let client: Client;
  test('test with correct data', async () => {
    const roleDetail = await Role.findOne();

    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.name.fullName(),
        roles: [roleDetail._id],
        clientId: faker.datatype.uuid(),
        oid: faker.datatype.uuid(),
      };
      client = await new Client(inputData).save();
      expect(client._id).toBeDefined();
    }
  });

  test('test Client with duplicate clientId', async () => {
    const inputData = {
      name: faker.name.fullName(),
      clientId: client.clientId,
    };
    expect(async () => new Client(inputData).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.clients index: clientId_1 dup key'
    );
  });

  test('test client with duplicate oid field', async () => {
    const roleDetail = await Role.findOne();
    const clientData = {
      name: faker.name.fullName(),
      roles: [roleDetail._id],
      clientId: faker.datatype.uuid(),
      oid: client.oid,
    };
    expect(async () => new Client(clientData).save()).rejects.toThrow(Error);
  });
});
