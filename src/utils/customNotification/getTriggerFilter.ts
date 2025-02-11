import { CustomNotification, Resource } from '@models';
import getFilter from '@utils/schema/resolvers/Query/getFilter';

/**
 * Check if trigger has filters, if so return mongoose filter
 *
 * @param notification custom notification
 * @param resource resource object
 * @returns mongoose filter or empty object
 */
export default (notification: CustomNotification, resource: Resource) => {
  let mongooseFilter = {};
  // If triggers check if has filters
  if (notification.applicationTrigger && notification.filter?.filters?.length) {
    // TODO: take into account resources questions
    // Filter from the query definition
    mongooseFilter = getFilter(notification.filter, resource.fields);
  }
  return mongooseFilter;
};
