import { Record } from '../../../../models';
import getFilter from './getFilter';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';

export default (
  dataItem: any,
  styles,
  context,
  data,
  filters,
  sortField,
  sortOrder,
  skip,
  first
) => {
  let itemsWithStyle = false;
  const styleToApply = {
    backgroundColor: '',
    textColor: '',
    textStyle: '',
    styleAppliedTo: '',
    fields: [],
  };

  // For each style we get the list of record corresponding
  Object.keys(styles).forEach(async (key) => {
    if (!itemsWithStyle) {
      const styleFilter = getFilter(styles[key].filter, data, context);
      // TODO
      // Apply styleFilter to items object already created
      const itemFiltered = await Record.aggregate([
        { $match: filters },
        { $match: styleFilter },
        { $addFields: { id: '$_id' } },
        { $match: { id: dataItem.id } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy.user',
            foreignField: '_id',
            as: 'createdBy.user',
          },
        },
        { $sort: { [getSortField(sortField)]: getSortOrder(sortOrder) } },
        { $skip: skip },
        { $limit: first + 1 },
      ]);

      // If the style rule matches our dataItem we send it's custom style.
      if (itemFiltered.length > 0) {
        itemsWithStyle = true;
        Object.assign(
          styleToApply,
          styles[key].backgroundColor && {
            backgroundColor: styles[key].backgroundColor,
          },
          styles[key].textColor && { textColor: styles[key].textColor },
          styles[key].textStyle && { textStyle: styles[key].textStyle },
          styles[key].styleAppliedTo && {
            styleAppliedTo: styles[key].styleAppliedTo,
          },
          styles[key].fields && { fields: styles[key].fields }
        );
      }
    }
  });

  return styleToApply;
};
