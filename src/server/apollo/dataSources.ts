import { RequestOptions, RESTDataSource } from 'apollo-datasource-rest';
import { DataSources } from 'apollo-server-core/dist/graphqlOptions';
import { status } from '../../const/enumTypes';
import { ApiConfiguration } from '../../models';
import { getToken } from '../../utils/proxy';

export default async (): Promise<() => DataSources<any>> => {
  const apiConfigurations = await ApiConfiguration.find({ status: status.active });
  return () => apiConfigurations.reduce((o, apiConfiguration) => {
    return { ...o, [apiConfiguration.name]: new CustomAPI(apiConfiguration)}
  }, {});
};

class CustomAPI extends RESTDataSource {

  public apiConfiguration: ApiConfiguration;

  constructor(apiConfiguration: ApiConfiguration) {
    super();
    this.apiConfiguration = apiConfiguration;
    this.baseURL = this.apiConfiguration.endpoint;
  }

  async willSendRequest(request: RequestOptions) {
    const token: string = await getToken(this.apiConfiguration);
    request.headers.set('Authorization', token);
  }
}
