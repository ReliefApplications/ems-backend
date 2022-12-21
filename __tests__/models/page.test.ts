import { Dashboard, Form, Page } from '@models';
import { faker } from '@faker-js/faker';
import { contentType } from '@const/enumTypes';

/**
 * Test Page Model.
 */
describe('Page models tests', () => {
  test('test with correct data and with dashboard as a content', async () => {
    for (let i = 0; i < 1; i++) {
      const random = Math.floor(Math.random() * 1);
      const dashboard = await Dashboard.findOne().skip(random);
      const pageInput = {
        name: faker.word.adjective(),
        type: contentType.dashboard,
        content: dashboard._id,
      };
      const saveData = await new Page(pageInput).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with correct data and with form as a content', async () => {
    for (let i = 0; i < 1; i++) {
      const random = Math.floor(Math.random() * 1);
      const form = await Form.findOne().skip(random);
      const pageInput = {
        name: faker.word.adjective(),
        type: contentType.form,
        content: form._id,
      };
      const saveData = await new Page(pageInput).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with content field blank', async () => {
    for (let i = 0; i < 1; i++) {
      const pageInput = {
        name: faker.word.adjective(),
        type: contentType.form,
      };
      const saveData = await new Page(pageInput).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with page name as a object and content field blank', async () => {
    for (let i = 0; i < 1; i++) {
      const pageInput = {
        name: faker.science.unit(),
        type: contentType.form,
      };
      expect(async () => new Page(pageInput).save()).rejects.toThrow(Error);
    }
  });
});
