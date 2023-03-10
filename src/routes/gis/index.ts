import express from 'express';
import { generateGeoJson } from '@utils/geojson/generateGeoJson';

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
router.get('/feature/:type', async (req, res) => {
  const property = {
    Polygon: {
      type: 'Polygon',
      generateProperties: () => {
        const randomString = Math.random().toString(36).substring(7);
        return {
          name: `Polygon ${randomString}`,
        };
      },
      numGeometries: 10,
    },
    LineString: {
      type: 'LineString',
      generateProperties: () => {
        const randomString = Math.random().toString(36).substring(7);
        return {
          name: `LineString ${randomString}`,
        };
      },
      numGeometries: 10,
    },
    Point: {
      type: 'Point',
      generateProperties: () => {
        const randomString = Math.random().toString(36).substring(7);
        return {
          name: `Point ${randomString}`,
        };
      },
      numGeometries: 10,
    },
  };

  const featureCollection = {
    type: 'FeatureCollection',
    features: generateGeoJson(property[req.params.type]),
  };

  res.send(featureCollection);
});

export default router;
