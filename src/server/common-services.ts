import Axios from 'axios';
import {
  AxiosCacheInstance,
  setupCache,
  buildKeyGenerator,
} from 'axios-cache-interceptor';

let axios: AxiosCacheInstance;

/**
 * Create a dedicated axios instance for Common Services
 * Add cache mechanism
 * Cached requests expire after 5 minutes.
 *
 * @returns Common Services axios instance
 */
export default () => {
  if (!axios) {
    const instance = Axios.create();
    axios = setupCache(instance, {
      methods: ['get', 'post'],
      // Avoid using cache control set to false
      interpretHeader: false,
      // Generate an unique key, based on all parameters listed
      generateKey: buildKeyGenerator((request) => ({
        method: request.method,
        baseURL: request.baseURL,
        params: request.params,
        url: request.url,
        data: request.data,
        custom: request.headers.Authorization,
      })),
    });
  }
  return axios;
};
