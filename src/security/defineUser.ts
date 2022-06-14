import { Client, User } from 'models';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Define roles for user if it's the public client.
 *
 * @param user user to define roles of.
 * @param req original request.
 * @returns user with correct roles.
 */
const defineUser = async (
  user: User | Client,
  req: any
): Promise<User | Client> => {
  console.log('IN DEFINE USER');
  if ((user as Client).clientId === process.env.PUBLIC_CLIENT_ID) {
    const pageID = req.originalUrl
      .split(req.params.name)
      .pop()
      .substring(1)
      .split('/')
      .pop();
    console.log('PAGE ID', pageID);
    /**
     * Apply following logic
     *
     * Check if page is public, otherwise return null
     * If page is public, retrieve roles/positionAttributes associated with the page
     * Add those roles/positionAttributes to the client
     * Populate those roles/positionAttributes
     * Return user
     */
  }
  return user;
};
export default defineUser;
