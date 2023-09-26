import express from 'express';
import {
  GeometryType,
  ApiConfiguration,
  ReferenceData,
  Resource,
} from '@models';
import { buildQuery } from '@utils/query/queryBuilder';
import config from 'config';
import i18next from 'i18next';
import mongoose from 'mongoose';
import { logger } from '@services/logger.service';
import axios from 'axios';
import { isEqual, isNil, get, flattenDeep, uniq, omit, isObject } from 'lodash';
import turf, { Feature, booleanPointInPolygon } from '@turf/turf';
import dataSources, { CustomAPI } from '@server/apollo/dataSources';
import { getPolygons } from '@utils/gis/getCountryPolygons';

/**
 * Interface of feature query
 */
interface IFeatureQuery {
  geoField?: string;
  longitudeField?: string;
  latitudeField?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  type: GeometryType;
}

/**
 * Endpoint for custom feature layers
 */
const router = express.Router();

/**
 * Check geoJSON feature, if it's MultiLine or MultiPolygon, parse it
 * into array of single features
 *
 * @param feature Feature to parse
 * @returns array of features
 */
const parseToSingleFeature = (feature: Feature) => {
  const features: Feature[] = [];
  if (feature.geometry.type === 'MultiPoint') {
    for (const coordinates of feature.geometry.coordinates) {
      features.push({
        ...omit(feature, 'geometry'),
        geometry: {
          type: 'Point',
          coordinates: typeof coordinates !== 'number' ? coordinates : [],
        },
      });
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    features.push(feature);
  } else {
    // No other types are supported for now
    // features.push(feature);
  }
  return features;
};

/**
 * Get feature from item and add it to collection
 *
 * @param features collection of features
 * @param layerType layer type
 * @param item item to get feature from
 * @param mapping fields mapping, to build geoJson from
 * @param mapping.geoField geo field to extract geojson
 * @param mapping.latitudeField latitude field ( not used if geoField )
 * @param mapping.longitudeField longitude field ( not used if geoField )
 * @param geoFilter geo filter ( polygon )
 */
const getFeatureFromItem = (
  features: any[],
  layerType: GeometryType,
  item: any,
  mapping: {
    geoField?: string;
    latitudeField?: string;
    longitudeField?: string;
  },
  geoFilter?: turf.Polygon
) => {
  if (mapping.geoField) {
    // removed the toLowerCase there, which may cause an issue
    const geo = get(item, mapping.geoField);
    if (geo) {
      if (
        !geoFilter ||
        booleanPointInPolygon(geo.geometry.coordinates, geoFilter)
      ) {
        const feature = {
          ...(typeof geo === 'string' ? JSON.parse(geo) : geo),
          properties: { ...omit(item, mapping.geoField) },
        };
        // Only push if feature is of the same type as layer
        // Get from feature, as geo can be stored as string for some models ( ref data )
        const geoType = get(feature, 'geometry.type');
        if (feature.type === 'Feature' && geoType === layerType) {
          features.push(feature);
        } else if (
          feature.type === 'Feature' &&
          `Multi${layerType}` === geoType
        ) {
          features.push(...parseToSingleFeature(feature));
        }
      } else {
      }
    }
  } else {
    // Lowercase is needed as quick solution for solving ref data layers
    const latitude = get(item, mapping.latitudeField.toLowerCase());
    const longitude = get(item, mapping.longitudeField.toLowerCase());
    if (latitude && longitude) {
      const geo = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
      };
      if (
        !geoFilter ||
        booleanPointInPolygon(geo.geometry.coordinates, geoFilter)
      ) {
        const feature = {
          ...geo,
          properties: { ...item },
        };
        features.push(feature);
      }
    }
  }
};

/**
 * Get features
 *
 * @param features list of geo features
 * @param layerType type of layer
 * @param items list of items
 * @param mapping mapping
 */
const getFeatures = async (
  features: any[],
  layerType: GeometryType,
  items: any[],
  mapping: any
) => {
  // Aggregation
  let adminPolygons = {};
  if (mapping.adminField) {
    adminPolygons = await getPolygons(mapping.adminField);
  }
  items.forEach((item) => {
    try {
      if (mapping.adminField) {
        // Use admin fields, querying from common services
        const adminIds = uniq(
          flattenDeep([get(item, mapping.geoField)])
        ).filter((x) => !isObject(x) && !isNil(x));
        adminIds.forEach((adminId) => {
          if (get(adminPolygons, adminId.toString().toLowerCase())) {
            getFeatureFromItem(
              features,
              layerType,
              {
                ...item,
                // Build geoJSON feature from polygon
                _geoField: {
                  type: 'Feature',
                  geometry: get(
                    adminPolygons,
                    adminId.toString().toLowerCase()
                  ),
                },
              },
              { geoField: '_geoField' }
            );
          }
        });
      } else {
        // Else, build feature from the item directly
        getFeatureFromItem(features, layerType, item, mapping);
      }
    } catch (err) {
      logger.error(err.message);
    }
  });
};

/**
 * Build endpoint
 *
 * @param req current http request
 * @param res http response
 * @returns GeoJSON feature collection mutations
 */
