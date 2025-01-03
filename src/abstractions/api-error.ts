import { ReasonPhrases, StatusCodes } from 'http-status-codes';

/** Error interface */
export interface Error {
  status: number;
  fields: {
    name: {
      message: string;
    };
  };
  message: string;
  name: string;
}

/** Api Error class */
class ApiError extends Error implements Error {
  public status = 500;

  public success = false;

  public fields: { name: { message: string } } = { name: { message: '' } };

  /**
   * Api Error class
   *
   * @param msg Message
   * @param statusCode Http status code number
   * @param name Error name
   */
  constructor(
    msg: string,
    statusCode: number,
    name: string = ReasonPhrases.INTERNAL_SERVER_ERROR
  ) {
    super();
    this.message = msg;
    this.status = statusCode;
    this.name =
      statusCode === StatusCodes.NOT_FOUND ? ReasonPhrases.NOT_FOUND : name;
  }
}

export default ApiError;
