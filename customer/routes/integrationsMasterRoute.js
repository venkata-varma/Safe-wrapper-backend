
const router = require('express').Router();

const {validateCreateIntegrationsCount,createIntegrationMaster} = require('../controllers/integrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)

router.post('/create-integrationmaster',validateCreateIntegrationsCount,createIntegrationMaster )

module.exports = router;
