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
import { isEqual, isNil, get } from 'lodash';
import turf, { Feature, booleanPointInPolygon } from '@turf/turf';
import dataSources, { CustomAPI } from '@server/apollo/dataSources';
import { InMemoryLRUCache } from 'apollo-server-caching';

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
 * Get filter polygon from bounds
 *
 * @param query query parameters
 * @returns filter polygon
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getFilterPolygon = (query: IFeatureQuery) => {
  if (
    !isNil(query.minLat) &&
    !isNil(query.maxLat) &&
    !isNil(query.minLng) &&
    !isNil(query.maxLng)
  ) {
    const polygon: turf.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [Number(query.minLat), Number(query.minLng)],
          [Number(query.maxLat), Number(query.minLng)],
          [Number(query.maxLat), Number(query.maxLng)],
          [Number(query.minLat), Number(query.maxLng)],
          [Number(query.minLat), Number(query.minLng)],
        ],
      ],
    };
    return polygon;
  } else {
    return null;
  }
};

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
        ...feature,
        geometry: {
          type: 'Point',
          coordinates: typeof coordinates !== 'number' ? coordinates : [],
        },
      });
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const coordinates of feature.geometry.coordinates) {
      features.push({
        ...feature,
        geometry: {
          type: 'Polygon',
          coordinates: typeof coordinates !== 'number' ? coordinates : [],
        },
      });
    }
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
    const geo = get(item, mapping.geoField.toLowerCase());
    if (geo) {
      if (
        !geoFilter ||
        booleanPointInPolygon(geo.geometry.coordinates, geoFilter)
      ) {
        const feature = {
          ...(typeof geo === 'string' ? JSON.parse(geo) : geo),
          properties: { ...item },
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
          coordinates: [longitude, latitude],
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
  const layerType = get(req, 'query.type', GeometryType.POINT);
  const contextFilters = JSON.parse(
    decodeURIComponent(get(req, 'query.contextFilters', null))
  );
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
  };
  try {
    // todo(gis): also implement reference data
    if (get(req, 'query.resource')) {
      let id: mongoose.Types.ObjectId;
      if (get(req, 'query.aggregation')) {
        id = new mongoose.Types.ObjectId(get(req, 'query.aggregation'));
      } else if (get(req, 'query.layout')) {
        id = new mongoose.Types.ObjectId(get(req, 'query.layout'));
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
      const aggregation = aggregations.find((x) => isEqual(x._id, id));
      const layouts = resourceData.layouts || [];
      const layout = layouts.find((x) => isEqual(x._id, id));

      // const filterPolygon = getFilterPolygon(req.query);

      if (aggregation) {
        query = `query recordsAggregation($resource: ID!, $aggregation: ID!, $contextFilters: JSON) {
          recordsAggregation(resource: $resource, aggregation: $aggregation, contextFilters: $contextFilters)
        }`;
        variables = {
          resource: resourceData._id,
          aggregation: aggregation._id,
          contextFilters,
        };
      } else if (layout) {
        query = buildQuery(layout.query);
        variables = {
          filter: {
            logic: 'and',
            filters: contextFilters
              ? [layout.query.filter, contextFilters]
              : [layout.query.filter],
          },
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
      }).then(({ data }) => {
        if (data.errors) {
          logger.error(data.errors[0].message);
        }
        for (const field in data.data) {
          if (Object.prototype.hasOwnProperty.call(data.data, field)) {
            if (data.data[field].items?.length > 0) {
              data.data[field].items.map(async function (result) {
                getFeatureFromItem(
                  featureCollection.features,
                  layerType,
                  result,
                  mapping
                );
              });
            } else {
              data.data[field].edges.map(async function (result) {
                getFeatureFromItem(
                  featureCollection.features,
                  layerType,
                  result.node,
                  mapping
                );
              });
            }
          }
        }
      });
      await Promise.all([gqlQuery]);
    } else if (get(req, 'query.refData')) {
      const referenceData = await ReferenceData.findById(
        new mongoose.Types.ObjectId(get(req, 'query.refData'))
      );
      if (referenceData) {
        if (referenceData.type === 'static') {
          const data = referenceData.data || [];
          for (const item of data) {
            getFeatureFromItem(
              featureCollection.features,
              layerType,
              item,
              mapping
            );
          }
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
          if (dataSource && !dataSource.httpCache) {
            dataSource.initialize({
              context: {},
              cache: new InMemoryLRUCache(),
            });
          }
          const data: any =
            (await dataSource.getReferenceDataItems(
              referenceData,
              apiConfiguration
            )) || [];
          for (const item of data) {
            getFeatureFromItem(
              featureCollection.features,
              layerType,
              item,
              mapping
            );
          }
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
