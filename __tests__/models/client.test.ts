import { Client, Role } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Client Model.
 */
describe('Client models tests', () => {
  let oid: string;
  test('test with correct data', async () => {
    const roleDetail = await Role.findOne();

    for (let i = 0; i < 1; i++) {
      oid = faker.datatype.uuid();
      const clientData = {
        name: faker.name.fullName(),
        roles: [roleDetail._id],
        clientId: faker.datatype.uuid(),
        oid: oid,
      };
      const saveData = await new Client(clientData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test client with duplicate oid field', async () => {
    const roleDetail = await Role.findOne();
    const clientData = {
      name: faker.name.fullName(),
      roles: [roleDetail._id],
      clientId: faker.datatype.uuid(),
      oid: oid,
    };
    expect(async () => new Client(clientData).save()).rejects.toThrow(Error);
  });
});
