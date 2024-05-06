import express from 'express';
import { restMiddleware, rateLimitMiddleware } from '../server/middlewares';
import download from './download';
import proxy from './proxy';
import upload from './upload';
import email from './email';
import summarycards from './summarycards';
import fileUpload from 'express-fileupload';
import permissions from './permissions';
import roles from './roles';
import gis from './gis';
import style from './style';
import schema from './schema';
import config from 'config';

/** Express router instance */
const router = express.Router();

router.use(fileUpload());
if (config.get('server.rateLimit.enable')) {
  router.use(rateLimitMiddleware);
}
router.use(restMiddleware);
router.use('/download', download);
router.use('/proxy', proxy);
router.use('/upload', upload);
router.use('/email', email);
router.use('/permissions', permissions);
router.use('/summarycards', summarycards);
router.use('/roles', roles);
router.use('/gis', gis);
router.use('/style', style);
router.use('/schema', schema);

export { router };
