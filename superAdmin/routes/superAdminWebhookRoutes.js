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
  validateWebhookandAccount, updateWebhookSettings,
  getAllWebhookTransactionsOfAccount,
  getAllWebhookPayoadHeadersOfAllAccounts,
  getDashboardStatisticsOfAccount,
  getListOfMachines,
  getAllMachineReports,
  getPayloadReports,
  validateAuthentication,
  getTransactionsReports,
  getAllExceptionsWithFilters,
  getTransactionDenominations,
  updateWebhookStatus,
  updateWebhookAutoDataSyncStatus,
  getWebhookDetailsOfAccount,
  getOneHubPosLogsDetails,
  superAdminSmartFilteredDashboard,
  getExceptionsOfAccount
} = require("../controllers/superAdminWebhooksController");


const { superAdminAuth } = require("../middleware/superAdminAuthentication");

router.use(superAdminAuth);
router.post(
  "/create-webhook",
  validateAccountStatusToCreateWebHook,
  createWebHook
);

router.post("/decrypt-string", decryptString);
router.patch('/update-webhook-settings', validateWebhookandAccount, updateWebhookSettings)
router.patch('/update-webhook-status', updateWebhookStatus)
router.patch('/update-webhook-auto-data-sync-status', updateWebhookAutoDataSyncStatus)
router.get(
  "/get-individual-webhook-details",
  validateWebhookStatus,
  getIndividualWebhookDetails
);

router.get('/get-machine-transactions', getAllWebhookTransactionsOfAccount)
router.get('/get-machine-payload-headers', getAllWebhookPayoadHeadersOfAllAccounts)
router.get('/get-dashboard-statistics', getDashboardStatisticsOfAccount)
router.get('/get-list-of-machines', getListOfMachines)
router.get('/get-all-machine-reports', getAllMachineReports)
router.get('/get-machine-reports', getPayloadReports)
router.get('/get-all-exceptions', getAllExceptionsWithFilters)
//router.get('/get-exceptions', getExceptionsOfAccount)
router.get('/get-transaction-denominations', getTransactionDenominations)
router.get('/get-all-webhook-details-of-account', getWebhookDetailsOfAccount)
router.get('/get-onehubpos-logs-details', getOneHubPosLogsDetails)
// router.get('/get-')

//One POS
router.get('/get-transactions-reports', validateAuthentication, getTransactionsReports)


router.get('/super-admin-smart-filtered-dashboard', superAdminSmartFilteredDashboard)

module.exports = router;
