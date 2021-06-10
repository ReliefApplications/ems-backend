import express from 'express';
import download from './download';
import proxy from './proxy';
import restMiddleware from '../middlewares/rest';

const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);
router.use('/proxy', proxy);

export default router;