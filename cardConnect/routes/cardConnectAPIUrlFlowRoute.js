const router = require('express').Router();

const {
    createAPIUrlFlow
} = require('../controllers/cardConnectAPIUrlFlowController');

router.post('/create-card-connect-api-url-flow', createAPIUrlFlow)

module.exports = router;
