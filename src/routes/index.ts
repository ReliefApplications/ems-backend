import express from 'express';
import { restMiddleware } from '../server/middlewares';
import download from './download';
import upload from './upload';

const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);
router.use('/upload', upload);

export { router };
