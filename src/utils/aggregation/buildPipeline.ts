import { Form } from '../../models';
import { operatorsMapping, PipelineStage } from '../../const/aggregation';
import getFilter from '../schema/resolvers/Query/getFilter';

const addFields = (
  settings: { name: string; expression: { operator: string; field: string } }[]
): any => {
  return settings.reduce((o, value) => {
    const operator = operatorsMapping.find(
      (x) => x.id === value.expression.operator
    );
    return Object.assign(o, {
      [value.name]: operator.mongo(value.expression.field),
    });
  }, {});
};

export default (pipeline: any[], settings: any[], form: Form, context): any => {
  for (const stage of settings) {
    switch (stage.type) {
      case PipelineStage.FILTER: {
        let filters = JSON.stringify(
          getFilter(stage.form, form.fields, context)
        );
        filters = filters.split('data.').join('');
        pipeline.push({
          $match: JSON.parse(filters),
        });
        break;
      }
      case PipelineStage.SORT: {
        pipeline.push({
          $sort: {
            [stage.form.field]: stage.form.order === 'asc' ? 1 : -1,
          },
        });
        break;
      }
      case PipelineStage.GROUP: {
        pipeline.push({
          $group: {
            _id: `$${stage.form.groupBy}`,
            ...addFields(stage.form.addFields),
          },
        });
        pipeline.push({
          $project: {
            [stage.form.groupBy]: '$_id',
            _id: 0,
            ...(stage.form.addFields as any[]).reduce(
              (o, addField) =>
                Object.assign(o, {
                  [addField.name]: 1,
                }),
              {}
            ),
          },
        });
        break;
      }
      case PipelineStage.ADD_FIELDS: {
        pipeline.push({
          $addFields: addFields(stage.form),
        });
        break;
      }
      case PipelineStage.UNWIND: {
        pipeline.push({
          $unwind: `$${stage.form.field}`,
        });
        break;
      }
      case PipelineStage.CUSTOM: {
        pipeline.push(stage.form.json);
        break;
      }
      default: {
        break;
      }
    }
  }
};
