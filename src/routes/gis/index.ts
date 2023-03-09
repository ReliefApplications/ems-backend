import express from 'express';

/**
 * Endpoint for custom feature layers
 */
const router = express.Router();

/**
 * Build endpoint
 *
 * @param req current http request
 * @param res http response
 * @returns GeoJSON feature collection
 */

/**
 *
 */
const features = [
  {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-122.419416, 37.774929],
    },
    properties: {
      name: 'San Francisco',
    },
  },
  {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-73.935242, 40.73061],
    },
    properties: {
      name: 'New York City',
    },
  },
];

router.get('/feature', async (req, res) => {
  const featureCollection = {
    type: 'FeatureCollection',
    features: features,
  };
  res.send(featureCollection);
});

export default router;
