import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Form, Resource, Record, User } from '../../../../models';
import getFilter from './getFilter';
import getSortField from './getSortField';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';
import { decodeCursor, encodeCursor } from '../../../../schema/types';
import { getFullChoices, sortByTextCallback } from '../../../../utils/form';

const DEFAULT_FIRST = 25;

export default (id, data) => async (
  _,
  {
    sortField,
    sortOrder = 'asc',
    first = DEFAULT_FIRST,
    skip = 0,
    afterCursor,
    filter = {},
    display = false,
  },
  context,
) => {

  switch (sortField) {
    case 'createdBy.username':
      sortField = 'createdBy.user.username';
      break;
    case 'createdBy.name':
      sortField = 'createdBy.user.name';
      break;
    case 'createdBy.id':
      sortField = 'createdBy.user._id';
      break;
    default:
      break;
  }

  const user: User = context.user;
  if (!user) {
    throw new GraphQLError(errors.userNotLogged);
  }
  const ability: AppAbility = user.ability;

  // Filter from the query definition
  const mongooseFilter = getFilter(filter, data, context);

  Object.assign(mongooseFilter,
    { $or: [{ resource: id }, { form: id }] },
    { archived: { $ne: true } },
  );

  // PAGINATION
  const cursorFilters = afterCursor ? {
    _id: {
      $gt: decodeCursor(afterCursor),
    },
  } : {};

  // Get fields if we want to display with text
  let fields: any[] = [];
  // Need to get the meta in order to populate the choices.
  if (display || sortField) {
    const form = await Form.findOne({ _id: id }).select('fields');
    const resource = await Resource.findOne({ _id: id }).select('fields');
    fields = form ? form.fields : resource.fields;
  }

  let items: Record[] = [];
  let filters: any = {};
  // Filter from the user permissions
  let permissionFilters = [];
  if (ability.cannot('read', 'Record')) {
    const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions');
    permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
    if (permissionFilters.length > 0) {
      filters = { $and: [mongooseFilter, { $or: permissionFilters }] };
    } else {
      // If permissions are set up and no one match our role return null
      if (form.permissions.canSeeRecords.length > 0) {
        return {
          pageInfo: {
            hasNextPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
          totalCount: 0,
        };
      } else {
        filters = mongooseFilter;
      }
    }
  } else {
    filters = mongooseFilter;
  }
  const sortByField = fields.find(x => x && x.name === sortField);
  // console.log('sortByField');
  // console.log(sortByField);
  // console.log(fields);
  
  // Check if we need to fetch choices to sort records
  if (sortByField && (sortByField.choices || sortByField.choicesByUrl)) {
    console.log('-------- IF');
    
    const promises: any[] = [Record.find(filters, ['_id', `data.${sortField}`]), getFullChoices(sortByField, context)];
    const res = await Promise.all(promises);
    let partialItems = res[0] as Record[];
    const choices = res[1] as any[];
    // Sort records using text value of the choices
    partialItems.sort(sortByTextCallback(choices, sortField, sortOrder));
    // Pagination
    if (skip || skip === 0) {
      partialItems = partialItems.slice(skip, skip + first);
    } else {
      partialItems = partialItems.filter(x => x._id > decodeCursor(afterCursor)).slice(0, first);
    }
    // Fetch full records now that we know which ones we want
    const sortedIds = partialItems.map(x => String(x._id));
    items = await Record.find({ _id: { $in: sortedIds } });
    items.sort((itemA, itemB) => sortedIds.indexOf(String(itemA._id)) - sortedIds.indexOf(String(itemB._id)));
  } else {
    console.log('-------- ELSE');
    if (skip || skip === 0) {
      // const newTab = await Record.find(filters).populate('createdBy.user').map((x: any) => {
      //   // console.log('-----------------------------');
      //   // console.log(x);
      //   return x.map((y: any) => {
      //     console.log('y');
      //     console.log(y);
      //     console.log('y.createdBy');
      //     console.log(y.createdBy.user);
      //     return {
      //       createdBy: {
      //         username: y.createdBy.username,
      //         name: y.createdBy.name,
      //         // id: y.createdBy._id
      //         ...y.createdBy,
      //       },
      //       // test:'hellooooo',
      //       ...y,
      //     };
      //   });
      // });

      // const newTab = await Record.find(filters).populate('createdBy.user');
      // console.log(newTab[2].createdBy.user.name);
      
      console.log('------------------------------------------------------');
      // console.log('newTab');
      // console.log(newTab);
      // console.log('$$$$$ newTab[2] $$$$$');
      // console.log(newTab[2]);
      // console.log('all: fields');
      // console.log(fields);
      // console.log('all: filters');
      // console.log(filters);
      // console.log('all: sortField');
      // console.log(sortField);
      // console.log('all: sortOrder');
      // console.log(sortOrder);
      console.log('sortField');
      console.log(sortField);
      console.log('sortOrder');
      console.log(sortOrder);
      console.log('skip');
      console.log(skip);
      console.log('first');
      console.log(first);
      // const a = getSortField(sortField);
      // console.log('getSortField');
      // console.log(a);

      const newTab = await Record.find(filters).populate('createdBy.user').sort([[getSortField(sortField), sortOrder]]).skip(skip);
      console.log('$$$$$$*****$$$$$ newTab');
      // arrray with the good order
      newTab.forEach((x) => console.log(x.createdBy.user.name));
      
      
      
      items = await Record.find(filters)
        .populate('createdBy.user')
        .sort([[getSortField(sortField), sortOrder]])
        .skip(skip)
        .limit(first + 1);
      console.log('items 1');
      // array with wrong order
      items.forEach((x) => console.log(x.createdBy.user.name));
      // console.log('skip');
      // console.log(skip);
      // console.log('first');
      // console.log(first);

      //it seems that llimit() function messes up the array
      
    } else {
      items = await Record.find({ $and: [cursorFilters, filters] })
        .populate('createdBy.user')
        .sort([[getSortField(sortField), sortOrder]])
        .limit(first + 1);
      // console.log('items 2');
      // console.log(items);
    }
  }

  // Construct output object and return
  const hasNextPage = items.length > first;
  if (hasNextPage) {
    items = items.slice(0, items.length - 1);
  }
  const edges = items.map(r => ({
    cursor: encodeCursor(r.id.toString()),
    node: display ? Object.assign(r, { display, fields }) : r,
  }));
  return {
    pageInfo: {
      hasNextPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    edges,
    totalCount: await Record.countDocuments(filters),
  };
};
