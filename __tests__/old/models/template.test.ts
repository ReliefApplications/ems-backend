import { Application } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Template Model.
 */
describe('Template models tests', () => {
  test('test Template model with correct', async () => {
    for (let i = 0; i < 1; i++) {
      const templates = [];
      for (let j = 0; j < 1; j++) {
        templates.push({
          name: faker.random.alpha(10),
          type: 'email',
          content: faker.commerce.productDescription(),
        });
      }

      const inputData = {
        name: faker.internet.userName(),
        status: status.pending,
        templates: templates,
      };
      const saveData = await new Application(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test Template model with wrong name', async () => {
    const templates = [];
    for (let j = 0; j < 1; j++) {
      templates.push({
        name: faker.science.unit(),
        type: 'email',
        content: faker.commerce.productDescription(),
      });
    }
    const inputData = {
      name: faker.internet.userName(),
      status: status.pending,
      templates: templates,
    };
    expect(async () => new Application(inputData).save()).rejects.toThrow(
      Error
    );
  });
});
