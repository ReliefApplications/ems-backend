import express from 'express';
import graphqlMiddleware from '../middlewares/graphql';
import download from './download';


const router = express.Router();
router.use(graphqlMiddleware);
router.use('/download', download);


export default router;