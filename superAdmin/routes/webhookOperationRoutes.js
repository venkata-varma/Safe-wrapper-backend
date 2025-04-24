const router = require("express").Router();

const {
  validateWebHookReceiveData,
  receiveWebhookData,
} = require("../controllers/webhookOperationController");

router.post(
  "/:randomNumber/:accountId",
  validateWebHookReceiveData,
  receiveWebhookData
);
module.exports = router;
