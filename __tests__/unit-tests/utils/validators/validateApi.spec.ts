import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import { validateApi } from '@utils/validators';

// Mock i18next translation
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key), // Returns the key itself for simplicity
}));

describe('validateApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not throw an error for valid API names', () => {
    const validNames = ['ApiName', 'Another-Name', 'api_name'];

    validNames.forEach((name) => {
      expect(() => validateApi(name)).not.toThrow();
    });
  });

  it('should throw a GraphQLError for invalid API names', () => {
    const invalidNames = ['Invalid Name', '123Invalid', 'Invalid@Name', ''];

    invalidNames.forEach((name) => {
      expect(() => validateApi(name)).toThrow(GraphQLError);
      expect(() => validateApi(name)).toThrow(
        i18next.t('common.errors.invalidGraphQLName')
      );
    });
  });

  it('should call i18next.t with the correct key on error', () => {
    const invalidName = 'Invalid Name';

    try {
      validateApi(invalidName);
    } catch (e) {
      expect(i18next.t).toHaveBeenCalledWith(
        'common.errors.invalidGraphQLName'
      );
    }
  });
});
