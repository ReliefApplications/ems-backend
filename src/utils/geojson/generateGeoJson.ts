import * as turf from '@turf/turf';

/**
 * Generates random features based on the specified options
 *
 * @param options Options for generating random features
 * @returns Array of generated features
 */
export const generateGeoJson = (options) => {
  let features;
  switch (options.type) {
    case 'Point':
      const pointGeo = turf.randomPoint(options.numGeometries);
      features = pointGeo.features.map((geoData) => {
        Object.assign(geoData.geometry, {
          properties: options.generateProperties(),
        });
        return geoData.geometry;
      });
      break;
    case 'Polygon':
      const polygons = turf.randomPolygon(options.numGeometries, {
        max_radial_length: 2,
      });
      const simplifiedPolygons = turf.simplify(polygons, {
        tolerance: 0.9,
        highQuality: true,
      });
      features = simplifiedPolygons.features.map((geoData) => {
        Object.assign(geoData.geometry, {
          properties: options.generateProperties(),
        });
        return geoData.geometry;
      });
      break;
    case 'LineString':
      const lineString = turf.randomLineString(options.numGeometries, {
        num_vertices: 15,
      });
      const simplifiedLineString = turf.simplify(lineString, {
        tolerance: 0.9,
        highQuality: true,
      });
      features = simplifiedLineString.features.map((geoData) => {
        Object.assign(geoData.geometry, {
          properties: options.generateProperties(),
        });
        return geoData.geometry;
      });
      break;
  }
  return features;
};
