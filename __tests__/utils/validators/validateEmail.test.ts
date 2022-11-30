import { validateEmail } from '@utils/validators';
import { faker } from '@faker-js/faker';

/**
 * Test email validator.
 */
describe('Email validator tests', () => {
  describe('Correct email should return true', () => {
    const emails = new Array(100).fill(faker.internet.email());
    test.each(emails)(
      'Random valid email should return true',
      (email: string) => {
        expect(validateEmail(email)).toEqual(true);
      }
    );

    const complexEmails = new Array(100).fill(
      faker.internet.email(undefined, undefined, undefined, {
        allowSpecialCharacters: true,
      })
    );
    test.each(complexEmails)(
      'Random valid email with special characters should return true',
      (email: string) => {
        expect(validateEmail(email)).toEqual(true);
      }
    );
  });

  describe('Random strings should return false', () => {
    const strings = new Array(100).fill(faker.internet.userName());
    test.each(strings)('Random string should return false', (text: string) => {
      expect(validateEmail(text)).toEqual(false);
    });
  });
});
