import axios from 'axios';
import { logger } from '@services/logger.service';

/**
 * Convert image URLs found in a piece of content to base64 data URIs.
 *
 * Important for dashboard export, as urls cannot be correctly converted
 * otherwise to images.
 *
 * Accepts:
 * - a string: its `<img src="...">` urls are fetched and inlined as base64.
 * - a translation object (e.g. `{ en: '<p>...', uk: '...' }`): each of its
 *   properties is processed recursively.
 * - anything else: returned untouched.
 *
 * @param text Content to convert (string, translation object, or other)
 * @returns The content with image urls replaced by base64 data URIs
 */
async function convertUrlToBase64(text: any): Promise<any> {
  // If text is a translation object (e.g. { en: '<p>...', uk: '...' }),
  // convert each of its string properties.
  if (text && typeof text === 'object' && !Array.isArray(text)) {
    for (const key of Object.keys(text)) {
      text[key] = await convertUrlToBase64(text[key]);
    }
    return text;
  }
  // Only process strings; return other values (numbers, null, etc.) untouched
  if (typeof text !== 'string') {
    return text;
  }
  // Regex for Separate the url and base64 images
  const imageUrlRegex = /<img src="([^"]+)"[^>]*>/g;
  // Find the urls using Regex
  const urls = Array.from(
    text.matchAll(imageUrlRegex),
    (match: any) => match[1]
  );
  // Verify and change the image format
  for (const url of urls) {
    if (url.startsWith('data:image')) {
      continue; // Skip if already a data URL
    }

    try {
      // Fetch the image data
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      if (response && response.data) {
        // Read the response body as buffer
        const base64String = Buffer.from(response.data, 'binary').toString(
          'base64'
        );
        // Create the data URI
        const mimeType = response.headers['content-type'];
        const dataURI = `data:${mimeType};base64,${base64String}`;
        text = text.replace(url, dataURI);
      }
    } catch (error) {
      logger.error('Error fetching image:', error);
    }
  }
  return text;
}

export default convertUrlToBase64;
