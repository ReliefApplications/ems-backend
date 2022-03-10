import express from 'express';
import { restMiddleware } from '../server/middlewares';
import download from './download';
import upload from './upload';
import sendEmail from './send-email';
import fileUpload from 'express-fileupload';

const router = express.Router();
router.use(fileUpload());
router.use(restMiddleware);
router.use('/download', download);
router.use('/upload', upload);
router.use('/send-email', sendEmail);

export { router };
