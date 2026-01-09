const router = require('express').Router();
let squarePOSDataPointsController = require('../controllers/squarePOSDataPointsController')
const auth = require('../../middleware/authentication')

router.use(auth)

router.get('/get-square-pos-payload-headers/:accountId', squarePOSDataPointsController.getSquarePosPayloadHeaders)
router.post('/get-shifts-transactions-reconcilation/:accountId', squarePOSDataPointsController.getSquarePOSShiftTransactionsReconcilation)
module.exports = router;
