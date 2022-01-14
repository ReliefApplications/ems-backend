/*
 * Config file to customize the Oort instance
 */
export enum authenticationType {
  azureAD = 0,
  keycloak = 1,
}

export const config = {
  // Authentication using custon openID connect server
  authenticationType: authenticationType.keycloak,
};
