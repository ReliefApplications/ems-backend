/** Mongoose pipeline stage enum definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum PipelineStage {
  FILTER = 'filter',
  SORT = 'sort',
  GROUP = 'group',
  ADD_FIELDS = 'addFields',
  UNWIND = 'unwind',
  CUSTOM = 'custom',
}

/** Mongoose accumulators enum definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum Accumulators {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MAX = 'max',
  MIN = 'min',
  FIRST = 'first',
  LAST = 'last',
}

/** Mongoose default operators enum definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum DefaultOperators {
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
  ADD = 'add',
  MULTIPLY = 'multiply',
}

/**
 * Maps pipeline operators short names with Mongo pipelines.
 */
export const operatorsMapping: {
  id: string;
  mongo: (field: string) => any;
}[] = [
  {
    id: Accumulators.SUM,
    mongo: (field: string): any => ({
      $sum: `$${field}`,
    }),
  },
  {
    id: Accumulators.AVG,
    mongo: (field: string): any => ({
      $avg: `$${field}`,
    }),
  },
  {
    id: Accumulators.COUNT,
    mongo: (): any => ({
      $sum: 1,
    }),
  },
  {
    id: Accumulators.MAX,
    mongo: (field: string): any => ({
      $max: `$${field}`,
    }),
  },
  {
    id: Accumulators.MIN,
    mongo: (field: string): any => ({
      $min: `$${field}`,
    }),
  },
  {
    id: Accumulators.FIRST,
    mongo: (field: string): any => ({
      $first: `$${field}`,
    }),
  },
  {
    id: Accumulators.LAST,
    mongo: (field: string): any => ({
      $last: `$${field}`,
    }),
  },
  {
    id: DefaultOperators.YEAR,
    mongo: (field: string): any => ({
      $year: { $toDate: `$${field}` },
    }),
  },
  {
    id: DefaultOperators.MONTH,
    mongo: (field: string): any => ({
      $dateToString: {
        date: { $toDate: `$${field}` },
        format: '%Y-%m',
      },
    }),
  },
  {
    id: DefaultOperators.WEEK,
    mongo: (field: string): any => ({
      $dateToString: { format: '%Y-week%V', date: { $toDate: `$${field}` } },
    }),
  },
  {
    id: DefaultOperators.DAY,
    mongo: (field: string): any => ({
      $dateToString: { format: '%Y-%m-%d', date: { $toDate: `$${field}` } },
    }),
  },
  {
    id: DefaultOperators.ADD,
    mongo: (field: string): any => ({
      $add: `$${field}`,
    }),
  },
  {
    id: DefaultOperators.MULTIPLY,
    mongo: (field: string): any => ({
      $multiply: `$${field}`,
    }),
  },
];

/**
 * Lists of forbidden pipelines operators.
 * Using one of them should throw an error.
 */
export const forbiddenKeywords: string[] = [
  '$accumulator',
  '$function',
  '$graphLookup',
  '$unionWith',
  '$lookup',
];
