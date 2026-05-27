import axios from 'axios';
import config from 'config';

/**
 * Get a client-credentials access token for the common services API.
 *
 * @returns access token
 */
export const getToken = async (): Promise<string> => {
  const details: Record<string, string> = {
    grant_type: 'client_credentials',
    client_id: config.get('commonServices.clientId'),
    client_secret: config.get('commonServices.clientSecret'),
    scope: config.get('commonServices.scope'),
  };
  const formBody: string[] = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  const body = formBody.join('&');
  return (
    await axios({
      url: config.get('commonServices.tokenEndpoint'),
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
      maxRedirects: 35,
      data: body,
    })
  ).data.access_token;
};
