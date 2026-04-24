/* eslint-disable jsdoc/require-jsdoc */

jest.mock('@models', () => ({
  Form: {
    find: jest.fn(),
  },
  Record: {
    find: jest.fn(),
  },
  Resource: {
    findById: jest.fn(),
  },
  User: class User {},
}));

import { Form, Resource } from '@models';
import { getCalculatedFieldType } from '@utils/aggregation/calculatedFieldExpression';
import { getExpressionFromString } from '@utils/aggregation/expressionFromString';

describe('getExpressionFromString', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses a related child selector', () => {
    expect(
      getExpressionFromString(
        '{{data.emergencygrades(first: 1, sortField: "modifieddate", sortOrder: "desc").grade}}'
      )
    ).toEqual({
      operation: 'relatedField',
      relation: 'emergencygrades',
      field: 'grade',
      first: 1,
      sortField: 'modifieddate',
      sortOrder: 'desc',
    });
  });

  it('parses related child filters', () => {
    expect(
      getExpressionFromString(
        '{{data.emergencygrades(first: 1, sortField: "modifieddate", sortOrder: "desc", filter: { field: "status", operator: "eq", value: "validated" }).grade}}'
      )
    ).toMatchObject({
      operation: 'relatedField',
      relation: 'emergencygrades',
      field: 'grade',
      filter: {
        field: 'status',
        operator: 'eq',
        value: 'validated',
      },
    });
  });

  it('keeps plain data placeholders as field operators', () => {
    expect(getExpressionFromString('{{data.status}}')).toEqual({
      type: 'field',
      value: {
        field: 'status',
      },
    });
  });

  it('rejects unsupported related selector first values', () => {
    expect(() =>
      getExpressionFromString(
        '{{data.emergencygrades(first: 2, sortField: "modifieddate").grade}}'
      )
    ).toThrow('Related selector only supports first: 1');
  });

  it('infers the child field type for related selectors', async () => {
    (Form.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          resource: 'child-resource',
          fields: [
            {
              name: 'emergency',
              resource: 'parent-resource',
              relatedName: 'emergencygrades',
            },
          ],
        },
      ]),
    });
    (Resource.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        fields: [
          { name: 'grade', type: 'text' },
          { name: 'modifieddate', type: 'datetime' },
        ],
      }),
    });

    await expect(
      getCalculatedFieldType(
        '{{data.emergencygrades(first: 1, sortField: "modifieddate", sortOrder: "desc").grade}}',
        {
          parentResourceId: 'parent-resource',
          resourceFields: [],
        }
      )
    ).resolves.toBe('text');
  });
});
