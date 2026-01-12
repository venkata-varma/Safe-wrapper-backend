const router = require('express').Router();
let squarePOSDataPointsController = require('../controllers/squarePOSDataPointsController')
const { validateAccountExistAndActive } = require('../controllers/squarePOSMasterContollers')
const auth = require('../../middleware/authentication')

router.use(auth)

router.get('/get-square-pos-payload-headers/:accountId', validateAccountExistAndActive, squarePOSDataPointsController.getSquarePosPayloadHeaders)
router.post('/get-shifts-transactions-reconcilation/:accountId', validateAccountExistAndActive, squarePOSDataPointsController.getSquarePOSShiftTransactionsReconcilation)
module.exports = router;
