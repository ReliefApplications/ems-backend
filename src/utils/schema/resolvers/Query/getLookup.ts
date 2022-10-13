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
