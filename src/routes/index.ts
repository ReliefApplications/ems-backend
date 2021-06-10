import express from 'express';
import download from './download';
import restMiddleware from '../middlewares/rest';

const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);


export default router;