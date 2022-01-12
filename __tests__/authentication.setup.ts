import * as msal from '@azure/msal-node';
import * as dotenv from 'dotenv';
dotenv.config();

export async function acquireToken(): Promise<string> {
  const msalConfig = {
    auth: {
      clientId: process.env.clientID,
      authority: 'https://login.microsoftonline.com/' + process.env.tenantID,
      clientSecret: process.env.CLIENT_SECRET,
    },
  };

  const cca = new msal.ConfidentialClientApplication(msalConfig);

  const tokenRequest = {
    scopes: [`api://${process.env.clientID}/.default`],
  };

  const authResponse = await cca.acquireTokenByClientCredential(tokenRequest);
  return authResponse.accessToken;
}
