import express from 'express';
import { restMiddleware, rateLimitMiddleware } from '../server/middlewares';
import download from './download';
import proxy from './proxy';
import upload from './upload';
import email from './email';
import summarycards from './summarycards';
import fileUpload from 'express-fileupload';

/** Express router instance */
const router = express.Router();

router.use(fileUpload());
router.use(rateLimitMiddleware);
router.use(restMiddleware);
router.use('/download', download);
router.use('/proxy', proxy);
router.use('/upload', upload);
router.use('/email', email);
router.use('/summarycards', summarycards);

export { router };
