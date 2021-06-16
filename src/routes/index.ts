import express from 'express';
import { restMiddleware } from '../server/middlewares';
import download from './download';

const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);

export { router };
