/**
 * Returns headers required for Azure Function
 *
 * @param req Caller's express request
 * @returns headers
 */
export const azureFunctionHeaders = (req: any) => {
  return {
    Authorization: req.headers.authorization,
    'Content-Type': 'application/json',
    ...(req.headers.accesstoken && {
      accesstoken: req.headers.accesstoken,
    }),
  };
};
