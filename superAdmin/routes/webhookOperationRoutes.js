const router = require("express").Router();

const {
  validateWebHookReceiveData,
  receiveWebhookData,
} = require("../controllers/webhookOperationController");


//This is the actual point of work. Similar end-points found at different places are not working
router.post(
  "/:randomNumber/:accountId",
  validateWebHookReceiveData,
  receiveWebhookData
);
module.exports = router;
