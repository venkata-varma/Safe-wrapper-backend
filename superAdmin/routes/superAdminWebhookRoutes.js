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
  validateWebhookandAccount,updateWebhookSettings,
  getAllWebhookTransactionsOfAccount,
  getAllWebhookPayoadHeadersOfAccount,
  getDashboardStatisticsOfAccount,
  getListOfMachines,
  getAllMachineReports,
  getPayloadReports,
  validateAuthentication,
  getTransactionsReports,
  getExceptionsOfAccount,
  getTransactionDenominations,
  updateWebhookStatus,
  updateWebhookAutoDataSyncStatus,
  getWebhookDetailsOfAccount
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
router.patch('/update-webhook-settings',validateWebhookandAccount,updateWebhookSettings)
router.patch('/update-webhook-status',updateWebhookStatus)
router.patch('/update-webhook-auto-data-sync-status',updateWebhookAutoDataSyncStatus)
router.get(
  "/get-individual-webhook-details",
  validateWebhookStatus,
  getIndividualWebhookDetails
);

router.get('/get-machine-transactions',getAllWebhookTransactionsOfAccount)
router.get('/get-machine-payload-headers',getAllWebhookPayoadHeadersOfAccount)
router.get('/get-dashboard-statistics',getDashboardStatisticsOfAccount)
router.get('/get-list-of-machines',getListOfMachines)
router.get('/get-all-machine-reports',getAllMachineReports)
router.get('/get-machine-reports',getPayloadReports)
router.get('/get-exceptions',getExceptionsOfAccount)
router.get('/get-transaction-denominations',getTransactionDenominations)
router.get('/get-all-webhook-details-of-account',getWebhookDetailsOfAccount)
// router.get('/get-')

//One POS
router.get('/get-transactions-reports',validateAuthentication, getTransactionsReports)

module.exports = router;
