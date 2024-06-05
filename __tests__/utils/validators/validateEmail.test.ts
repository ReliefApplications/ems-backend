import * as EmailValidator from 'email-validator';
import { faker } from '@faker-js/faker';

/**
 * Test email validator.
 */
describe('Email validator tests', () => {
  describe('Correct email should return true', () => {
    const emails = Array.from({ length: 100 }).map(() =>
      faker.internet.email()
    );
    test.each(emails)(
      'Random valid email should return true',
      (email: string) => {
        expect(EmailValidator.validate(email)).toEqual(true);
      }
    );

    const complexEmails = Array.from({ length: 100 }).map(() =>
      faker.internet.email(undefined, undefined, undefined, {
        allowSpecialCharacters: true,
      })
    );
    test.each(complexEmails)(
      'Random valid email with special characters should return true',
      (email: string) => {
        expect(EmailValidator.validate(email)).toEqual(true);
      }
    );
  });

  describe('Random strings should return false', () => {
    const strings = Array.from({ length: 100 }).map(() =>
      faker.internet.userName()
    );
    test.each(strings)('Random string should return false', (text: string) => {
      expect(EmailValidator.validate(text)).toEqual(false);
    });
  });
});
