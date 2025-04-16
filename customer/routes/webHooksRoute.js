const router = require("express").Router();

const {
  createWebHook,
  validateAccountStatusToCreateWebHook,
  //validateIntegrationForWebHook,
  //updateWebHook,
  //getAllWebHooks,
  //getIndividualWebHook,
  //updateWebHookStatus,
  generateWebhookToken,
  validateWebHookData,
  createWebHookLog,
  //getWebHookLogsReports,
  validateWebHookReceiveData,
  receiveWebhookData,
  decryptString,
  getIndividualWebhookDetails,
  validateWebhookStatus,
  validateAccountStatus,
  getAllWebhooksOfAccount,
  validateWebhookandAccount,updateWebhookSettings,
  getAllWebhookTransactionsOfAccount,
  getAllWebhookPayoadHeadersOfAccount,
  getDashboardStatisticsOfAccount,
  getListOfMachines,
  getAllMachineReports,
  getPayloadReports,
  getSingleMachineReport,
  getProgressMeterAndTotalsOfSingleMachine,
  getExceptionsOfAccount
} = require("../controllers/webHooksController");

router.post(
  "/:randomNumber/:accountId",
  validateWebHookReceiveData,
  receiveWebhookData
);

const auth = require("../../middleware/authentication");

router.use(auth);
router.post(
  "/create-webhook",
  validateAccountStatusToCreateWebHook,
  createWebHook
);

router.post("/decrypt-string",  decryptString);
router.patch('/update-webhook-settings/:webhookMasterId',validateWebhookandAccount,updateWebhookSettings)

router.get(
  "/get-individual-webhook-details/:webhookMasterId",
  validateWebhookStatus,
  getIndividualWebhookDetails
);

router.get('/get-all-webhook-details/:accountId', validateAccountStatus,getAllWebhooksOfAccount)

router.get('/get-webhook-transactions',getAllWebhookTransactionsOfAccount)
router.get('/get-webhook-payload-headers/:accountId',getAllWebhookPayoadHeadersOfAccount)
router.get('/get-dashboard-statistics/:accountId',getDashboardStatisticsOfAccount)
router.get('/get-list-of-machines',getListOfMachines)
router.get('/get-all-machine-reports',getAllMachineReports)
router.get('/get-payload-reports',getPayloadReports)
router.get('/get-exceptions/:accountId',getExceptionsOfAccount)

//One POS
router.get('/get-single-machine-report',getSingleMachineReport)
// router.patch('/update-webhook',validateIntegrationForWebHook, updateWebHook)
// router.patch('/update-webhook-status',validateIntegrationForWebHook, updateWebHookStatus)

 //router.get('/get-all-webhooks',validateIntegrationForWebHook, getAllWebHooks)
// router.get('/get-single-webhook',validateIntegrationForWebHook,getIndividualWebHook)

// router.get('/get-webhook-logs-reports',validateIntegrationForWebHook, getWebHookLogsReports)




router.get('/get-progres-meter-total-single-machine', getProgressMeterAndTotalsOfSingleMachine)
module.exports = router;
