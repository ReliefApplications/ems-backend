import express from 'express';
import {
  generateGeoJson,
  generateProperties,
} from '@utils/geojson/generateGeoJson';
import * as turf from '@turf/turf';

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
router.get('/feature/:type/:tolerance/:highquality', async (req, res) => {
  try {
    const property = {
      Polygon: {
        type: 'Polygon',
        generateProperties: () => {
          const randomString = Math.random().toString(36).substring(7);
          return {
            name: `Polygon ${randomString}`,
          };
        },
        numGeometries: 1000,
      },
      LineString: {
        type: 'LineString',
        generateProperties: () => {
          const randomString = Math.random().toString(36).substring(7);
          return {
            name: `LineString ${randomString}`,
          };
        },
        numGeometries: 1000,
      },
      Point: {
        type: 'Point',
        generateProperties: () => {
          const randomString = Math.random().toString(36).substring(7);
          return {
            name: `Point ${randomString}`,
          };
        },
        numGeometries: 1000,
      },
    };
    const geoType = property[req.params.type];
    const geoJsonData = generateGeoJson(geoType);

    /**
     * Simplify Polygon and LineString geo json data
     */
    const tolerance: any = req.params.tolerance ? req.params.tolerance : 1;
    const highQuality: any = req.params.highquality
      ? req.params.highquality
      : true;
    let features: any;
    switch (req.params.type) {
      case 'Point':
        features = generateProperties(geoJsonData, geoType);
        break;
      case 'Polygon':
      case 'LineString':
        const simplifiedGeoJson = turf.simplify(geoJsonData, {
          tolerance: tolerance,
          highQuality: highQuality,
        });
        features = generateProperties(simplifiedGeoJson, geoType);
        break;
    }
    const featureCollection = {
      type: 'FeatureCollection',
      features: features,
    };
    res.send(featureCollection);
  } catch (error) {
    res.send(error);
  }
});

export default router;
