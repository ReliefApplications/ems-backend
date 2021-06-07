import express from 'express';
import restMiddleware from '../middlewares/rest';
import download from './download';
import upload from './upload';


const router = express.Router();
router.use(restMiddleware);
router.use('/download', download);
router.use('/upload', upload);


export default router;
