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
  validateWebhookandAccount, updateWebhookSettings,
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
  getTransactionDenominations,
  merchantSmartFilteredDashboard
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

router.post("/decrypt-string", decryptString);
router.patch('/update-webhook-settings/:webhookMasterId', validateWebhookandAccount, updateWebhookSettings)

router.get(
  "/get-individual-webhook-details/:webhookMasterId",
  validateWebhookStatus,
  getIndividualWebhookDetails
);

router.get('/get-all-webhook-details/:accountId', validateAccountStatus, getAllWebhooksOfAccount)

router.get('/get-machine-transactions', getAllWebhookTransactionsOfAccount)
router.get('/get-machine-payload-headers/:accountId', getAllWebhookPayoadHeadersOfAccount)
router.get('/get-dashboard-statistics/:accountId', getDashboardStatisticsOfAccount)
router.get('/get-list-of-machines', getListOfMachines)
router.get('/get-all-machine-reports', getAllMachineReports)
router.get('/get-machine-reports', getPayloadReports)
router.get('/get-exceptions/:accountId', getExceptionsOfAccount)
router.get('/get-transaction-denominations', getTransactionDenominations)

//One POS
router.get('/get-transactions-reports', validateAuthentication, getTransactionsReports)

router.get('/get-progres-meter-total-single-machine', getProgressMeterAndTotalsOfSingleMachine)




router.get('merchant-smart-filtered-dashboard/:accountId', merchantSmartFilteredDashboard)
module.exports = router;
