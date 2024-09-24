import { Version, Form, Record } from '@models';

/**
 * Test Version Model.
 */
describe('Version models tests', () => {
  test('test Version model with correct data with form structure', async () => {
    const forms = await Form.find();
    const promises = forms.map((form) => {
      return new Version({
        data: form.structure,
      }).save();
    });

    const versions = await Promise.all(promises);

    versions.forEach((version) => {
      expect(version._id).toBeDefined();
      expect(version).toHaveProperty('createdAt');
    });
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
