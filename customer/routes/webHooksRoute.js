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
    validateWebHookReceiveData,
    receiveWebhookData,

} = require('../controllers/webHooksController')



router.post('/:accountId', validateWebHookReceiveData,receiveWebhookData)


const auth = require('../../middleware/authentication')



router.post('/create-webhook',auth,validateAccountStatusToCreateWebHook ,createWebHook)

// router.patch('/update-webhook',validateIntegrationForWebHook, updateWebHook)
// router.patch('/update-webhook-status',validateIntegrationForWebHook, updateWebHookStatus)

// router.get('/get-all-webhooks',validateIntegrationForWebHook, getAllWebHooks)
// router.get('/get-single-webhook',validateIntegrationForWebHook,getIndividualWebHook)
 
// router.get('/get-webhook-logs-reports',validateIntegrationForWebHook, getWebHookLogsReports)



 module.exports = router