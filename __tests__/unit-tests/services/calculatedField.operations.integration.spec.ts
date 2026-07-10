import mongoose from 'mongoose';
import { Record, Resource } from '@models';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { DatabaseHelpers } from '../../helpers/database-helpers';

let databaseHelpers: DatabaseHelpers;

/** Counter to build unique incremental ids for seeded records */
let seq = 0;

/**
 * Seeds a record of the given resource.
 *
 * @param resource Resource the record belongs to
 * @param data Record data
 * @returns The saved record
 */
const seedRecord = async (resource: any, data: any) => {
  const formId = new mongoose.Types.ObjectId();
  return new Record({
    incrementalId: `2026-D${String(++seq).padStart(7, '0')}`,
    form: formId,
    _form: { _id: formId, name: resource.name },
    resource: resource._id,
    data,
  }).save();
};

describe('existing calc operations against a real database', () => {
  let resource: any;

  /**
   * Runs a calculated-field expression over the resource records and returns
   * the computed values indexed by the record `key` data field.
   *
   * @param expression Calculated-field expression
   * @param options Optional service configuration overrides
   * @param options.timeZone User timezone
   * @param options.userAttributes User contextual attributes
   * @returns Map of `key` value → computed `data.result` value
   */
  const compute = async (
    expression: string,
    options: { timeZone?: string; userAttributes?: any } = {}
  ): Promise<globalThis.Record<string, any>> => {
    const service = new CalculatedFieldService(
      resource,
      null,
      options.timeZone ?? 'UTC',
      options.userAttributes ?? {}
    );
    const stages = await service.build(expression, 'result');
    const results = await Record.aggregate([
      { $match: { resource: resource._id } },
      ...(stages as any[]),
    ]);
    return Object.fromEntries(
      results.map((r: any) => [r.data.key, r.data.result])
    );
  };

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    resource = await new Resource({
      name: 'measurements',
      fields: [
        { name: 'key', type: 'text' },
        { name: 'quantity', type: 'numeric' },
        { name: 'price', type: 'numeric' },
        { name: 'label', type: 'text' },
        { name: 'tags', type: 'tagbox' },
        { name: 'start', type: 'datetime' },
        { name: 'end', type: 'datetime' },
        { name: 'amount_text', type: 'text' },
        { name: 'region', type: 'text' },
        {
          name: 'status',
          type: 'dropdown',
          choices: [
            { value: 'open', text: 'Open' },
            { value: 'closed', text: 'Closed' },
          ],
        },
        {
          name: 'levels',
          type: 'tagbox',
          choices: [
            { value: 1, text: 'Low' },
            { value: 2, text: 'High' },
          ],
        },
      ],
    }).save();

    await seedRecord(resource, {
      key: 'r1',
      quantity: 10,
      price: 2.5,
      label: 'alpha',
      tags: ['a', 'b', 'c'],
      start: new Date('2026-03-01T10:00:00Z'),
      end: new Date('2026-03-01T12:30:00Z'),
      amount_text: '42',
      region: 'Europe',
      status: 'open',
      levels: [1, 2],
    });
    await seedRecord(resource, {
      key: 'r2',
      quantity: 0,
      price: 4,
      label: 'beta',
      tags: [],
      start: new Date('2025-12-31T23:30:00Z'),
      end: new Date('2026-01-01T00:30:00Z'),
      amount_text: '7',
      region: 'Africa',
      status: 'closed',
      levels: [2],
    });
    // r3 has missing / null-ish values
    await seedRecord(resource, {
      key: 'r3',
      label: 'gamma',
      status: 'unknown_value',
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  describe('math', () => {
    it('add / sub / mul with field references', async () => {
      expect(await compute('{{calc.add({{data.quantity}}; 5)}}')).toEqual({
        r1: 15,
        r2: 5,
        r3: null, // math over a missing value yields null
      });
      expect(await compute('{{calc.sub({{data.quantity}}; 1)}}')).toEqual({
        r1: 9,
        r2: -1,
        r3: null,
      });
      expect(
        await compute('{{calc.mul({{data.quantity}}; {{data.price}})}}')
      ).toEqual({ r1: 25, r2: 0, r3: null });
    });

    it('div', async () => {
      expect(await compute('{{calc.div({{data.quantity}}; 4)}}')).toEqual({
        r1: 2.5,
        r2: 0,
        r3: null,
      });
    });

    it('nested arithmetic', async () => {
      // (quantity * price) + 1
      expect(
        await compute(
          '{{calc.add({{calc.mul({{data.quantity}}; {{data.price}})}}; 1)}}'
        )
      ).toEqual({ r1: 26, r2: 1, r3: null });
    });
  });

  describe('comparisons & logic', () => {
    it('gt / lte on numbers', async () => {
      expect(await compute('{{calc.gt({{data.quantity}}; 5)}}')).toEqual({
        r1: true,
        r2: false,
        r3: false,
      });
      expect(await compute('{{calc.lte({{data.quantity}}; 0)}}')).toEqual({
        r1: false,
        r2: true,
        r3: true,
      });
    });

    it('eq / ne on strings', async () => {
      expect(await compute('{{calc.eq({{data.label}}; "alpha")}}')).toEqual({
        r1: true,
        r2: false,
        r3: false,
      });
      expect(await compute('{{calc.ne({{data.label}}; "alpha")}}')).toEqual({
        r1: false,
        r2: true,
        r3: true,
      });
    });

    it('and / or over comparisons', async () => {
      expect(
        await compute(
          '{{calc.and({{calc.gt({{data.quantity}}; 5)}}; {{calc.eq({{data.label}}; "alpha")}})}}'
        )
      ).toEqual({ r1: true, r2: false, r3: false });
      expect(
        await compute(
          '{{calc.or({{calc.gt({{data.quantity}}; 5)}}; {{calc.eq({{data.label}}; "beta")}})}}'
        )
      ).toEqual({ r1: true, r2: true, r3: false });
    });

    it('if returns the right branch', async () => {
      expect(
        await compute(
          '{{calc.if({{calc.gt({{data.quantity}}; 5)}}; "big"; "small")}}'
        )
      ).toEqual({ r1: 'big', r2: 'small', r3: 'small' });
    });

    it('exists', async () => {
      expect(await compute('{{calc.exists({{data.quantity}})}}')).toEqual({
        r1: true,
        r2: false, // $toBool(0) is false
        r3: null, // missing value resolves to null
      });
    });
  });

  describe('arrays', () => {
    it('size counts array items, 0 for non-arrays', async () => {
      expect(await compute('{{calc.size({{data.tags}})}}')).toEqual({
        r1: 3,
        r2: 0,
        r3: 0,
      });
    });

    it('includes', async () => {
      expect(await compute('{{calc.includes({{data.tags}}; "b")}}')).toEqual({
        r1: true,
        r2: false,
        r3: false,
      });
    });

    it('join concatenates with the separator', async () => {
      expect(await compute('{{calc.join({{data.tags}}; ", ")}}')).toEqual({
        r1: 'a, b, c',
        r2: '',
        r3: '',
      });
    });
  });

  describe('strings', () => {
    it('concat mixes fields and constants', async () => {
      expect(
        await compute('{{calc.concat({{data.label}}; "-"; {{data.region}})}}')
      ).toEqual({ r1: 'alpha-Europe', r2: 'beta-Africa', r3: 'gamma-' });
    });

    it('concat formats date operands as YYYY-MM-DD', async () => {
      expect(
        await compute('{{calc.concat("on "; {{data.start}})}}')
      ).toEqual({ r1: 'on 2026-03-01', r2: 'on 2025-12-31', r3: 'on ' });
    });

    it('substr', async () => {
      expect(await compute('{{calc.substr({{data.label}}; 1; 3)}}')).toEqual({
        r1: 'lph',
        r2: 'eta',
        r3: 'amm',
      });
    });
  });

  describe('conversions', () => {
    it('toInt / toLong parse numeric strings', async () => {
      expect(await compute('{{calc.toInt({{data.amount_text}})}}')).toEqual({
        r1: 42,
        r2: 7,
        r3: null,
      });
      expect(await compute('{{calc.toLong({{data.amount_text}})}}')).toEqual({
        r1: 42,
        r2: 7,
        r3: null,
      });
    });
  });

  describe('dates', () => {
    it('extracts date parts in UTC', async () => {
      expect(await compute('{{calc.year({{data.start}})}}')).toEqual({
        r1: 2026,
        r2: 2025,
        r3: null,
      });
      expect(await compute('{{calc.month({{data.start}})}}')).toEqual({
        r1: 3,
        r2: 12,
        r3: null,
      });
      expect(await compute('{{calc.hour({{data.start}})}}')).toEqual({
        r1: 10,
        r2: 23,
        r3: null,
      });
    });

    it('extracts date parts in the user timezone', async () => {
      // 2025-12-31T23:30Z is already 2026-01-01 in Paris
      expect(
        await compute('{{calc.year({{data.start}})}}', {
          timeZone: 'Europe/Paris',
        })
      ).toEqual({ r1: 2026, r2: 2026, r3: null });
    });

    it('datediff returns minutes', async () => {
      expect(
        await compute('{{calc.datediff({{data.start}}; {{data.end}})}}')
      ).toEqual({ r1: 150, r2: 60, r3: null });
    });

    it('today returns the current date, with optional day offset', async () => {
      const now = Date.now();
      const values = await compute('{{calc.today()}}');
      for (const key of ['r1', 'r2', 'r3']) {
        expect(
          Math.abs(new Date(values[key]).getTime() - now)
        ).toBeLessThan(60 * 1000);
      }
      const shifted = await compute('{{calc.today(5)}}');
      expect(
        Math.abs(
          new Date(shifted.r1).getTime() - (now + 5 * 24 * 60 * 60 * 1000)
        )
      ).toBeLessThan(60 * 1000);
    });
  });

  describe('user attributes', () => {
    it('inlines user attributes as constants', async () => {
      expect(
        await compute('{{calc.eq({{user.region}}; {{data.region}})}}', {
          userAttributes: { region: 'Europe' },
        })
      ).toEqual({ r1: true, r2: false, r3: false });
    });

    it('falls back to empty string for missing attributes', async () => {
      expect(
        await compute('{{calc.concat({{user.missing}}; {{data.label}})}}')
      ).toEqual({ r1: 'alpha', r2: 'beta', r3: 'gamma' });
    });
  });

  describe('displayValue', () => {
    it('resolves stored values to their choice labels', async () => {
      expect(await compute("{{calc.displayValue('status')}}")).toEqual({
        r1: 'Open',
        r2: 'Closed',
        r3: 'unknown_value', // unknown values fall back to the stored value
      });
    });

    it('resolves multi-select values element by element', async () => {
      expect(await compute("{{calc.displayValue('levels')}}")).toEqual({
        r1: ['Low', 'High'],
        r2: ['High'],
        r3: undefined, // mapping over a missing array leaves the field unset
      });
    });

    it('composes inside concat', async () => {
      expect(
        await compute(
          "{{calc.concat('Status: '; {{calc.displayValue('status')}})}}"
        )
      ).toEqual({
        r1: 'Status: Open',
        r2: 'Status: Closed',
        r3: 'Status: unknown_value',
      });
    });
  });

  describe('grid semantics (filter & sort on calculated values)', () => {
    it('supports filtering on a computed value, as the records query does', async () => {
      const service = new CalculatedFieldService(resource, null, 'UTC');
      const stages = await service.build(
        '{{calc.mul({{data.quantity}}; {{data.price}})}}',
        'total'
      );
      const results = await Record.aggregate([
        { $match: { resource: resource._id } },
        ...(stages as any[]),
        { $match: { 'data.total': { $gt: 10 } } },
      ]);
      expect(results.map((r: any) => r.data.key)).toEqual(['r1']);
    });

    it('supports sorting on a computed value', async () => {
      const service = new CalculatedFieldService(resource, null, 'UTC');
      const stages = await service.build(
        '{{calc.mul({{data.quantity}}; {{data.price}})}}',
        'total'
      );
      const results = await Record.aggregate([
        { $match: { resource: resource._id } },
        ...(stages as any[]),
        { $sort: { 'data.total': -1, _id: 1 } },
      ]);
      expect(results.map((r: any) => r.data.key)).toEqual(['r1', 'r2', 'r3']);
    });
  });
});
