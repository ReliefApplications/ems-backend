const getPipelineSortStages = (obj: any): any[] => {
  // there's always only one key value pair at most in the object
  if (!obj) return [];
  const [col] = Object.keys(obj);
  if (!col) return [];

  obj[col] = obj[col] === 'asc' ? 1 : -1;

  switch (col) {
    case 'name':
      return [
        { $addFields: { lowercase: { $toLower: `$${col}` } } },
        { $sort: { lowercase: obj[col] } },
      ];
    case 'recordsCount':
      return [
        {
          $lookup: {
            from: 'records',
            localField: '_id',
            foreignField: 'form',
            pipeline: [{ $match: { archived: { $ne: true } } }],
            as: 'records',
          },
        },
        { $addFields: { countRecords: { $size: '$records' } } },
        { $sort: { countRecords: obj[col] } },
      ];
    case 'versionsCount':
      return [
        { $addFields: { countVersions: { $size: '$versions' } } },
        { $sort: { countVersions: obj[col] } },
      ];
    case 'parentForm':
      return [
        {
          $lookup: {
            from: 'resources',
            localField: 'resource',
            foreignField: '_id',
            pipeline: [{ $match: { archived: { $ne: true } } }],
            as: 'resourceArr',
          },
        },
        {
          $addFields: {
            pForm: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$resourceArr', []] },
                    { $ne: ['$core', true] },
                  ],
                },
                then: { $arrayElemAt: ['$resourceArr', 0] },
                else: { name: null },
              },
            },
          },
        },
        { $sort: { 'pForm.name': obj[col] } },
      ];
    default:
      return [{ $sort: { ...obj } }];
  }
};

export default getPipelineSortStages;
