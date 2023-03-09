// import { getRandomIcon } from '../const/fa-icons';
// import { MarkerIconOptions } from '../utils/create-div-icon';

/** Represents the types of geometries that can be generated */
type FeatureTypes = 'Point' | 'Polygon' | 'LineString';

/** Options for generating random features */
type CollectionGeneratorOptions = {
  [key in FeatureTypes]?: {
    generateProperties: () => any;
    probability?: number;
    numCoordinates?: number;
    maxDistance?: number;
    minDistance?: number;
  };
} & {
  numFeatures: number;
};

/** Default max distance in degrees */
const DEFAULT_MAX_DISTANCE = 15;

/** Default min distance in degrees */
const DEFAULT_MIN_DISTANCE = 5;

/**
 * Generates random features based on the specified options
 *
 * @param options Options for generating random features
 * @returns Array of generated features
 */
export const generateGeoJson = (options: CollectionGeneratorOptions) => {
  const featureTypes = Object.keys(options) as FeatureTypes[];
  const typeProbabilities = featureTypes.reduce((probabilities, type) => {
    const prob = options[type]?.probability;
    if (prob !== undefined) {
      probabilities[type] = prob;
    }
    return probabilities;
  }, {} as { [key in FeatureTypes]: number });

  const features = [];
  for (let i = 0; i < options.numFeatures; i++) {
    const type = weightedRandom(featureTypes, typeProbabilities);
    const option = options[type];
    if (!option) continue;
    const properties = option.generateProperties();
    const maxDistance = option.maxDistance || DEFAULT_MAX_DISTANCE;
    const minDistance = option.minDistance || DEFAULT_MIN_DISTANCE;
    let coordinates;
    switch (type) {
      case 'Point':
        coordinates = [Math.random() * 360 - 180, Math.random() * 180 - 90];
        break;
      case 'Polygon':
      case 'LineString':
        const numCoordinates = options[type]?.numCoordinates || 3;
        coordinates = [];
        let previousLat = 0;
        let previousLng = 0;
        for (let j = 0; j < numCoordinates; j++) {
          let lat = Math.random() * 180 - 90;
          let lng = Math.random() * 360 - 180;
          if (j !== 0) {
            let latDifference = Math.abs(previousLat - lat);
            let lngDifference = Math.abs(previousLng - lng);
            while (
              latDifference > maxDistance ||
              lngDifference > maxDistance ||
              latDifference < minDistance ||
              lngDifference < minDistance
            ) {
              lat = Math.random() * 180 - 90;
              lng = Math.random() * 360 - 180;
              latDifference = Math.abs(previousLat - lat);
              lngDifference = Math.abs(previousLng - lng);
            }
          }
          previousLat = lat;
          previousLng = lng;
          coordinates.push([lat, lng]);
        }
        if (type === 'Polygon') {
          coordinates = [coordinates];
        }
        break;
    }
    features.push({ type, properties, coordinates });
  }
  return features;
};

/**
 * Returns a random item from the given options based on the weights provided.
 *
 * @param options - Array of options to choose from
 * @param weights - Array of weights for each option
 * @returns The randomly selected item from the options array
 */
const weightedRandom = (
  options: FeatureTypes[],
  weights: { [key in FeatureTypes]: number }
) => {
  let sum = 0;
  const keys = Object.keys(weights) as FeatureTypes[];
  for (const key of keys) {
    sum += weights[key];
  }

  const randomNum = Math.random() * sum;
  let weightSum = 0;
  for (const key of options) {
    weightSum += weights[key];
    if (randomNum <= weightSum) {
      return key;
    }
  }
  return options[options.length - 1];
};
