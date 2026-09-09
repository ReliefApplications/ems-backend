import { accessibleBy } from '@casl/mongoose';
import { Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import express from 'express';
import mongoose from 'mongoose';

/** Router for layout configuration helpers. */
const router = express.Router();

/** Fields returned to the layout field picker. */
interface LayoutForm {
  id: string;
  name: string;
  fields: string[];
}

/** Stored form field shape needed by this route. */
interface StoredFormField {
  name?: string;
}

/**
 * Lists readable forms of a resource with their fields in form-definition order.
 */
router.get('/resources/:id/forms', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send(req.t('common.errors.dataNotFound'));
    }

    const ability: AppAbility = req.context.user.ability;
    const forms = await Form.find({
      resource: req.params.id,
      ...accessibleBy(ability, 'read').Form,
    }).select('name fields');

    const result: LayoutForm[] = forms.map((form) => ({
      id: form.id,
      name: form.name ?? '',
      fields: (form.fields ?? [])
        .map((field: StoredFormField) => field.name)
        .filter((name): name is string => !!name),
    }));

    return res.status(200).send(result);
  } catch (err) {
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
