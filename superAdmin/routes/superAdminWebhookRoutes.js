const router = require("express").Router();

const {
  createWebHook,
  validateAccountStatusToCreateWebHook,
  generateWebhookToken,
  validateWebHookData,
  createWebHookLog,
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
  validateAuthentication,
  getTransactionsReports,
  getProgressMeterAndTotalsOfSingleMachine,
  getExceptionsOfAccount,
  getTransactionDenominations
} = require("../controllers/superAdminWebhooksController");

router.post(
  "/:randomNumber/:accountId",
  validateWebHookReceiveData,
  receiveWebhookData
);

const {superAdminAuth} = require("../middleware/superAdminAuthentication");

router.use(superAdminAuth);
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

router.get('/get-all-webhook-details', validateAccountStatus,getAllWebhooksOfAccount)

router.get('/get-webhook-transactions',getAllWebhookTransactionsOfAccount)
router.get('/get-webhook-payload-headers',getAllWebhookPayoadHeadersOfAccount)
router.get('/get-dashboard-statistics',getDashboardStatisticsOfAccount)
router.get('/get-list-of-machines',getListOfMachines)
router.get('/get-all-machine-reports',getAllMachineReports)
router.get('/get-payload-reports',getPayloadReports)
router.get('/get-exceptions',getExceptionsOfAccount)
router.get('/get-transaction-denominations',getTransactionDenominations)

//One POS
router.get('/get-transactions-reports',validateAuthentication, getTransactionsReports)

router.get('/get-progres-meter-total-single-machine', getProgressMeterAndTotalsOfSingleMachine)
module.exports = router;
