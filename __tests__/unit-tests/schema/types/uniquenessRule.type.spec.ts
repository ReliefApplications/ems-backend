import { Resource } from '@models';
import { UniquenessRuleType } from '@schema/types';

describe('UniquenessRuleType id', () => {
  it('returns the id of the rule', () => {
    const resource = new Resource({
      name: 'Organization',
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    const rule = resource.uniquenessRules[0];
    const id = (UniquenessRuleType.getFields().id as any).resolve(rule);
    expect(rule._id).toBeDefined();
    expect(String(id)).toEqual(String(rule._id));
  });
});

describe('UniquenessRuleType dateIntersection', () => {
  /**
   * Resolve the date intersection of a rule
   *
   * @param rule uniqueness rule
   * @returns resolved date intersection
   */
  const resolve = (rule: any) =>
    (UniquenessRuleType.getFields().dateIntersection as any).resolve(rule);

  it('returns null for a rule stored without date intersection', () => {
    // Mongoose stores an empty object for the unset option
    const resource = new Resource({
      name: 'Organization',
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    expect(resolve(resource.uniquenessRules[0])).toBeNull();
  });

  it('returns the date intersection when its fields are set', () => {
    const resource = new Resource({
      name: 'Assignment',
      uniquenessRules: [
        {
          fields: ['expert'],
          severity: 'error',
          dateIntersection: { startField: 'start', endField: 'end' },
        },
      ],
    });
    const dateIntersection = resolve(resource.uniquenessRules[0]);
    expect(dateIntersection.startField).toEqual('start');
    expect(dateIntersection.endField).toEqual('end');
  });
});

describe('UniquenessRuleType condition', () => {
  /**
   * Resolve the condition of a rule
   *
   * @param rule uniqueness rule
   * @returns resolved condition
   */
  const resolve = (rule: any) =>
    (UniquenessRuleType.getFields().condition as any).resolve(rule);

  it('returns the filter of the rule', () => {
    const condition = {
      logic: 'or',
      filters: [{ field: 'status', operator: 'eq', value: 'Open' }],
    };
    expect(resolve({ condition })).toEqual(condition);
  });

  it('returns a filter for the conditions first stored as a list', () => {
    expect(
      resolve({
        condition: [{ field: 'status', operator: 'ne', value: 'Closed' }],
      })
    ).toEqual({
      logic: 'and',
      filters: [{ field: 'status', operator: 'neq', value: 'Closed' }],
    });
  });

  it('returns null when the rule has no condition', () => {
    expect(resolve({})).toBeNull();
  });
});