router.get('/feature', async (req, res) => {
  const featureCollection = {
    type: 'FeatureCollection',
    features: [],
  };
  const latitudeField = get(req, 'query.latitudeField');
  const longitudeField = get(req, 'query.longitudeField');
  const geoField = get(req, 'query.geoField');
  const adminField = get(req, 'query.adminField');
  const layerType = (get(req, 'query.type') ||
    GeometryType.POINT) as GeometryType;
  const contextFilters = JSON.parse(
    decodeURIComponent(get(req, 'query.contextFilters', null))
  );
  const at = get(req, 'query.at') as string | undefined;
  // const tolerance = get(req, 'query.tolerance', 1);
  // const highQuality = get(req, 'query.highquality', true);
  // turf.simplify(geoJsonData, {
  //   tolerance: tolerance,
  //   highQuality: highQuality,
  // });
  if (!geoField && !(latitudeField && longitudeField)) {
    return res
      .status(400)
      .send(i18next.t('routes.gis.feature.errors.invalidFields'));
  }

  // Polygons are only supported for geoField
  if (layerType === GeometryType.POLYGON && !geoField) {
    return res
      .status(400)
      .send(i18next.t('routes.gis.feature.errors.missingPolygonGeoField'));
  }

  const mapping = {
    geoField,
    longitudeField,
    latitudeField,
    adminField,
  };
  try {
    // todo(gis): also implement reference data
    if (get(req, 'query.resource')) {
      let id: string;
      if (get(req, 'query.aggregation')) {
        id = get(req, 'query.aggregation') as string;
      } else if (get(req, 'query.layout')) {
        id = get(req, 'query.layout') as string;
      } else {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }

      // todo(gis): improve how we find resource
      const resourceData = await Resource.findOne({
        $or: [
          {
            layouts: {
              $elemMatch: {
                _id: id,
              },
            },
          },
          {
            aggregations: {
              $elemMatch: {
                _id: id,
              },
            },
          },
        ],
      });

      if (!resourceData) {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }

      let query: any;
      let variables: any;

      const aggregations = resourceData.aggregations || [];
      const aggregation = aggregations.find((x) => isEqual(x.id, id));
      const layouts = resourceData.layouts || [];
      const layout = layouts.find((x) => isEqual(x.id, id));

      // const filterPolygon = getFilterPolygon(req.query);

      if (aggregation) {
        query = `query recordsAggregation($resource: ID!, $aggregation: ID!, $contextFilters: JSON, $first: Int, $at: Date) {
          recordsAggregation(resource: $resource, aggregation: $aggregation, contextFilters: $contextFilters, first: $first, at: $at)
        }`;
        variables = {
          resource: resourceData._id,
          aggregation: aggregation._id,
          contextFilters,
          first: 1000,
          at: at ? new Date(at) : undefined,
        };
      } else if (layout) {
        query = buildQuery(layout.query);
        variables = {
          first: 1000,
          filter: {
            logic: 'and',
            filters: contextFilters
              ? [layout.query.filter, contextFilters]
              : [layout.query.filter],
          },
          at: at ? new Date(at) : undefined,
        };
      } else {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }

      const gqlQuery = axios({
        url: `${config.get('server.url')}/graphql`,
        method: 'POST',
        headers: {
          Authorization: req.headers.authorization,
          'Content-Type': 'application/json',
        },
        data: {
          query,
          variables,
        },
      }).then(async ({ data }) => {
        if (data.errors) {
          logger.error(data.errors[0].message);
        }
        try {
          for (const field in data.data) {
            if (Object.prototype.hasOwnProperty.call(data.data, field)) {
              if (data.data[field].items?.length > 0) {
                // Aggregation
                await getFeatures(
                  featureCollection.features,
                  layerType,
                  data.data[field].items,
                  mapping
                );
              } else if (data.data[field].edges?.length > 0) {
                // Query
                await getFeatures(
                  featureCollection.features,
                  layerType,
                  data.data[field].edges.map((x) => x.node),
                  mapping
                );
              }
            }
          }
        } catch (err) {
          throw new Error(err);
        }
      });
      await Promise.all([gqlQuery]).catch((err) => {
        throw new Error(err);
      });
    } else if (get(req, 'query.refData')) {
      const referenceData = await ReferenceData.findById(
        new mongoose.Types.ObjectId(get(req, 'query.refData') as string)
      );
      if (referenceData) {
        if (referenceData.type === 'static') {
          const data = referenceData.data || [];
          await getFeatures(
            featureCollection.features,
            layerType,
            data,
            mapping
          );
        } else {
          // todo: populate
          const apiConfiguration = await ApiConfiguration.findById(
            referenceData.apiConfiguration,
            'name endpoint graphQLEndpoint'
          );
          const contextDataSources = (await dataSources())();
          const dataSource = contextDataSources[
            apiConfiguration.name
          ] as CustomAPI;
          // if (dataSource && !dataSource.httpCache) {
          //   dataSource.initialize({
          //     context: {},
          //     cache: new InMemoryLRUCache(),
          //   });
          // }
          const data: any =
            (await dataSource.getReferenceDataItems(
              referenceData,
              apiConfiguration
            )) || [];
          await getFeatures(
            featureCollection.features,
            layerType,
            data,
            mapping
          );
        }
      } else {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }
    } else {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    return res.send(featureCollection);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res
      .status(500)
      .send(i18next.t('routes.gis.feature.errors.unexpected'));
  }
});

export default router;
