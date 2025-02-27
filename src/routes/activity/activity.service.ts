import { ActivityLog } from '@models/activityLog.model';
import { logger } from '@services/logger.service';
import getFilter from '@utils/filter/getFilter';
import { isNil } from 'lodash';
import { Types } from 'mongoose';
import { CompositeFilterDescriptor } from 'types';
import config from 'config';
import xlsBuilder from '@utils/files/xlsBuilder';
import { AppAbility } from '@security/defineUserAbility';
import ApiError from '../../abstractions/api-error';
import { StatusCodes } from 'http-status-codes';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/** Activity creation attributes interface */
export interface ActivityCreationAttributes {
  user: any;
  eventType: string;
  metadata: any;
}

/** Activity query options */
export interface QueryOptions {
  skip?: number;
  take?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: CompositeFilterDescriptor;
  userId?: string;
  applicationId?: string;
  timeZone?: string;
}

/** Date format options */
const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23', // Ensures 24-hour format
};

/** Available filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'username',
    type: 'text',
  },
  ...((config.get('user.attributes.list') || []) as any[]).map((x) => ({
    name: `attributes.${x.value}`,
    type: 'text',
  })),
  {
    name: 'metadata.title',
    type: 'text',
  },
];

/** Get attributes from configuration */
const attributes: any[] = config.get('user.attributes.list') || [];

/**
 * Activity service
 */
export class ActivityService {
  /** Filename for list export */
  private listExportFileName = 'recent-hits.xlsx';

  /** Filename for group by url export */
  private groupByUrlExportFileName = 'group-by-page.xlsx';

  /** Filename for group by user export */
  private groupByUserExportFileName = 'group-by-user.xlsx';

  /** Columns for list export */
  private listExportColumns = [
    { name: 'timestamp', title: 'Timestamp', field: 'timestamp' },
    { name: 'userId', title: 'User ID', field: 'userId' },
    { name: 'username', title: 'username', field: 'username' },
    ...attributes.map((x) => {
      return {
        name: x.text,
        title: x.text,
        field: `attributes.${x.value}`,
      };
    }),
    { name: 'page', title: 'Page', field: 'page' },
  ];

  /** Columns for group by url export */
  private groupByUrlExportColumns = [
    { name: 'count', title: 'Hits', field: 'count' },
    { name: 'page', title: 'Page', field: 'page' },
  ];

  /** Columns for group by user export */
  private groupByUserExportColumns = [
    { name: 'count', title: 'Hits', field: 'count' },
    { name: 'username', title: 'username', field: 'username' },
    ...attributes.map((x) => {
      return {
        name: x.text,
        title: x.text,
        field: `attributes.${x.value}`,
      };
    }),
  ];

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

