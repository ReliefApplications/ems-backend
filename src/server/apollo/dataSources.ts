import {
  RequestOptions,
  Response,
  RESTDataSource,
} from 'apollo-datasource-rest';
import { DataSources } from 'apollo-server-core/dist/graphqlOptions';
import { Placeholder } from '@const/placeholders';
import { status, referenceDataType } from '@const/enumTypes';
import { ApiConfiguration, ReferenceData } from '@models';
import { getToken } from '@utils/proxy';
import { get, memoize } from 'lodash';
import NodeCache from 'node-cache';
import { logger } from '@services/logger.service';

/** Local storage initialization */
const referenceDataCache: NodeCache = new NodeCache();
/** Local storage key for last modified */
const LAST_MODIFIED_KEY = '_last_modified';
/** Local storage key for last request */
const LAST_REQUEST_KEY = '_last_request';

/**
 * CustomAPI class to create a dataSource fetching from an APIConfiguration.
 * If nothing is passed in the constructor, it will only be a standard REST DataSource.
 */
export class CustomAPI extends RESTDataSource {
  public apiConfiguration: ApiConfiguration;

  /**
   * Memoized function to save external requests while on the same DataSource instance.
   * One DataSource instance is corresponding to one incoming request.
   */
  private memoizedReferenceDataGraphQLItems: any;

  /**
   * Construct a CustomAPI.
   *
   * @param apiConfiguration optional argument used to initialize the calls using the passed ApiConfiguration
   */
  constructor(apiConfiguration?: ApiConfiguration) {
    super();
    if (apiConfiguration) {
      this.apiConfiguration = apiConfiguration;
      this.baseURL = this.apiConfiguration.endpoint;
    }
    this.memoizedReferenceDataGraphQLItems = memoize(
      this.getReferenceDataGraphQLItems
    );
  }

  // initialize(config) {
  //   this.context = config.context;
  // }

