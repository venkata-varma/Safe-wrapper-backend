const router = require('express').Router();
const { access } = require('fs');
const auth = require('../middleware/authentication');
const workOrderControllers = require('../controllers/workOrdersController');


// {
//     "client_id":"30C1957F67CA191FBBB4B476B6907A2C",
//     "client_secret":"BBA9496EDC672FB945C87A1A77B1F6E98E989447CE60CFB86ED053CC7C1A06D3CDDEA6E5471EE3C892DB3A9F50FEA709BECAE71EFC335E5ADA90000C14623D2A",
//     "grant_type":"client_credentials"
// }
// router.post('/workOrderDetails/:ids/:messageId',workOrderControllers.workOrderDetails);
// router.post('/workorders-invoices-keys/:integrationId/:type',workOrderControllers.saveHotKeys);

// router.get('/get-latest-workOrders/:integrationId/:registrationId',workOrderControllers.latestWorkOrders);
// router.get('/get-workorders-by-registrationId/:registrationId',workOrderControllers.getAWorkOrdersByRegistrationId);
// router.get('/get-all-hot-workorders-invoices-keys/:integrationId',workOrderControllers.getWorkOrdersAndInvoicesKeys)

router.get('/get-corrigo-pro-latest-work-orders/:integrationServiceProviderId',workOrderControllers.get_corrigo_pro_latest_workOrders)


module.exports = router;
