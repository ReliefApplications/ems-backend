import { getFieldType } from '@utils/form/getFieldType';

describe('getFieldType', () => {
  it.each([
    [{ type: 'text', inputType: 'text' }, 'text'],
    [{ type: 'text', inputType: 'number' }, 'numeric'],
    [{ type: 'text', inputType: 'color' }, 'color'],
    [{ type: 'text', inputType: 'date' }, 'date'],
    [{ type: 'text', inputType: 'datetime-local' }, 'datetime-local'],
    [{ type: 'text', inputType: 'datetime' }, 'datetime'],
    [{ type: 'text', inputType: 'time' }, 'time'],
    [{ type: 'text', inputType: 'url' }, 'url'],
    [{ type: 'text', inputType: 'tel' }, 'tel'],
    [{ type: 'text', inputType: 'email' }, 'email'],
    [{ type: 'text' }, 'text'],
  ])('maps text question %j to %s', async (question, expected) => {
    expect(await getFieldType(question)).toBe(expected);
  });

  it.each([
    [{ type: 'expression', displayStyle: 'date' }, 'date'],
    [{ type: 'expression', displayStyle: 'decimal' }, 'decimal'],
    [{ type: 'expression', displayStyle: 'currency' }, 'decimal'],
    [{ type: 'expression', displayStyle: 'percent' }, 'decimal'],
    [{ type: 'expression', displayStyle: 'number' }, 'numeric'],
    [{ type: 'expression' }, 'text'],
  ])('maps expression question %j to %s', async (question, expected) => {
    expect(await getFieldType(question)).toBe(expected);
  });

  it.each([
    'file',
    'checkbox',
    'radiogroup',
    'dropdown',
    'multipletext',
    'matrix',
    'matrixdropdown',
    'matrixdynamic',
    'boolean',
    'resource',
    'resources',
    'tagbox',
    'users',
    'owner',
    'geospatial',
    'editor',
    'people-dropdown',
    'people-tagbox',
  ])('maps %s questions to their own type', async (type) => {
    expect(await getFieldType({ type })).toBe(type);
  });

  it('defaults to text for unknown question types', async () => {
    expect(await getFieldType({ type: 'something-else' })).toBe('text');
    expect(await getFieldType({})).toBe('text');
  });
});
