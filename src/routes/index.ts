import express from 'express';
import { restMiddleware, rateLimitMiddleware } from '../server/middlewares';
import download from './download';
import upload from './upload';
import email from './email';
import fileUpload from 'express-fileupload';

/** Express router instance */
const router = express.Router();

router.use(fileUpload());
router.use(rateLimitMiddleware);
router.use(restMiddleware);
router.use('/download', download);
router.use('/upload', upload);
router.use('/email', email);

export { router };