  /**
   * Get list of activities
   *
   * @param query Query options
   * @returns List of activities & pagination details
   */
  async list(query: QueryOptions) {
    try {
      const skip = Number(query.skip || 0);
      const take = Number(query.take || 10);
      const sortField = (query.sortField || 'createdAt') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }
      const aggregation = await this.listAggregation(
        sortField,
        sortOrder,
        filters
      )
        .facet({
          items: [
            {
              $skip: skip,
            },
            {
              $limit: take,
            },
          ],
          totalCount: [
            {
              $count: 'count',
            },
          ],
        })
        .project({
          items: 1,
          // So totalCount is 0 if no item found
          totalCount: {
            $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0],
          },
        });
      return {
        items: aggregation[0].items,
        skip,
        take,
        total: aggregation[0].totalCount,
      };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Group activities by url
   *
   * @param query Query options
   * @returns Group of activities & pagination details
   */
  async groupByUrl(query: QueryOptions) {
    try {
      const skip = Number(query.skip || 0);
      const take = Number(query.take || 10);
      const sortField = (query.sortField || 'count') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }

      const aggregation = await this.groupByUrlAggregation(
        sortField,
        sortOrder,
        filters
      )
        .facet({
          items: [
            {
              $skip: skip,
            },
            {
              $limit: take,
            },
          ],
          totalCount: [
            {
              $count: 'count',
            },
          ],
        })
        .project({
          items: 1,
          // So totalCount is 0 if no item found
          totalCount: {
            $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0],
          },
        });
      return {
        items: aggregation[0].items,
        skip,
        take,
        total: aggregation[0].totalCount,
      };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Group activities by user
   *
   * @param query Query options
   * @returns Group of activities & pagination details
   */
  async groupByUser(query: QueryOptions) {
    try {
      const skip = Number(query.skip || 0);
      const take = Number(query.take || 10);
      const sortField = (query.sortField || 'count') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }

      const aggregation = await this.groupByUserAggregation(
        sortField,
        sortOrder,
        filters
      )
        .facet({
          items: [
            {
              $skip: skip,
            },
            {
              $limit: take,
            },
          ],
          totalCount: [
            {
              $count: 'count',
            },
          ],
        })
        .project({
          items: 1,
          // So totalCount is 0 if no item found
          totalCount: {
            $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0],
          },
        });
      return {
        items: aggregation[0].items,
        skip,
        take,
        total: aggregation[0].totalCount,
      };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Download list of activities
   *
   * @param query Query options
   * @returns File buffer
   */
  async downloadList(query: QueryOptions) {
    try {
      const timeZone: string = query.timeZone || 'UTC';
      const sortField = (query.sortField || 'createdAt') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }

      const totalCountAggregation = await this.listAggregation(
        sortField,
        sortOrder,
        filters
      ).count('count');

      const formattedData = [];

      for (let skip = 0; skip < totalCountAggregation[0].count; skip += 10000) {
        const aggregation = await this.listAggregation(
          sortField,
          sortOrder,
          filters
        )
          .skip(skip)
          .limit(1000);
        formattedData.push(
          ...aggregation.map((activity) => ({
            timestamp: this.formatDate(activity.createdAt, timeZone),
            userId: activity.userId?.toString(),
            page: activity.metadata?.title || '',
            username: activity.username,
            attributes: activity.attributes,
          }))
        );
      }

      const file = await xlsBuilder(
        this.listExportFileName,
        this.listExportColumns,
        formattedData
      );
      return { fileName: this.listExportFileName, file };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Download group by url activities
   *
   * @param query Query options
   * @returns File buffer
   */
  async downloadGroupByUrl(query: QueryOptions) {
    try {
      const sortField = (query.sortField || 'count') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }

      const aggregation = await this.groupByUrlAggregation(
        sortField,
        sortOrder,
        filters
      );
      const formattedData = aggregation.map((group) => ({
        count: group.count,
        page: group.metadata?.title || '',
      }));
      const file = await xlsBuilder(
        this.groupByUrlExportFileName,
        this.groupByUrlExportColumns,
        formattedData
      );
      return { fileName: this.groupByUrlExportFileName, file };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Download group by user activities
   *
   * @param query Query options
   * @returns File buffer
   */
  async downloadGroupByUser(query: QueryOptions) {
    try {
      const sortField = (query.sortField || 'count') as string;
      const sortOrder = (query.sortOrder || 'desc') as string;
      const filters: any[] = [
        ...(query.userId
          ? [{ userId: new Types.ObjectId(query.userId as string) }]
          : []),
        ...(query.applicationId
          ? [{ 'metadata.applicationId': query.applicationId }]
          : []),
      ];

      if (!isNil(query.filter)) {
        const queryFilters = getFilter(query.filter, FILTER_FIELDS);
        filters.push(queryFilters);
      }

      const aggregation = await this.groupByUserAggregation(
        sortField,
        sortOrder,
        filters
      );
      const formattedData = aggregation.map((group) => ({
        count: group.count,
        username: group.username,
        attributes: group.attributes,
      }));
      const file = await xlsBuilder(
        this.groupByUserExportFileName,
        this.groupByUserExportColumns,
        formattedData
      );
      return { fileName: this.groupByUserExportFileName, file };
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Check permission on ability to see user logs, throw an API error if needed
   *
   * @param user User doing the request
   * @param applicationId Application Id, optional
   */
  public checkPermission(user: any, applicationId?: string) {
    const ability: AppAbility = user.ability;
    // Check
    if (ability.cannot('manage', 'User')) {
      if (applicationId) {
        const appAbility = extendAbilityForApplications(user, applicationId);
        if (appAbility.can('manageUsers', 'Application')) {
          return;
        }
      }
      throw new ApiError('Permission not granted', StatusCodes.FORBIDDEN);
    }
  }

  /**
   * Format date
   *
   * @param date Date to format
   * @param timeZone User timezone
   * @returns formatted date
   */
  private formatDate(date: Date, timeZone: string) {
    const formattedParts = new Intl.DateTimeFormat('en-GB', {
      ...dateFormatOptions,
      timeZone,
    })
      .formatToParts(date) // Breaks down the date into individual parts
      .reduce(
        (acc, part) => ({ ...acc, [part.type]: part.value }),
        {} as Record<string, string>
      );
    return `${formattedParts.year}-${formattedParts.month}-${formattedParts.day} ${formattedParts.hour}:${formattedParts.minute}`;
  }

  /**
   * List aggregation
   *
   * @param sortField Sort field
   * @param sortOrder Sort order
   * @param filters Filters
   * @returns List activities aggregation
   */
  private listAggregation(
    sortField: string,
    sortOrder: string,
    filters: any[]
  ) {
    return ActivityLog.aggregate([
      // Only add filters if relevant
      ...(filters.length > 0
        ? [
            {
              $match: {
                $and: [...filters],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          userId: 1,
          username: 1,
          metadata: {
            $mergeObjects: [
              '$metadata',
              {
                title: { $ifNull: ['$metadata.title', '$metadata.url'] },
              },
            ],
          },
          attributes: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
      },
    ]);
  }

  /**
   * Group by url aggregation
   *
   * @param sortField Sort field
   * @param sortOrder Sort order
   * @param filters Filters
   * @returns Group by url aggregation
   */
  private groupByUrlAggregation(
    sortField: string,
    sortOrder: string,
    filters: any[]
  ) {
    return ActivityLog.aggregate([
      // Only add filters if relevant
      ...(filters.length > 0
        ? [
            {
              $match: {
                $and: [...filters],
              },
            },
          ]
        : []),
      {
        $addFields: {
          adjustedUrl: {
            $cond: [
              {
                $and: [
                  { $eq: ['$metadata.module', 'backoffice'] }, // Check if module is 'backoffice'
                  {
                    $regexMatch: {
                      input: '$metadata.url',
                      regex: /^\/applications\//,
                    },
                  }, // Check if url starts with '/applications/'
                ],
              },
              { $substr: ['$metadata.url', 13, -1] }, // Remove '/applications/' prefix
              '$metadata.url', // Otherwise, keep original value
            ],
          },
        },
      },
      {
        $group: {
          _id: '$adjustedUrl',
          count: { $sum: 1 },
          title: { $last: '$metadata.title' },
        },
      },
      {
        $project: {
          count: 1,
          _id: 0,
          'metadata.title': {
            $ifNull: ['$title', '$_id'],
          },
        },
      },
      {
        $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
      },
    ]);
  }

  /**
   * Group by user aggregation
   *
   * @param sortField Sort field
   * @param sortOrder Sort order
   * @param filters Filters
   * @returns Group by user aggregation
   */
  private groupByUserAggregation(
    sortField: string,
    sortOrder: string,
    filters: any[]
  ) {
    return ActivityLog.aggregate([
      // Only add filters if relevant
      ...(filters.length > 0
        ? [
            {
              $match: {
                $and: [...filters],
              },
            },
          ]
        : []),
      {
        $group: {
          _id: {
            username: '$username',
            attributes: {
              $cond: [{ $not: ['$username'] }, '$attributes', null],
            },
          },
          count: { $sum: 1 },
          attributes: { $last: '$attributes' },
        },
      },
      {
        $project: {
          username: '$_id.username',
          count: 1,
          attributes: 1,
          _id: 0,
        },
      },
      {
        $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
      },
    ]);
  }
}
