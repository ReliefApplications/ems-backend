import express from 'express';
import { AppAbility } from '@security/defineUserAbility';
import { Application } from '@models';
import i18next from 'i18next';
import { logger } from '@services/logger.service';
import { downloadFile } from '@utils/files';
import fs from 'fs';
import sanitize from 'sanitize-filename';

/**
 * Exports css or scss custom style files
 */
const router = express.Router();

/**
 * css or scss custom style files from applications
 */
router.get('/application/:id', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const application: Application = await Application.findById(req.params.id);
  if (!application) {
    res.status(404).send(i18next.t('common.errors.dataNotFound'));
  }
  if (ability.cannot('read', application)) {
    res.status(403).send(i18next.t('common.errors.permissionNotGranted'));
  }
  if (!application.cssFilename) {
    res.status(201).send(i18next.t('routes.style.noStyle'));
  }
  const blobName = application.cssFilename;
  const path = `files/${sanitize(blobName)}`;
  await downloadFile('applications', blobName, path);
  res.download(path, () => {
    fs.unlink(path, () => {
      logger.info('file deleted');
    });
  });
});

export default router;
