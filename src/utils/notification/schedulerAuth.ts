import axios from 'axios';
import config from 'config';
import NodeCache from 'node-cache';
import { logger } from '@services/logger.service';

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
 * Get both tokens needed by the Function:
 * - Authorization: token to call our backend API (backendScope)
 * - accesstoken: token to call Common Services API (csScope)
 */
/**
 * Get both tokens needed by the Azure Function execution:
 * - authorization: token to call our backend API
 * - accesstoken: token to call Common Services API
 *
 * @returns object with optional authorization and accesstoken
 */
export const getAzureFunctionTokens = async (): Promise<{
  authorization?: string;
  accesstoken?: string;
}> => {
  const creds: ClientCredentialsConfig = {
    tokenUrl: config.get<string>('email.serverless.auth.accessTokenUrl'),
    clientId: config.get<string>('email.serverless.auth.clientId'),
    clientSecret: config.get<string>('email.serverless.auth.clientSecret'),
  };

  // Build backend scope from CLIENT_ID
  const resolvedBackendScope = `api://${creds.clientId}/.default`;
  // CS scope from config
  const resolvedCsScope = config.get<string>('email.serverless.auth.csScope');

  let authToken: string | undefined;
  let csToken: string | undefined;
  if (resolvedBackendScope && resolvedBackendScope === resolvedCsScope) {
    const token = await fetchToken(creds, resolvedBackendScope);
    authToken = token;
    csToken = token;
  } else {
    [authToken, csToken] = await Promise.all([
      fetchToken(creds, resolvedBackendScope),
      fetchToken(creds, resolvedCsScope),
    ]);
  }

  return {
    authorization: authToken,
    accesstoken: csToken,
  };
};
