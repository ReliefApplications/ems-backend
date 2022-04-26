import { RequestOptions, RESTDataSource } from 'apollo-datasource-rest';
import { DataSources } from 'apollo-server-core/dist/graphqlOptions';
import { status, referenceDataType } from '../../const/enumTypes';
import { ApiConfiguration, ReferenceData } from '../../models';
import { getToken } from '../../utils/proxy';
import { get } from 'lodash';

/**
 * CustomAPI class to create a dataSource fetching from an APIConfiguration.
 * If nothing is passed in the constructor, it will only be a standard REST DataSource.
 */
export class CustomAPI extends RESTDataSource {
  public apiConfiguration: ApiConfiguration;

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
  }

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
  ): Promise<{ value: any; text: string }[]> {
    try {
      const res = await this.get(endpoint);
      const choices = path ? [...get(res, path)] : [...res];
      if (hasOther) {
        choices.push({ [value]: 'other', [text]: 'Other' });
      }
      return choices
        ? choices.map((x: any) => ({
            value: value ? get(x, value) : x,
            text: text ? get(x, text) : value ? get(x, value) : x,
          }))
        : [];
    } catch {
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
        let query = '{ ' + (referenceData.query || '') + ' { ';
        for (const field of referenceData.fields || []) {
          query += field + ' ';
        }
        query += '} }';
        const graphqlEndpoint = 'graphql'; // TO-DO: get it from apiConfiguration
        const url = apiConfiguration.endpoint + graphqlEndpoint;
        const data = JSON.parse(await this.post(url, { query }));
        let items = referenceData.path ? get(data, referenceData.path) : data;
        items = referenceData.query ? items[referenceData.query] : items;
        return items;
      }
      case referenceDataType.rest: {
        const url = apiConfiguration.endpoint + referenceData.query;
        const data = await this.get(url);
        return referenceData.path ? get(data, referenceData.path) : data;
      }
      case referenceDataType.static: {
        return referenceData.data;
      }
    }
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
