import protectedNames from '@const/protectedNames';
import { GraphQLError } from 'graphql';
import i18nextModule from 'i18next';
// import { camelCase, toUpper } from 'lodash';
import {
  getGraphQLTypeName,
  validateGraphQLTypeName,
  validateGraphQLFieldName,
} from '@utils/validators';

// Mock i18next translation
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key), // Returns the key for simplicity
}));

describe('getGraphQLTypeName', () => {
  it('should transform the name to camel case with the first letter in uppercase', () => {
    expect(getGraphQLTypeName('some_name')).toBe('SomeName');
    expect(getGraphQLTypeName('another_example')).toBe('AnotherExample');
  });
});

describe('validateGraphQLTypeName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not throw an error for valid GraphQL type names', () => {
    const validNames = ['ValidName', '_anotherValidName', 'someValidName123'];

    validNames.forEach((name) => {
      expect(() => validateGraphQLTypeName(name)).not.toThrow();
    });
  });

  it('should throw a GraphQLError if name does not match GraphQL type name regex', () => {
    const invalidNames = ['Invalid Name', '123Invalid', 'Invalid@Name', ''];

    invalidNames.forEach((name) => {
      expect(() => validateGraphQLTypeName(name)).toThrow(GraphQLError);
      expect(() => validateGraphQLTypeName(name)).toThrow(
        i18nextModule.t('common.errors.invalidGraphQLName')
      );
    });
  });

  it('should throw a GraphQLError if name is in protectedNames', () => {
    const protectedName = 'protected';

    // Add name to protected names for test
    protectedNames.push(protectedName.toLowerCase());

    expect(() => validateGraphQLTypeName(protectedName)).toThrow(GraphQLError);
    expect(() => validateGraphQLTypeName(protectedName)).toThrow(
      i18nextModule.t(
        'utils.validators.validateName.errors.usageOfProtectedName'
      )
    );

    // Clean up
    protectedNames.pop();
  });

  it('should call i18next.t with the correct keys on error', () => {
    const invalidName = 'Invalid Name';

    try {
      validateGraphQLTypeName(invalidName);
    } catch (e) {
      expect(i18nextModule.t).toHaveBeenCalledWith(
        'common.errors.invalidGraphQLName'
      );
    }

    const protectedName = 'protected';
    protectedNames.push(protectedName.toLowerCase());

    try {
      validateGraphQLTypeName(protectedName);
    } catch (e) {
      expect(i18nextModule.t).toHaveBeenCalledWith(
        'utils.validators.validateName.errors.usageOfProtectedName'
      );
    }

    protectedNames.pop();
  });
});

describe('validateGraphQLFieldName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not throw an error for valid GraphQL field names', () => {
    const validNames = ['validField', '_anotherValidField', 'someField123'];

    validNames.forEach((name) => {
      expect(() => validateGraphQLFieldName(name)).not.toThrow();
    });
  });

  it('should throw a GraphQLError if name does not match GraphQL field name regex', () => {
    const invalidNames = ['Invalid Field', '123Invalid', 'Invalid@Field', ''];

    invalidNames.forEach((name) => {
      expect(() => validateGraphQLFieldName(name)).toThrow(GraphQLError);
      expect(() => validateGraphQLFieldName(name)).toThrow(
        i18nextModule.t(
          'utils.validators.validateName.errors.invalidFieldName',
          {
            field: name,
            err: i18nextModule.t('common.errors.invalidGraphQLName'),
          }
        )
      );
    });
  });

  it('should call i18next.t with the correct keys and field on error', () => {
    const invalidName = 'Invalid Field';

    try {
      validateGraphQLFieldName(invalidName);
    } catch (e) {
      expect(i18nextModule.t).toHaveBeenCalledWith(
        'utils.validators.validateName.errors.invalidFieldName',
        {
          field: invalidName,
          err: i18nextModule.t('common.errors.invalidGraphQLName'),
        }
      );
    }
  });
});
