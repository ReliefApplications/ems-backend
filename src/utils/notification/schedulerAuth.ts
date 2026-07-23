import axios from 'axios';
import config from 'config';
import NodeCache from 'node-cache';
import { logger } from '@services/logger.service';
import { getToken } from '@utils/commonServices';

/** In-memory cache for service tokens keyed by clientId + scope */
const cache = new NodeCache();

type ClientCredentialsConfig = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
};

/**
 * Fetch an application access token using client_credentials for a given scope.
 * Tokens are cached by clientId and scope until close to expiry.
 *
 * @param creds Client credential settings (token URL, clientId, clientSecret)
 * @param scope OAuth V2 scope to request (use API `/.default` for app roles)
 * @returns access token string if successful
 */
const fetchToken = async (
  creds: ClientCredentialsConfig,
  scope: string
): Promise<string | undefined> => {
  try {
    if (!scope) return undefined;
    if (scope.endsWith('/access_as_user')) {
      logger.warn(
        `Requested client_credentials for delegated scope ${scope}. Use the API's /.default app role scope instead.`
      );
    }
    const cacheKey = `azure-token:${creds.clientId}:${scope}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) return cached;

    const details: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope,
    };
    const formBody: string[] = [];
    for (const property in details) {
      formBody.push(
        encodeURIComponent(property) +
          '=' +
          encodeURIComponent(details[property])
      );
    }
    const body = formBody.join('&');
    const res = await axios({
      url: creds.tokenUrl,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
      data: body,
    });
    const token = res.data?.access_token as string;
    const expiresIn = Number(res.data?.expires_in || 3600);
    if (token) {
      cache.set(cacheKey, token, Math.max(0, expiresIn - 30));
      return token;
    }
  } catch (err) {
    logger.error('Failed to fetch Azure token', {
      message: (err as any)?.message,
      stack: (err as any)?.stack,
      scope,
    });
  }
  return undefined;
};

/**
 * Get both tokens needed by the Azure Function execution:
 * - authorization: token the Function uses to call our backend API and fetch
 *   resource data (audience api://{clientId})
 * - accesstoken: token the Function uses to call the Common Services API
 *
 * Both are minted from the shared Common Services credentials; the Common
 * Services token is delegated to the established commonServices.getToken().
 *
 * @returns object with optional authorization and accesstoken
 */
export const getAzureFunctionTokens = async (): Promise<{
  authorization?: string;
  accesstoken?: string;
}> => {
  const creds: ClientCredentialsConfig = {
    tokenUrl: config.get<string>('commonServices.tokenEndpoint'),
    clientId: config.get<string>('commonServices.clientId'),
    clientSecret: config.get<string>('commonServices.clientSecret'),
  };
  const backendScope = `api://${creds.clientId}/.default`;

  const [authorization, accesstoken] = await Promise.all([
    fetchToken(creds, backendScope),
    getToken(),
  ]);

  return { authorization, accesstoken };
};
