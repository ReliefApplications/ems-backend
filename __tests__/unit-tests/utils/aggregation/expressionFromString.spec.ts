import {
  getExpressionFromString,
  OperationTypeMap,
} from '@utils/aggregation/expressionFromString';

describe('getExpressionFromString', () => {
  describe('constants', () => {
    it('parses an integer', () => {
      expect(getExpressionFromString('42')).toEqual({
        type: 'const',
        value: 42,
      });
    });

    it('parses a float', () => {
      expect(getExpressionFromString('3.14')).toEqual({
        type: 'const',
        value: 3.14,
      });
    });

    it('parses a negative number', () => {
      expect(getExpressionFromString('-7')).toEqual({
        type: 'const',
        value: -7,
      });
    });

    it('parses a double-quoted string', () => {
      expect(getExpressionFromString('"hello"')).toEqual({
        type: 'const',
        value: 'hello',
      });
    });

    it('parses a single-quoted string', () => {
      expect(getExpressionFromString("'hello'")).toEqual({
        type: 'const',
        value: 'hello',
      });
    });

    it('parses booleans', () => {
      expect(getExpressionFromString('true')).toEqual({
        type: 'const',
        value: true,
      });
      expect(getExpressionFromString('false')).toEqual({
        type: 'const',
        value: false,
      });
    });

    it('parses null', () => {
      expect(getExpressionFromString('null')).toEqual({
        type: 'const',
        value: null,
      });
    });

    it('parses 0 as a number, not as a falsy edge case', () => {
      expect(getExpressionFromString('0')).toEqual({ type: 'const', value: 0 });
    });

    it('throws on a bare unquoted word', () => {
      expect(() => getExpressionFromString('hello')).toThrow(
        /Unexpected operator/
      );
    });

    it('trims surrounding whitespace', () => {
      expect(getExpressionFromString('  42  ')).toEqual({
        type: 'const',
        value: 42,
      });
    });
  });

  describe('placeholders', () => {
    it('parses a data field placeholder', () => {
      expect(getExpressionFromString('{{data.status}}')).toEqual({
        type: 'field',
        value: 'status',
      });
    });

    it('parses an info placeholder', () => {
      expect(getExpressionFromString('{{info.createdAt}}')).toEqual({
        type: 'info',
        value: 'createdAt',
      });
    });

    it('parses a user placeholder', () => {
      expect(getExpressionFromString('{{user.country}}')).toEqual({
        type: 'user',
        value: 'country',
      });
    });

    it('throws when the double braces are not closed', () => {
      expect(() => getExpressionFromString('{{data.status')).toThrow(
        /Invalid operation/
      );
    });
  });

  describe('operations', () => {
    it('throws on an unknown operation', () => {
      expect(() => getExpressionFromString('{{calc.frobnicate(1; 2)}}')).toThrow(
        /Invalid operation: frobnicate/
      );
    });

    it('parses a single-operand operation', () => {
      expect(getExpressionFromString('{{calc.size({{data.tags}})}}')).toEqual({
        type: 'expression',
        value: {
          operation: 'size',
          operator: { type: 'field', value: 'tags' },
        },
      });
    });

    it('parses a double-operand operation, preserving order', () => {
      expect(getExpressionFromString('{{calc.sub(5; 2)}}')).toEqual({
        type: 'expression',
        value: {
          operation: 'sub',
          operator1: { type: 'const', value: 5 },
          operator2: { type: 'const', value: 2 },
        },
      });
    });

    it('parses a variadic operation', () => {
      expect(getExpressionFromString('{{calc.add(1; 2; 3; 4)}}')).toEqual({
        type: 'expression',
        value: {
          operation: 'add',
          operators: [
            { type: 'const', value: 1 },
            { type: 'const', value: 2 },
            { type: 'const', value: 3 },
            { type: 'const', value: 4 },
          ],
        },
      });
    });

    it('parses nested expressions recursively', () => {
      expect(
        getExpressionFromString('{{calc.add({{calc.mul(2; 3)}}; 1)}}')
      ).toEqual({
        type: 'expression',
        value: {
          operation: 'add',
          operators: [
            {
              type: 'expression',
              value: {
                operation: 'mul',
                operators: [
                  { type: 'const', value: 2 },
                  { type: 'const', value: 3 },
                ],
              },
            },
            { type: 'const', value: 1 },
          ],
        },
      });
    });

    it('keeps argument separators inside quoted strings', () => {
      expect(getExpressionFromString('{{calc.concat("a;b"; "c")}}')).toEqual({
        type: 'expression',
        value: {
          operation: 'concat',
          operators: [
            { type: 'const', value: 'a;b' },
            { type: 'const', value: 'c' },
          ],
        },
      });
    });

    it('parses today without operand', () => {
      expect(getExpressionFromString('{{calc.today()}}')).toEqual({
        type: 'expression',
        value: { operation: 'today', operator: null },
      });
    });

    it('parses today with an offset operand', () => {
      expect(getExpressionFromString('{{calc.today(-3)}}')).toEqual({
        type: 'expression',
        value: { operation: 'today', operator: { type: 'const', value: -3 } },
      });
    });
  });

  describe('argument count validation', () => {
    it.each([
      ['size', '{{calc.size(1; 2)}}'],
      ['exists', '{{calc.exists()}}'],
      ['toInt', '{{calc.toInt(1; 2)}}'],
    ])('rejects wrong arity for single-operand %s', (op, exp) => {
      expect(() => getExpressionFromString(exp)).toThrow(
        new RegExp(`Invalid number of arguments for operation ${op}`)
      );
    });

    it.each([
      ['sub', '{{calc.sub(1)}}'],
      ['eq', '{{calc.eq(1; 2; 3)}}'],
      ['datediff', '{{calc.datediff(1)}}'],
    ])('rejects wrong arity for double-operand %s', (op, exp) => {
      expect(() => getExpressionFromString(exp)).toThrow(
        new RegExp(`Invalid number of arguments for operation ${op}`)
      );
    });

    it('rejects a variadic operation with a single operand', () => {
      expect(() => getExpressionFromString('{{calc.add(1)}}')).toThrow(
        /Invalid number of arguments for operation add/
      );
    });

    it('accepts if with 1 to 3 operands, rejects 4', () => {
      expect(() => getExpressionFromString('{{calc.if(true)}}')).not.toThrow();
      expect(() =>
        getExpressionFromString('{{calc.if(true; 1; 2)}}')
      ).not.toThrow();
      expect(() =>
        getExpressionFromString('{{calc.if(true; 1; 2; 3)}}')
      ).toThrow(/Invalid number of arguments for operation if/);
    });

    it('requires exactly 3 operands for substr', () => {
      expect(() => getExpressionFromString('{{calc.substr("abc"; 1)}}')).toThrow(
        /Invalid number of arguments for operation substr/
      );
    });

    it('rejects today with more than one operand', () => {
      expect(() => getExpressionFromString('{{calc.today(1; 2)}}')).toThrow(
        /Invalid number of arguments for operation today/
      );
    });
  });

  describe('displayValue', () => {
    it('parses a quoted field name', () => {
      expect(
        getExpressionFromString("{{calc.displayValue('country')}}")
      ).toEqual({
        type: 'expression',
        value: { operation: 'displayValue', fieldName: 'country' },
      });
    });

    it('rejects an unquoted field name', () => {
      expect(() =>
        getExpressionFromString('{{calc.displayValue(country)}}')
      ).toThrow(/quoted field name/);
    });

    it('rejects a wrong number of arguments', () => {
      expect(() =>
        getExpressionFromString("{{calc.displayValue('a'; 'b')}}")
      ).toThrow(/Invalid number of arguments for operation displayValue/);
    });
  });

  describe('related operations', () => {
    it('parses relatedValue with all arguments', () => {
      expect(
        getExpressionFromString(
          "{{calc.relatedValue('grades'; 'grade'; 'modifieddate'; 'desc')}}"
        )
      ).toEqual({
        type: 'expression',
        value: {
          operation: 'relatedValue',
          relatedName: 'grades',
          valueField: 'grade',
          sortField: 'modifieddate',
          sortOrder: 'desc',
        },
      });
    });

    it('accepts a case-insensitive sort order', () => {
      const parsed: any = getExpressionFromString(
        "{{calc.relatedValue('grades'; 'grade'; 'modifieddate'; 'DESC')}}"
      );
      expect(parsed.value.sortOrder).toBe('desc');
    });

    it('parses relatedCount with and without filter', () => {
      expect(getExpressionFromString("{{calc.relatedCount('teams')}}")).toEqual(
        {
          type: 'expression',
          value: { operation: 'relatedCount', relatedName: 'teams' },
        }
      );
      const withFilter: any = getExpressionFromString(
        '{{calc.relatedCount(\'teams\'; \'{"field":"active","operator":"eq","value":true}\')}}'
      );
      expect(withFilter.value.filter).toEqual({
        field: 'active',
        operator: 'eq',
        value: true,
      });
    });

    it('parses a composite JSON filter', () => {
      const parsed: any = getExpressionFromString(
        '{{calc.relatedExists(\'teams\'; \'{"logic":"or","filters":[{"field":"a","operator":"eq","value":1},{"field":"b","operator":"eq","value":2}]}\')}}'
      );
      expect(parsed.value.filter.logic).toBe('or');
      expect(parsed.value.filter.filters).toHaveLength(2);
    });

    it('keeps semicolons inside the quoted JSON filter', () => {
      const parsed: any = getExpressionFromString(
        '{{calc.relatedCount(\'teams\'; \'{"field":"name","operator":"eq","value":"a;b"}\')}}'
      );
      expect(parsed.value.filter.value).toBe('a;b');
    });

    it.each(['relatedSum', 'relatedMin', 'relatedMax', 'relatedAvg'])(
      'parses %s with a value field and optional filter',
      (op) => {
        expect(getExpressionFromString(`{{calc.${op}('teams'; 'grade')}}`)).toEqual({
          type: 'expression',
          value: { operation: op, relatedName: 'teams', valueField: 'grade' },
        });
        const withFilter: any = getExpressionFromString(
          `{{calc.${op}('teams'; 'grade'; '{"field":"active","operator":"eq","value":true}')}}`
        );
        expect(withFilter.value.filter.field).toBe('active');
      }
    );

    it('rejects an invalid sort order', () => {
      expect(() =>
        getExpressionFromString(
          "{{calc.relatedValue('grades'; 'grade'; 'date'; 'newest')}}"
        )
      ).toThrow(/sortOrder/);
    });

    it('rejects unquoted arguments', () => {
      expect(() =>
        getExpressionFromString('{{calc.relatedCount(teams)}}')
      ).toThrow(/quoted string/);
    });

    it('rejects invalid JSON in the filter argument', () => {
      expect(() =>
        getExpressionFromString("{{calc.relatedCount('teams'; '{oops')}}")
      ).toThrow(/valid JSON/);
    });

    it.each([
      ['relatedValue', "{{calc.relatedValue('teams'; 'grade')}}"],
      ['relatedCount', "{{calc.relatedCount('a'; 'b'; 'c')}}"],
      ['relatedSum', "{{calc.relatedSum('teams')}}"],
    ])('rejects wrong arity for %s', (op, exp) => {
      expect(() => getExpressionFromString(exp)).toThrow(
        new RegExp(`Invalid number of arguments for operation ${op}`)
      );
    });

    it('tolerates whitespace between arguments', () => {
      expect(
        getExpressionFromString(
          "{{calc.relatedValue( 'grades' ;  'grade' ; 'date' ; 'asc' )}}"
        )
      ).toEqual({
        type: 'expression',
        value: {
          operation: 'relatedValue',
          relatedName: 'grades',
          valueField: 'grade',
          sortField: 'date',
          sortOrder: 'asc',
        },
      });
    });

    it('nests inside other operations', () => {
      const parsed: any = getExpressionFromString(
        "{{calc.gt({{calc.relatedCount('teams')}}; 0)}}"
      );
      expect(parsed.value.operation).toBe('gt');
      expect(parsed.value.operator1.value.operation).toBe('relatedCount');
    });
  });

  describe('OperationTypeMap', () => {
    it('declares a type for every operation', () => {
      for (const type of Object.values(OperationTypeMap)) {
        expect(['numeric', 'boolean', 'date', 'text']).toContain(type);
      }
    });

    it('types the related operations', () => {
      expect(OperationTypeMap.relatedCount).toBe('numeric');
      expect(OperationTypeMap.relatedExists).toBe('boolean');
      expect(OperationTypeMap.relatedValue).toBe('text');
      expect(OperationTypeMap.relatedSum).toBe('numeric');
      expect(OperationTypeMap.relatedMin).toBe('numeric');
      expect(OperationTypeMap.relatedMax).toBe('numeric');
      expect(OperationTypeMap.relatedAvg).toBe('numeric');
    });
  });
});
