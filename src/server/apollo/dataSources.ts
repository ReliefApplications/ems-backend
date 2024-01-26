import { AugmentedRequest, RESTDataSource } from '@apollo/datasource-rest';
import { status, referenceDataType } from '@const/enumTypes';
import { ApiConfiguration, ReferenceData } from '@models';
import { getToken } from '@utils/proxy';
import { get, isEmpty, memoize, set } from 'lodash';
import NodeCache from 'node-cache';
import { logger } from '@services/logger.service';
import jsonpath from 'jsonpath';
import { ApolloServer } from '@apollo/server';
import { Context } from './context';
// eslint-disable-next-line import/no-extraneous-dependencies
import gql from 'graphql-tag';

/** Local storage initialization */
const referenceDataCache: NodeCache = new NodeCache();
/** Local storage key for last modified */
const LAST_MODIFIED_KEY = '_last_modified';
/** Local storage key for last request */
const LAST_REQUEST_KEY = '_last_request';
/** Property for filtering in requests */
const LAST_UPDATE_CODE = '{{lastUpdate}}';

/**
 * Transform reference data graphql variables, to make sure they have the correct format.
 *
 * @param query graphql query to send
 * @param variables variables mapping
 * @returns void
 */
const transformGraphQLVariables = (query: string, variables: any = {}) => {
  const graphQLQuery = gql(query);
  const definition = graphQLQuery.definitions?.[0];
  if (definition?.kind !== 'OperationDefinition') {
    return variables;
  }
  (definition.variableDefinitions ?? []).forEach((def) => {
    if (
      get(def, 'type.name.value') === 'JSON' &&
      get(variables, def.variable.name.value)
    ) {
      set(
        variables,
        def.variable.name.value,
        JSON.stringify(get(variables, def.variable.name.value))
      );
    }
  });
};

/**
 * CustomAPI class to create a dataSource fetching from an APIConfiguration.
 * If nothing is passed in the constructor, it will only be a standard REST DataSource.
 * Data sources are invoked, for example, when using reference data in a context involving the display of data, such as in a grid, or when fetching or downloading historical record items.
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
   * @param server Apollo server instance.
   * @param apiConfiguration optional argument used to initialize the calls using the passed ApiConfiguration
   */
  constructor(
    public server: ApolloServer<Context>,
    apiConfiguration?: ApiConfiguration
  ) {
    super(server ? { cache: server.cache } : undefined);
    if (apiConfiguration) {
      this.apiConfiguration = apiConfiguration;
      // We add the final '/' to make sure it is not removed when using URL builder
      this.baseURL = `${this.apiConfiguration.endpoint}/`;
    }
    this.memoizedReferenceDataGraphQLItems = memoize(
      this.getReferenceDataGraphQLItems
    );
  }

  /**
   * Pass auth token if needed.
   *
   * @param _ path, not used.
   * @param request request sent.
   */
  async willSendRequest(_: string, request: AugmentedRequest) {
    if (this.apiConfiguration) {
      const accessToken = (this.server as any).req.headers.accesstoken ?? '';
      const token: string = await getToken(this.apiConfiguration, accessToken);
      // eslint-disable-next-line @typescript-eslint/dot-notation
      request.headers['authorization'] = `Bearer ${token}`;
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
    _request: AugmentedRequest
  ): Promise<TResult> {
    if (response.ok) {
      response.headers.set('Content-Type', 'application/json');
      return this.parseBody(response) as any as Promise<TResult>;
    } else {
      // throw await this.errorFromResponse({ response: response as any });
      throw new Error(response.statusText);
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
   * @param variables supplementary graphQL variables
   * @returns referenceData objects
   */
  async getReferenceDataItems(
    referenceData: ReferenceData,
    apiConfiguration: ApiConfiguration,
    variables?: any
  ): Promise<any[]> {
    switch (referenceData.type) {
      case referenceDataType.graphql: {
        // Call memoized function to save external requests.
        return this.memoizedReferenceDataGraphQLItems(
          referenceData,
          apiConfiguration,
          variables
        );
      }
      case referenceDataType.rest: {
        const url = `${apiConfiguration.endpoint.replace(/\$/, '')}/${
          referenceData.query
        }`.replace(/([^:]\/)\/+/g, '$1');
        const data = await this.get(url);
        return referenceData.path
          ? jsonpath.query(data, referenceData.path)
          : data;
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
   * @param variables supplementary graphQL variables
   * @returns referenceData objects
   */
  private async getReferenceDataGraphQLItems(
    referenceData: ReferenceData,
    apiConfiguration: ApiConfiguration,
    variables?: any
  ) {
    // Initialization
    let items: any;
    // Add / between endpoint and path, and ensure that double slash are removed
    const url = `${apiConfiguration.endpoint.replace(/\$/, '')}/${
      apiConfiguration.graphQLEndpoint
    }`.replace(/([^:]\/)\/+/g, '$1');
    const cacheKey =
      referenceData.id +
      (variables && !isEmpty(variables) ? JSON.stringify(variables) : '');
    const cacheTimestamp = referenceDataCache.get(cacheKey + LAST_MODIFIED_KEY);
    const modifiedAt = referenceData.modifiedAt || '';
    const query = this.processQuery(referenceData);
    if (query) {
      transformGraphQLVariables(query, variables);
    }
    // Check if same request
    if (!cacheTimestamp || cacheTimestamp < modifiedAt) {
      // Check if referenceData has changed. In this case, refresh choices instead of using cached ones.
      const body = {
        query,
        variables: variables || {},
      };
      let data = await this.post(url, { body });
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      items = referenceData.path
        ? jsonpath.query(data, referenceData.path)
        : data;
      referenceDataCache.set(cacheKey + LAST_MODIFIED_KEY, modifiedAt);
    } else {
      // If referenceData has not changed, use cached value and check for updates for graphQL.
      const cache: any[] = referenceDataCache.get(cacheKey);
      const isCached = cache !== undefined;
      const valueField = referenceData.valueField || 'id';
      const body = {
        query,
        variables: variables || {},
      };
      let data = await this.post(url, { body });
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      items = referenceData.path
        ? jsonpath.query(data, referenceData.path)
        : data;
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
   * Processes a refData query, replacing template variables with values
   *
   * @param refData Reference data to process
   * @returns Processed query
   */
  private processQuery(refData: ReferenceData) {
    const { query, id } = refData;
    if (!query || !id) return query;

    const filterVariables = [LAST_UPDATE_CODE] as const;
    let processedQuery = query;
    for (const variable of filterVariables) {
      switch (variable) {
        case LAST_UPDATE_CODE:
          const lastUpdate =
            referenceDataCache.get<string>(id + LAST_REQUEST_KEY) ||
            this.formatDateSQL(new Date(0));
          processedQuery = processedQuery
            .split(LAST_UPDATE_CODE)
            .join(lastUpdate);
          break;
        default:
          logger.error('Unknown variable on refData query', variable);
      }
    }
    return processedQuery;
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
 * @param server Apollo server instance.
 * @returns Definitions of the data sources.
 */
export default async (server?: ApolloServer<Context>) => {
  const apiConfigurations = await ApiConfiguration.find({
    status: status.active,
  });
  return () =>
    ({
      ...apiConfigurations.reduce((o, apiConfiguration) => {
        return {
          ...o,
          [apiConfiguration.name]: new CustomAPI(server, apiConfiguration),
        };
      }, {}),
      _rest: new CustomAPI(server),
    } as Record<string, CustomAPI> & { _rest: CustomAPI });
};
