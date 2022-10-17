import { ReferenceData } from '../../../../models';
import buildReferenceDataAggregation from '../../../aggregation/buildReferenceDataAggregation';

/** Aggregate lookup query for createdBy filter */
export const createdByLookup = [
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy.user',
      foreignField: '_id',
      as: '_createdBy.user',
    },
  },
  {
    $unwind: {
      path: '$_createdBy.user',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      '_createdBy.user.id': { $toString: '$_createdBy.user._id' },
      lastVersion: {
        $arrayElemAt: ['$versions', -1],
      },
    },
  },
];

/** Aggregate lookup query for lastUpdatedBy filter */
export const lastUpdatedByLookup = [
  {
    $lookup: {
      from: 'users',
      localField: 'lastVersion.createdBy',
      foreignField: '_id',
      as: '_lastUpdatedBy',
    },
  },
  {
    $addFields: {
      _lastUpdatedBy: {
        $arrayElemAt: ['$_lastUpdatedBy', -1],
      },
    },
  },
  {
    $addFields: {
      '_lastUpdatedBy.user': {
        $ifNull: ['$_lastUpdatedBy', '$_createdBy.user'],
      },
    },
  },
  {
    $addFields: {
      '_lastUpdatedBy.user.id': { $toString: '$_lastUpdatedBy.user._id' },
      lastVersion: {
        $arrayElemAt: ['$versions', -1],
      },
    },
  },
];

/** Aggregate lookup query for form filter */
export const formLookup = [
  {
    $lookup: {
      from: 'forms',
      localField: 'form',
      foreignField: '_id',
      as: '_form',
    },
  },
  {
    $unwind: '$_form',
  },
];

/** Aggregate lookup query for version filter */
export const versionLookup = [
  {
    $lookup: {
      from: 'versions',
      localField: 'lastVersion',
      foreignField: '_id',
      as: 'lastVersion',
    },
  },
  { $unset: 'lastVersion' },
];

/**
 * Used to get resource filter with lookup query
 *
 * @param usedFields filter field to filter data
 * @param relatedFields form fields for resource filters
 * @returns resource aggregation lookup query
 */
export const getResourcesFilter = (usedFields: any, relatedFields: any) => {
  const resourcesToQuery = [
    ...new Set(usedFields.map((x) => x.split('.')[0])),
  ].filter((x) =>
    relatedFields.find((f) => f.name === x && f.type === 'resource')
  );

  let linkedRecordsAggregation = [];
  for (const resource of resourcesToQuery) {
    // Build linked records aggregations
    linkedRecordsAggregation = linkedRecordsAggregation.concat([
      {
        $lookup: {
          from: 'records',
          let: { recordId: `$data.${resource}` },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$recordId' }],
                },
              },
            },
          ],
          as: `_${resource}`,
        },
      },
      {
        $unwind: {
          path: `$_${resource}`,
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          [`_${resource}.id`]: { $toString: `$_${resource}._id` },
        },
      },
    ]);
  }
  return linkedRecordsAggregation;
};

/**
 * Used to get reference filter with aggregate lookup query
 *
 * @param usedFields filter field to filter data
 * @param relatedFields form fields for reference filters
 * @param context login user detail for build aggregation
 * @returns reference aggregation lookup query
 */
export const getReferenceFilter = async (
  usedFields: any,
  relatedFields: any,
  context: any
): Promise<any> => {
  const referenceDataFieldsToQuery = relatedFields.filter(
    (f) =>
      f.referenceData?.id &&
      [...new Set(usedFields.map((x) => x.split('.')[0]))].includes(f.name)
  );

  // Query needed reference datas
  const referenceDatas: ReferenceData[] = await ReferenceData.find({
    _id: referenceDataFieldsToQuery.map((f) => f.referenceData?.id),
  }).populate({
    path: 'apiConfiguration',
    model: 'ApiConfiguration',
    select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
  });

  // Build linked records aggregations
  const linkedReferenceDataAggregation = await Promise.all(
    referenceDataFieldsToQuery.map(async (field) => {
      const referenceData = referenceDatas.find(
        (x) => x.id === field.referenceData.id
      );
      return buildReferenceDataAggregation(referenceData, field, context);
    })
  );
  return linkedReferenceDataAggregation;
};
