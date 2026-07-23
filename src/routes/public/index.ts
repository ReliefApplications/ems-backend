import express from 'express';
import { status } from '@const/enumTypes';
import { Form } from '@models';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import mongoose from 'mongoose';

/**
 * Routes accessible without authentication.
 * Only exposes content explicitly marked as public.
 */
const router = express.Router();

/** Form fields exposed on public endpoints, permissions excluded */
const PUBLIC_FORM_FIELDS = [
  'name',
  'structure',
  'fields',
  'status',
  'createdAt',
  'modifiedAt',
].join(' ');

/**
 * Get a single form by id, if marked as public.
 */
router.get('/forms/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send(req.t('common.errors.dataNotFound'));
    }
    const form = await Form.findOne({
      _id: req.params.id,
      isPublic: true,
      status: status.active,
    }).select(PUBLIC_FORM_FIELDS);
    if (!form) {
      return res.status(404).send(req.t('common.errors.dataNotFound'));
    }
    return res.status(200).send(form);
  } catch (err) {
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
