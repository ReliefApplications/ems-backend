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
      features = turf.randomPoint(options.numGeometries);
      break;
    case 'Polygon':
      features = turf.randomPolygon(options.numGeometries, {
        max_radial_length: 2,
      });
      break;
    case 'LineString':
      features = turf.randomLineString(options.numGeometries, {
        num_vertices: 15,
      });
      break;
  }
  return features;
};

/**
 * Generates geojson prp[erties with name
 *
 * @param options Options for generating random name
 * @param geoJsonData is the array of object of geo json
 * @returns Array of generated features with properties
 */
export const generateProperties = (geoJsonData, options) => {
  const features = geoJsonData.features.map((geoData) => {
    Object.assign(geoData.geometry, {
      properties: options.generateProperties(),
    });
    return geoData.geometry;
  });
  return features;
};
