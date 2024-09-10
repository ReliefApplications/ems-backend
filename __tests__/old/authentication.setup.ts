import fetch from 'node-fetch';
import config from 'config';

/**
 * Gets the token from MSAL.
 *
 * @returns azure token.
 */
export async function acquireToken(): Promise<string> {
  const url = `${config.get('auth.url')}/realms/${config.get(
    'auth.realm'
  )}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', config.get('auth.clientId'));
  params.append('username', 'dummy@dummy.com');
  params.append('password', 'password');

  const response = await fetch(url, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json();

  return data.access_token;
}
