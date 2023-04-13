import express from 'express';
import { Resource } from '@models';
import { buildQuery } from '@utils/query/queryBuilder';
import config from 'config';
import i18next from 'i18next';
import mongoose from 'mongoose';
import get from 'lodash/get';
import { logger } from '@services/logger.service';
import axios from 'axios';

/**
 * Endpoint for custom feature layers
 */
const router = express.Router();

/**
 * Get feature from item and add it to collection
 *
 * @param features collection of features
 * @param item item to get feature from
 * @param mapping fields mapping, to build geoJson from
 * @param mapping.geoField geo field to extract geojson
 * @param mapping.latitudeField latitude field ( not used if geoField )
 * @param mapping.longitudeField longitude field ( not used if geoField )
 */
const getFeatureFromItem = (
  features: any[],
  item: any,
  mapping: {
    geoField?: string;
    latitudeField?: string;
    longitudeField?: string;
  }
) => {
  if (mapping.geoField) {
    const geo = get(item, mapping.geoField);
    if (geo) {
      const feature = {
        ...geo,
        properties: { ...item },
      };
      features.push(feature);
    }
  } else {
    const latitude = get(item, mapping.latitudeField);
    const longitude = get(item, mapping.longitudeField);
    if (latitude && longitude) {
      const feature = {
        type: 'Feature',
        geometry: [latitude, longitude],
        properties: { ...item },
      };
      features.push(feature);
    }
  }
};

/**
 * Build endpoint
 *
 * @param req current http request
 * @param res http response
 * @returns GeoJSON feature collectionmutations
 */
router.get('/feature', async (req, res) => {
  const featureCollection = {
    type: 'FeatureCollection',
    features: [],
  };
  const latitudeField = get(req, 'query.latitudeField');
  const longitudeField = get(req, 'query.longitudeField');
  const geoField = get(req, 'query.geoField');
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
        id = mongoose.Types.ObjectId(get(req, 'query.aggregation'));
      } else if (get(req, 'query.layout')) {
        id = mongoose.Types.ObjectId(get(req, 'query.layout'));
      } else {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }

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

      let query: any;
      let variables: any;

      if (
        resourceData &&
        resourceData.aggregations &&
        resourceData.aggregations.length > 0
      ) {
        query = `query recordsAggregation($resource: ID!, $aggregation: ID!) {
          recordsAggregation(resource: $resource, aggregation: $aggregation)
        }`;
        variables = {
          resource: resourceData._id,
          aggregation: resourceData.aggregations[0]._id,
        };
      } else if (
        resourceData &&
        resourceData.layouts &&
        resourceData.layouts.length > 0
      ) {
        query = buildQuery(resourceData.layouts[0].query);
        variables = {
          filter: resourceData.layouts[0].query.filter,
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
            if (data.data[field].items && data.data[field].items.length > 0) {
              data.data[field].items.map(async function (result) {
                getFeatureFromItem(featureCollection.features, result, mapping);
              });
            } else {
              data.data[field].edges.map(async function (result) {
                getFeatureFromItem(
                  featureCollection.features,
                  result.node,
                  mapping
                );
              });
            }
          }
        }
      });
      await Promise.all([gqlQuery]);
    } else {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    return res.send(featureCollection);
  } catch (error) {
    logger.error(error.message);
    return res
      .status(500)
      .send(i18next.t('routes.gis.feature.errors.unexpected'));
  }
});

export default router;
