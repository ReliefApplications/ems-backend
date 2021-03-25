import express from 'express';
import restMiddleware from '../middlewares/rest';
import download from './download';


const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);


export default router;