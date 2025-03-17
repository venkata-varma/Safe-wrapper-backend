const router = require('express').Router()


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
    receiveWebhookData,
    validateWebHookReceiveData
} = require('../controllers/webHooksController')


router.post('/create-webhook-logs',validateWebHookData, createWebHookLog)
router.post('/webhook/:randomNumber/:accountId', validateWebHookReceiveData,receiveWebhookData)


const auth = require('../../middleware/authentication')
router.use(auth)


router.post('/create-webhook',validateAccountStatusToCreateWebHook ,createWebHook)

// router.patch('/update-webhook',validateIntegrationForWebHook, updateWebHook)
// router.patch('/update-webhook-status',validateIntegrationForWebHook, updateWebHookStatus)

// router.get('/get-all-webhooks',validateIntegrationForWebHook, getAllWebHooks)
// router.get('/get-single-webhook',validateIntegrationForWebHook,getIndividualWebHook)
 router.get('/generate-webhook',generateWebhookToken)
// router.get('/get-webhook-logs-reports',validateIntegrationForWebHook, getWebHookLogsReports)



 module.exports = router