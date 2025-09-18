import { Router } from 'express';
import { getCropPredictionData, getCropYieldPrediction, getMarketData } from '../controllers/data.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/crop-data").get(verifyJWT, getCropPredictionData);
router.route("/crop-yield").post(verifyJWT, getCropYieldPrediction);
router.route("/market-data").get(verifyJWT, getMarketData); 
export default router;