import { Types } from 'mongoose';
import { formatValue, transformRecord } from '@utils/form/transformRecord';

describe('formatValue', () => {
  describe('date fields', () => {
    it.each(['date', 'datetime', 'datetime-local'])(
      'converts a %s value to the beginning of the day',
      (type) => {
        const result = formatValue({ type }, '2024-05-15');
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(
          new Date('2024-05-15').toISOString()
        );
      }
    );

    it('leaves nil date values untouched', () => {
      expect(formatValue({ type: 'date' }, null)).toBeUndefined();
      expect(formatValue({ type: 'date' }, undefined)).toBeUndefined();
    });
  });

  describe('text fields', () => {
    it('returns strings as is', () => {
      expect(formatValue({ type: 'text' }, 'hello')).toBe('hello');
    });

    it('joins array values into a comma-separated string', () => {
      expect(formatValue({ type: 'text' }, ['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('leaves nil text values untouched', () => {
      expect(formatValue({ type: 'text' }, null)).toBeUndefined();
    });
  });

  describe('time fields', () => {
    it('converts a HH:mm string to a UTC date on the epoch day', () => {
      const result = formatValue({ type: 'time' }, '10:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('1970-01-01T10:30:00.000Z');
    });

    it('leaves nil time values untouched', () => {
      expect(formatValue({ type: 'time' }, null)).toBeUndefined();
    });
  });

  describe('file fields', () => {
    it('keeps only the stored file properties', () => {
      const files = [
        {
          name: 'report.pdf',
          content: 'driveId',
          size: 1234,
          extraneous: true,
        },
      ];
      expect(formatValue({ type: 'file' }, files)).toEqual([
        { name: 'report.pdf', content: 'driveId' },
      ]);
    });

    it('preserves the type property when set', () => {
      const files = [
        { name: 'report.pdf', content: 'driveId', type: 'application/pdf' },
      ];
      expect(formatValue({ type: 'file' }, files)).toEqual([
        { name: 'report.pdf', content: 'driveId', type: 'application/pdf' },
      ]);
    });

    it('preserves the outdated flag only when true', () => {
      const files = [
        { name: 'a.pdf', content: '1', outdated: true },
        { name: 'b.pdf', content: '2', outdated: false },
      ];
      expect(formatValue({ type: 'file' }, files)).toEqual([
        { name: 'a.pdf', content: '1', outdated: true },
        { name: 'b.pdf', content: '2' },
      ]);
    });

    it('leaves nil file values untouched', () => {
      expect(formatValue({ type: 'file' }, null)).toBeUndefined();
    });
  });

  describe('resource fields', () => {
    it('returns a valid mongo id', () => {
      const id = new Types.ObjectId().toHexString();
      expect(formatValue({ type: 'resource' }, id)).toBe(id);
    });

    it('returns null for an invalid mongo id', () => {
      expect(formatValue({ type: 'resource' }, 'aaaaaaaaaaaa')).toBeNull();
    });

    it('leaves nil resource values untouched', () => {
      expect(formatValue({ type: 'resource' }, null)).toBeUndefined();
    });
  });

  describe('resources fields', () => {
    it('keeps only valid mongo ids', () => {
      const validId = new Types.ObjectId().toHexString();
      expect(
        formatValue({ type: 'resources' }, [validId, 'aaaaaaaaaaaa'])
      ).toEqual([validId]);
    });

    it('leaves non-array resources values untouched', () => {
      expect(formatValue({ type: 'resources' }, 'not-an-array')).toBeUndefined();
      expect(formatValue({ type: 'resources' }, null)).toBeUndefined();
    });
  });

  describe('people fields', () => {
    it('returns people-dropdown values as is', () => {
      expect(formatValue({ type: 'people-dropdown' }, 'user-1')).toBe(
        'user-1'
      );
      expect(formatValue({ type: 'people-dropdown' }, null)).toBeUndefined();
    });

    it('returns people-tagbox arrays as is', () => {
      expect(
        formatValue({ type: 'people-tagbox' }, ['user-1', 'user-2'])
      ).toEqual(['user-1', 'user-2']);
    });

    it('leaves non-array people-tagbox values untouched', () => {
      expect(
        formatValue({ type: 'people-tagbox' }, 'not-an-array')
      ).toBeUndefined();
    });
  });

  describe('other field types', () => {
    it('returns the value as is, even when nil', () => {
      expect(formatValue({ type: 'boolean' }, true)).toBe(true);
      expect(formatValue({ type: 'numeric' }, 42)).toBe(42);
      expect(formatValue({ type: 'checkbox' }, null)).toBeNull();
    });
  });
});

describe('transformRecord', () => {
  const fields = [
    { name: 'title', type: 'text' },
    { name: 'dueDate', type: 'date' },
    { name: 'active', type: 'boolean' },
  ];

  it('formats each value according to its field definition', async () => {
    const record = {
      title: ['a', 'b'],
      dueDate: '2024-05-15',
      active: true,
    };
    const result = await transformRecord(record, fields);
    expect(result.title).toBe('a,b');
    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.active).toBe(true);
  });

  it('removes values that do not match any field', async () => {
    const record = { title: 'hello', unknownField: 'value' };
    const result = await transformRecord(record, fields);
    expect(result).not.toHaveProperty('unknownField');
    expect(result.title).toBe('hello');
  });

  it('mutates and returns the same record object', async () => {
    const record = { title: 'hello' };
    expect(await transformRecord(record, fields)).toBe(record);
  });

  it('returns an empty record unchanged', async () => {
    expect(await transformRecord({}, fields)).toEqual({});
  });
});
