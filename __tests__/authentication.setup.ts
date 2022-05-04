import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

/**
 * Gets the token from MSAL.
 *
 * @returns azure token.
 */
export async function acquireToken(): Promise<string> {
  const url = `${process.env.AUTH_URL}/realms/${process.env.REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', process.env.CLIENT_ID);
  params.append('username', 'dummy@dummy.com');
  params.append('password', 'dummy');

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
