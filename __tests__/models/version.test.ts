import { Version, Form, Record } from '@models';

/**
 * Test Version Model.
 */
describe('Version models tests', () => {
  test('test Version model with correct data with form structure', async () => {
    const forms = await Form.find();
    for (let i = 0; i < forms.length; i++) {
      const version = await new Version({
        data: forms[i].structure,
      }).save();
      expect(version._id).toBeDefined();
      expect(version).toHaveProperty('createdAt');
    }
  });

  test('test Version model with correct data with record data', async () => {
    const records = await Record.find();
    for (let i = 0; i < records.length; i++) {
      const version = await new Version({
        data: records[i].data,
      }).save();
      expect(version._id).toBeDefined();
      expect(version).toHaveProperty(['createdAt']);
    }
  });
});
