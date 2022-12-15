import { validateApi } from '@utils/validators';
import { faker } from '@faker-js/faker';

/**
 * Test API validator.
 */
describe('API validator tests', () => {
  describe('Correct api name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (string: string) => {
      expect(validateApi(string)).toEqual(undefined);
    });
  });

  describe('Random incorrect api should return false', () => {
    const strings = new Array(1).fill(faker.internet.email());
    test.each(strings)(
      'Random api name should return false',
      (name: string) => {
        expect(validateApi(name)).toThrow();
      }
    );
  });
});
