import express from 'express';
import { restMiddleware, rateLimitMiddleware } from '../server/middlewares';
import download from './download';
import proxy from './proxy';
import upload from './upload';
import email from './email';
import fileUpload from 'express-fileupload';
import permissions from './permissions';
import roles from './roles';
import feature from './gis';

/** Express router instance */
const router = express.Router();

router.use(fileUpload());
router.use(rateLimitMiddleware);
router.use(restMiddleware);
router.use('/download', download);
router.use('/proxy', proxy);
router.use('/upload', upload);
router.use('/email', email);
router.use('/permissions', permissions);
router.use('/roles', roles);
router.use('/feature', feature);

export { router };
