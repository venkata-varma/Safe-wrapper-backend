const router = require('express').Router();
const auth = require('../../middleware/authentication');
const conditionalWorkOrderController = require('../controllers/conditionalWorkOrderController')
router.use(auth)

router.post('/search-work-order',conditionalWorkOrderController.searchWOsByConditions)
router.post('/get-work-orders-based-on-conditons',conditionalWorkOrderController.getWorkOrdersBasedOnConditions)

module.exports = router