  /**
   * Pass auth token if needed.
   *
   * @param request request sent.
   */
  async willSendRequest(request: RequestOptions) {
    if (this.apiConfiguration) {
      const token: string = await getToken(this.apiConfiguration);
      request.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  /**
   * Override method to enforce result to JSON.
   *
   * @param response response received.
   * @param _request request sent.
   * @returns parsed result.
   */
  async didReceiveResponse<TResult = any>(
    response: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _request: Request
  ): Promise<TResult> {
    if (response.ok) {
      response.headers.set('Content-Type', 'application/json');
      return this.parseBody(response) as any as Promise<TResult>;
    } else {
      throw await this.errorFromResponse(response);
    }
  }

  /**
   * Fetches choices from endpoint and return an array of value and text using parameters.
   *
   * @param endpoint endpoint used to fetch the data.
   * @param path path to the array of result in the request response.
   * @param value path to the value used for choices.
   * @param text path to the text used for choices.
   * @param hasOther to add an other choice if needed.
   * @returns choices formatted with value and text.
   */
  async getChoices(
    endpoint: string,
    path: string,
    value: string,
    text: string,
    hasOther: boolean
  ): Promise<{ value: string; text: string }[]> {
    try {
      const res = await this.get(endpoint);
      const choices = path ? [...get(res, path)] : [...res];
      if (hasOther) {
        choices.push({ [value]: 'other', [text]: 'Other' });
      }
      return choices
        ? choices.map((x: any) => ({
            value: String(value ? get(x, value) : x),
            text: String(text ? get(x, text) : value ? get(x, value) : x),
          }))
        : [];
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      return [];
    }
  }

  /**
   * Fetches referenceData objects from external API
   *
   * @param referenceData ReferenceData to fetch
   * @param apiConfiguration ApiConfiguration to use
   * @returns referenceData objects
   */
  async getReferenceDataItems(
    referenceData: ReferenceData,
    apiConfiguration: ApiConfiguration
  ): Promise<any[]> {
    switch (referenceData.type) {
      case referenceDataType.graphql: {
        // Call memoized function to save external requests.
        return this.memoizedReferenceDataGraphQLItems(
          referenceData,
          apiConfiguration
        );
      }
      case referenceDataType.rest: {
        const url = `${apiConfiguration.endpoint.replace(/\$/, '')}/${
          referenceData.query
        }`.replace(/([^:]\/)\/+/g, '$1');
        const data = await this.get(url);
        return referenceData.path ? get(data, referenceData.path) : data;
      }
      case referenceDataType.static: {
        return referenceData.data;
      }
    }
  }

  /**
   * Fetches referenceData objects from external API with GraphQL logic
   *
   * @param referenceData ReferenceData to fetch
   * @param apiConfiguration ApiConfiguration to use
   * @returns referenceData objects
   */
  private async getReferenceDataGraphQLItems(
    referenceData: ReferenceData,
    apiConfiguration: ApiConfiguration
  ) {
    // Initialization
    let items: any;
    // Add / between endpoint and path, and ensure that double slash are removed
    const url = `${apiConfiguration.endpoint.replace(/\$/, '')}/${
      apiConfiguration.graphQLEndpoint
    }`.replace(/([^:]\/)\/+/g, '$1');
    const cacheKey = referenceData.id || '';
    const cacheTimestamp = referenceDataCache.get(cacheKey + LAST_MODIFIED_KEY);
    const modifiedAt = referenceData.modifiedAt || '';
    // Check if same request
    if (!cacheTimestamp || cacheTimestamp < modifiedAt) {
      // Check if referenceData has changed. In this case, refresh choices instead of using cached ones.
      const body = {
        query: this.buildReferenceDataGraphQLQuery(referenceData, false),
      };
      const data = await this.post(url, body);
      items = referenceData.path ? get(data, referenceData.path) : data;
      items = referenceData.query ? items[referenceData.query] : items;
      referenceDataCache.set(cacheKey + LAST_MODIFIED_KEY, modifiedAt);
    } else {
      // If referenceData has not changed, use cached value and check for updates for graphQL.
      const cache: any[] = referenceDataCache.get(cacheKey);
      const isCached = cache !== undefined;
      const valueField = referenceData.valueField || 'id';
      const body = {
        query: this.buildReferenceDataGraphQLQuery(referenceData, isCached),
      };
      const data = await this.post(url, body);
      items = referenceData.path ? get(data, referenceData.path) : data;
      items = referenceData.query ? items[referenceData.query] : items;
      // Cache new items
      if (isCached) {
        if (cache && items && items.length) {
          for (const newItem of items) {
            const cachedItemIndex = cache.findIndex(
              (cachedItem) => cachedItem[valueField] === newItem[valueField]
            );
            if (cachedItemIndex !== -1) {
              cache[cachedItemIndex] = newItem;
            } else {
              cache.push(newItem);
            }
          }
        }
        items = cache || [];
      }
    }
    // Cache items and timestamp
    referenceDataCache.set(cacheKey, items);
    referenceDataCache.set(
      cacheKey + LAST_REQUEST_KEY,
      this.formatDateSQL(new Date())
    );
    return items;
  }

  /**
   * Build a graphQL query based on the ReferenceData configuration.
   *
   * @param referenceData Reference data configuration.
   * @param newItems do we need to query only new items
   * @returns GraphQL query.
   */
  private buildReferenceDataGraphQLQuery(
    referenceData: ReferenceData,
    newItems = false
  ): string {
    let query = '{ ' + (referenceData.query || '');
    if (newItems && referenceData.graphQLFilter) {
      let filter = `${referenceData.graphQLFilter}`;
      if (filter.includes(Placeholder.LAST_UPDATE)) {
        const lastUpdate: string =
          referenceDataCache.get(referenceData.id + LAST_REQUEST_KEY) ||
          this.formatDateSQL(new Date(0));
        filter = filter.split(Placeholder.LAST_UPDATE).join(lastUpdate);
      }
      query += '(' + filter + ')';
    }
    query += ' { ';
    for (const field of referenceData.fields || []) {
      query += field + ' ';
    }
    query += '} }';
    return query;
  }

  /**
   * Format a date to YYYY-MM-DD HH:MM:SS.
   *
   * @param date date to format.
   * @returns String formatted to YYYY-MM-DD HH:MM:SS.
   */
  private formatDateSQL(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000) // remove timezone
      .toISOString() // convert to iso string
      .replace('T', ' ') // remove the T between date and time
      .split('.')[0]; // remove the decimals after the seconds
  }
}

/**
 * Creates a data source for each active apiConfiguration. Create also an additional one for classic REST requests.
 *
 * @returns Definitions of the data sources.
 */
export default async (): Promise<() => DataSources<any>> => {
  const apiConfigurations = await ApiConfiguration.find({
    status: status.active,
  });
  return () => ({
    ...apiConfigurations.reduce((o, apiConfiguration) => {
      return { ...o, [apiConfiguration.name]: new CustomAPI(apiConfiguration) };
    }, {}),
    _rest: new CustomAPI(),
  });
};
