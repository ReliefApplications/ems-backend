import { ActivityLog } from '@models/activityLog.model';
import { logger } from '@services/logger.service';

/** Activity creation attributes interface */
interface ActivityCreationAttributes {
  user: any;
  eventType: string;
  metadata: any;
}
/**
 * Activity service
 */
export class ActivityService {
  /**
   * Create and save a new activity
   *
   * @param data New activity data
   * @returns Saved activity
   */
  async create(data: ActivityCreationAttributes) {
    try {
      const activity = new ActivityLog({
        userId: data.user._id,
        username: data.user.username,
        eventType: data.eventType,
        metadata: data.metadata,
        attributes: data.user.attributes,
      });
      await activity.save();
      return activity;
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  async getAll() {}

  async groupByUrl() {}

  async groupByUser() {}
}
