import express from 'express';
import i18next from 'i18next';
import { logger } from '../../services/logger.service';
import { Dashboard, Form, PullJob, Resource } from '@models';
import { isEqual } from 'lodash';

/**
 * check form field check in layout / aggregation / widget / pull jobs
 */
const router = express.Router();

/**
 * Build check form field uses
 *
 * @param req current http request
 * @param res http response
 * @returns check form field uses
 */

/**
 * check field use of the platform,
 * if a check fields with ids is not provided in the body, export all of them
 */
router.post('/', async (req, res) => {
  try {
    const args = req.body;
    if (!args.id && !args.structure) {
      return res
        .status(400)
        .send(
          i18next.t('mutations.form.edit.errors.invalidArgumentsEditStructure')
        );
    }

    //get form data
    const form = await Form.findById(args.id);
    let alreadyUseField = false;
    let usedFieldName: any;
    if (args.structure && !isEqual(form.structure, args.structure)) {
      //form data use or not and check forcefully update this form fields..
      if (!!form && !!form.fields) {
        //form fields are use or not in resource layout..
        if (alreadyUseField == false) {
          const resourceData = await Resource.findById(form.resource);
          if (!!form.resource && !!resourceData && !!resourceData.layouts) {
            outerloop: for (let i = 0; i < form.fields.length; i++) {
              for (let j = 0; j < resourceData.layouts.length; j++) {
                if (
                  !!resourceData.layouts[j].query &&
                  !!resourceData.layouts[j].query.fields
                ) {
                  for (
                    let k = 0;
                    k < resourceData.layouts[j].query.fields.length;
                    k++
                  ) {
                    if (
                      resourceData.layouts[j].query.fields[k].name ===
                      form.fields[i].name
                    ) {
                      alreadyUseField = true;
                      usedFieldName = 'layout';
                      break outerloop;
                    }
                  }
                }
              }
            }
          }
        }

        //form fields are use or not in resource aggregation..
        if (alreadyUseField == false) {
          const resourceData = await Resource.findById(form.resource);
          if (
            !!form.resource &&
            !!resourceData &&
            !!resourceData.aggregations
          ) {
            outerloop: for (let i = 0; i < form.fields.length; i++) {
              for (let j = 0; j < resourceData.aggregations.length; j++) {
                if (!!resourceData.aggregations[j].sourceFields) {
                  for (
                    let k = 0;
                    k < resourceData.aggregations[j].sourceFields.length;
                    k++
                  ) {
                    if (
                      resourceData.aggregations[j].sourceFields[k] ===
                      form.fields[i].name
                    ) {
                      alreadyUseField = true;
                      usedFieldName = 'aggregation';
                      break outerloop;
                    }
                  }
                }
              }
            }
          }
        }

        //form fields are use or not in pull jobs..
        if (alreadyUseField == false) {
          const pullJobData = await PullJob.findOne({ convertTo: args.id });
          if (!!pullJobData && !!pullJobData.mapping) {
            outerloop: for (let i = 0; i < form.fields.length; i++) {
              for (
                let j = 0;
                j < Object.keys(pullJobData.mapping).length;
                j++
              ) {
                if (
                  Object.keys(pullJobData.mapping)[j] === form.fields[i].name
                ) {
                  alreadyUseField = true;
                  usedFieldName = 'pull job';
                  break outerloop;
                }
              }
            }
          }
        }

        //form fields are use or not in widget..
        if (alreadyUseField == false) {
          const widgetData = await Dashboard.find({
            structure: {
              $elemMatch: {
                'settings.resource': form.resource.toString(),
              },
            },
          });

          if (!!widgetData) {
            outerloop: for (let i = 0; i < form.fields.length; i++) {
              for (let j = 0; j < widgetData.length; j++) {
                for (let k = 0; k < widgetData[j].structure.length; k++) {
                  if (
                    !!widgetData[j].structure[k].settings &&
                    widgetData[j].structure[k].settings &&
                    !!widgetData[j].structure[k].settings.query &&
                    !!widgetData[j].structure[k].settings.query.fields
                  ) {
                    const dashboardField =
                      widgetData[j].structure[k].settings.query.fields;
                    if (!!dashboardField) {
                      for (let m = 0; m < dashboardField.length; m++) {
                        if (dashboardField[m].name === form.fields[i].name) {
                          alreadyUseField = true;
                          usedFieldName = 'widget';
                          break outerloop;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (alreadyUseField) {
        // If use form field in layout / aggregation / pull jobs / widget than showing popup
        return res.status(200).send({
          status: 'Use form field',
          message: i18next.t('mutations.form.edit.errors.alreadyUseFormField', {
            name: usedFieldName,
          }),
          structure: args.structure,
        });
      }
    }
    return res.status(200).send({ status: 'OK' });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
