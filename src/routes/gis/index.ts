import express from 'express';
import { Resource } from '@models';
import { buildQuery } from '@utils/query/queryBuilder';
import config from 'config';
import i18next from 'i18next';
import { layerDataSourceType } from '@const/enumTypes';
import mongoose from 'mongoose';
import { filter } from 'lodash';

/**
 * Endpoint for custom feature layers
 */
const router = express.Router();

/**
 * Build endpoint
 *
 * @param req current http request
 * @param res http response
 * @returns GeoJSON feature collectionmutations
 */
router.post('/feature', async (req, res) => {
  const records = [];
  try {
    if (!!req.body.type && req.body.type == layerDataSourceType.resource) {
      let id: any;
      if (!!req.body.aggregation) {
        id = mongoose.Types.ObjectId(req.body.aggregation);
      } else if (!!req.body.layout) {
        id = mongoose.Types.ObjectId(req.body.layout);
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
        let filter = {};
        query = `query recordsAggregation($resource: ID!, $aggregation: ID!, $filter : JSON) {
          recordsAggregation(resource: $resource, aggregation: $aggregation, filter : $filter)
        }`;

        if (
          !!req.body.latMin &&
          !!req.body.latMax &&
          !!req.body.lngMin &&
          !!req.body.lngMax
        ) {
          let fieldName: string;
          resourceData.fields.map(function (result) {
            if (result.type == 'geospatial') {
              fieldName = result.name;
            }
          });

          if (!!fieldName) {
            filter = {
              [`data.${fieldName}.geometry.coordinates.0`]: {
                $gte: req.body.lngMin,
                $lte: req.body.lngMax,
              },
              [`data.${fieldName}.geometry.coordinates.1`]: {
                $gte: req.body.latMin,
                $lte: req.body.latMax,
              },
            };
          }
        }

        variables = {
          resource: resourceData._id,
          aggregation: resourceData.aggregations[0]._id,
          filter: filter,
        };
      } else if (
        resourceData &&
        resourceData.layouts &&
        resourceData.layouts.length > 0
      ) {
        if (
          !!req.body.latMin &&
          !!req.body.latMax &&
          !!req.body.lngMin &&
          !!req.body.lngMax
        ) {
          let fieldName: string;
          resourceData.fields.map(function (result) {
            if (result.type == 'geospatial') {
              fieldName = result.name;
            }
          });

          if (!!fieldName) {
            resourceData.layouts[0].query.filter.filters.push(
              {
                field: fieldName,
                cordIndex: 0,
                operator: 'gte',
                value: req.body.lngMin,
              },
              {
                field: fieldName,
                cordIndex: 0,
                operator: 'lte',
                value: req.body.lngMax,
              },
              {
                field: fieldName,
                cordIndex: 1,
                operator: 'gte',
                value: req.body.latMin,
              },
              {
                field: fieldName,
                cordIndex: 1,
                operator: 'lte',
                value: req.body.latMax,
              }
            );
          }
        }
        query = buildQuery(resourceData.layouts[0].query);
        variables = {
          filter: resourceData.layouts[0].query.filter,
        };
      } else {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }

      const gqlQuery = fetch(`${config.get('server.url')}/graphql`, {
        method: 'POST',
        body: JSON.stringify({
          query,
          variables,
        }),
        headers: {
          Authorization: req.headers.authorization,
          'Content-Type': 'application/json',
        },
      })
        .then((x) => x.json())
        .then(async (y) => {
          if (y.errors) {
            console.error(y.errors[0].message);
          }
          for (const field in y.data) {
            if (Object.prototype.hasOwnProperty.call(y.data, field)) {
              if (y.data[field].items && y.data[field].items.length > 0) {
                y.data[field].items.map(async function (result) {
                  records.push(result);
                });
              } else {
                y.data[field].edges.map(async function (result) {
                  records.push(result.node);
                });
              }
            }
          }
        });
      await Promise.all([gqlQuery]);
    } else {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }

    const featureCollection = records;

    return res.send(featureCollection);
  } catch (error) {
    return res.send(error);
  }

  // try {
  //   const property = {
  //     Polygon: {
  //       type: 'Polygon',
  //       generateProperties: () => {
  //         const randomString = Math.random().toString(36).substring(7);
  //         return {
  //           name: `Polygon ${randomString}`,
  //         };
  //       },
  //       numGeometries: 1000,
  //     },
  //     LineString: {
  //       type: 'LineString',
  //       generateProperties: () => {
  //         const randomString = Math.random().toString(36).substring(7);
  //         return {
  //           name: `LineString ${randomString}`,
  //         };
  //       },
  //       numGeometries: 1000,
  //     },
  //     Point: {
  //       type: 'Point',
  //       generateProperties: () => {
  //         const randomString = Math.random().toString(36).substring(7);
  //         return {
  //           name: `Point ${randomString}`,
  //         };
  //       },
  //       numGeometries: 1000,
  //     },
  //   };
  //   const geoType: any = req.query.type;
  //   const geoJsonData = generateGeoJson(property[geoType]);

  //   console.log(
  //     'befor GeoJson simplify size in bytes ===>>> ',
  //     getGeoJsonSize(geoJsonData, 'Bytes')
  //   );

  //   /**
  //    * Simplify Polygon and LineString geo json data
  //    */
  //   const tolerance: any = req.query.tolerance ? req.query.tolerance : 1;
  //   const highQuality: any = req.query.highquality
  //     ? req.query.highquality
  //     : true;
  //   let features: any;
  //   switch (geoType) {
  //     case 'Point':
  //       features = generateProperties(geoJsonData, property[geoType]);
  //       break;
  //     case 'Polygon':
  //     case 'LineString':
  //       const simplifiedGeoJson = turf.simplify(geoJsonData, {
  //         tolerance: tolerance,
  //         highQuality: highQuality,
  //       });
  //       console.log(
  //         'after GeoJson simplify size in bytes ===>>> ',
  //         getGeoJsonSize(simplifiedGeoJson, 'Bytes')
  //       );
  //       features = generateProperties(simplifiedGeoJson, property[geoType]);
  //       break;
  //   }

  //   //use this API for filter records with mongodb
  //   //https://www.mongodb.com/docs/manual/reference/operator/query/polygon/

  //   const featureCollection = records

  //   res.send(featureCollection);
  // } catch (error) {
  //   res.send(error);
  // }
});

export default router;
