import { Version, Form, Record } from '@models';

/**
 * Test Version Model.
 */
describe('Version models tests', () => {
  test('test Version model with correct data with form structure', async () => {
    const forms = await Form.find();
    for (let i = 0; i < forms.length; i++) {
      const inputData = {
        data: forms[i].structure,
      };
      const saveData = await new Version(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test Version model with correct data with record data', async () => {
    const records = await Record.find();
    for (let i = 0; i < records.length; i++) {
      const inputData = {
        data: records[i].data,
      };
      const saveData = await new Version(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });
});
