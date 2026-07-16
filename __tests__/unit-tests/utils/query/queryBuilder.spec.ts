import {
  buildMetaQuery,
  buildQuery,
  buildTotalCountQuery,
} from '@utils/query/queryBuilder';
import { parse } from 'graphql';

/**
 * Collapse whitespace so assertions do not depend on indentation.
 *
 * @param value Raw GraphQL query string
 * @returns normalized string
 */
const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

describe('Query builder', () => {
  describe('buildQuery', () => {
    const scalarFields = [
      { kind: 'SCALAR', name: 'firstName' },
      { kind: 'SCALAR', name: 'lastName' },
    ];

    it('should return null when there is no query', () => {
      expect(buildQuery(null)).toBeNull();
      expect(buildQuery(undefined)).toBeNull();
    });

    it('should return null when the query has no field', () => {
      expect(buildQuery({ name: 'testRecords', fields: [] })).toBeNull();
    });

    it('should build a valid query from scalar fields', () => {
      const query = buildQuery({ name: 'testRecords', fields: scalarFields });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain('testRecords(');
      expect(normalized).toContain(
        'edges { node { canUpdate canDelete ,id ,firstName ,lastName }'
      );
      expect(normalized).toContain('totalCount');
    });

    it('should declare the pagination, sort, filter and display variables', () => {
      const query = buildQuery({ name: 'testRecords', fields: scalarFields });

      const normalized = normalize(query);
      expect(normalized).toContain(
        'query GetCustomQuery($first: Int, $skip: Int, $filter: JSON, $sortField: String, $sortOrder: String, $display: Boolean, $at: Date)'
      );
      expect(normalized).toContain(
        'first: $first, skip: $skip, sortField: $sortField, sortOrder: $sortOrder, filter: $filter, display: $display at: $at'
      );
    });

    it('should build related resource lists with their sort, page and filter arguments', () => {
      const query = buildQuery({
        name: 'testRecords',
        fields: [
          {
            kind: 'LIST',
            name: 'contacts',
            type: 'ContactList',
            sort: { field: 'createdAt', order: 'asc' },
            first: 10,
            filter: {
              logic: 'and',
              filters: [
                { field: 'status', operator: 'eq', value: 'active' },
                {
                  logic: 'or',
                  filters: [
                    { field: 'age', operator: 'gte', value: '18' },
                    { field: 'age', operator: 'lt', value: '65' },
                  ],
                },
              ],
            },
            fields: [{ kind: 'SCALAR', name: 'email' }],
          },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain(
        'contacts ( sortField: "createdAt", sortOrder: "asc", first: 10 filter: { logic: "and", filters: [{ field: "status", operator: "eq", value: "active" },{ logic: "or", filters: [{ field: "age", operator: "gte", value: "18" },{ field: "age", operator: "lt", value: "65" }]}]}, )'
      );
      // Nested lists expose permissions and their own id
      expect(normalized).toContain('{ canUpdate canDelete ,id ,email }');
    });

    it('should default missing sort field and page size in list arguments', () => {
      const query = buildQuery({
        name: 'testRecords',
        fields: [
          {
            kind: 'LIST',
            name: 'contacts',
            type: 'ContactList',
            sort: { field: null, order: 'desc' },
            filter: { field: 'status', operator: 'eq', value: 'active' },
            fields: [{ kind: 'SCALAR', name: 'email' }],
          },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain('sortField: null');
      expect(normalized).toContain('first: null');
      expect(normalized).toContain(
        'filter: { field: "status", operator: "eq", value: "active" }'
      );
    });

    it('should build reference data lists without arguments nor id', () => {
      const query = buildQuery({
        name: 'testRecords',
        fields: [
          {
            kind: 'LIST',
            name: 'countries',
            type: 'CountriesRef',
            fields: [{ kind: 'SCALAR', name: 'iso2' }],
          },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain('countries { iso2 }');
      expect(normalized).not.toContain('sortField: null');
    });

    it('should build nested objects with an id, except for reference data', () => {
      const query = buildQuery({
        name: 'testRecords',
        fields: [
          {
            kind: 'OBJECT',
            name: 'createdBy',
            type: 'User',
            fields: [{ kind: 'SCALAR', name: 'username' }],
          },
          {
            kind: 'OBJECT',
            name: 'category',
            type: 'CategoriesRef',
            fields: [{ kind: 'SCALAR', name: 'label' }],
          },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain('createdBy { id ,username }');
      expect(normalized).toContain('category { label }');
    });

    it('should ignore fields of unknown kind', () => {
      const query = buildQuery({
        name: 'testRecords',
        fields: [
          { kind: 'UNKNOWN', name: 'mystery' },
          { kind: 'SCALAR', name: 'firstName' },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      expect(query).not.toContain('mystery');
    });
  });

  describe('buildTotalCountQuery', () => {
    it('should return null when there is no query', () => {
      expect(buildTotalCountQuery(null)).toBeNull();
      expect(buildTotalCountQuery(undefined)).toBeNull();
    });

    it('should build a valid query only fetching the total count', () => {
      const query = buildTotalCountQuery({ name: 'testRecords' });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain(
        'query GetCustomQuery($first: Int, $skip: Int, $filter: JSON, $sortField: String, $sortOrder: String, $display: Boolean)'
      );
      expect(normalized).toContain('testRecords(');
      expect(normalized).toContain('{ totalCount }');
      expect(normalized).not.toContain('edges');
    });
  });

  describe('buildMetaQuery', () => {
    it('should return null when there is no query', () => {
      expect(buildMetaQuery(null)).toBeNull();
      expect(buildMetaQuery(undefined)).toBeNull();
    });

    it('should return null when the query has no field', () => {
      expect(buildMetaQuery({ name: 'testRecords', fields: [] })).toBeNull();
    });

    it('should build a valid meta query from the query fields', () => {
      const query = buildMetaQuery({
        name: 'testRecords',
        fields: [
          { kind: 'SCALAR', name: 'firstName' },
          {
            kind: 'OBJECT',
            name: 'createdBy',
            fields: [{ kind: 'SCALAR', name: 'username' }],
          },
          {
            kind: 'LIST',
            name: 'contacts',
            fields: [{ kind: 'SCALAR', name: 'email' }],
          },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      const normalized = normalize(query);
      expect(normalized).toContain('query GetCustomMetaQuery');
      expect(normalized).toContain('_testRecordsMeta {');
      expect(normalized).toContain('firstName');
      expect(normalized).toContain('createdBy { ,username }');
      expect(normalized).toContain('contacts { ,email }');
    });

    it('should ignore fields of unknown kind', () => {
      const query = buildMetaQuery({
        name: 'testRecords',
        fields: [
          { kind: 'UNKNOWN', name: 'mystery' },
          { kind: 'SCALAR', name: 'firstName' },
        ],
      });

      expect(() => parse(query)).not.toThrow();
      expect(query).not.toContain('mystery');
    });
  });
});
