import express from 'express';
import { Layer, Resource } from '@models';
import { buildQuery } from '@utils/query/queryBuilder';
import config from 'config';
import i18next from 'i18next';

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
router.get('/feature', async (req, res) => {
  const records = [];
  try {
    const layer = await Layer.findOne({ _id: req.query.id });
    if (!layer) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const resourceData = await Resource.findOne({
      layouts: {
        $elemMatch: {
          _id: layer.datasource.layout,
        },
      },
    });

    if (
      !resourceData ||
      !resourceData.layouts ||
      resourceData.layouts.length == 0
    ) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const query = buildQuery(resourceData.layouts[0].query);
    const gqlQuery = fetch(`${config.get('server.url')}/graphql`, {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        variables: {
          filter: resourceData.layouts[0].query.filter,
        },
      }),
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json',
      },
    })
      .then((x) => x.json())
      .then((y) => {
        if (y.errors) {
          console.error(y.errors[0].message);
        }
        for (const field in y.data) {
          if (Object.prototype.hasOwnProperty.call(y.data, field)) {
            y.data.allAaaas.edges.map(async function (item) {
              records.push(item.node);
            });
          }
        }
      });
    await Promise.all([gqlQuery]);

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
