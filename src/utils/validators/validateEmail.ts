/** Regex pattern for email */
const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

/**
 * Util method to check if a string can be considered as email.
 *
 * @param {string} email value to test
 * @returns {boolean} value is an email or not
 */
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(String(email).toLowerCase());
};
