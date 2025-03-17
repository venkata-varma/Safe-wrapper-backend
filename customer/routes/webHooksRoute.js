// const router = require('express').Router()


// const {createWebHook,
//     validateIntegrationForWebHook,
//     updateWebHook,
//     getAllWebHooks,
//     getIndividualWebHook,
//     updateWebHookStatus,
//     generateWebhookToken,
//     validateWebHookData,
//     createWebHookLog,
//     getWebHookLogsReports,
//     CPDTestWebHookLog} = require('../controllers/webHooksController')


// router.post('/create-webhook-logs',validateWebHookData, createWebHookLog)
// router.post('/cpd-test-webhook', CPDTestWebHookLog)


// const auth = require('../../middleware/authentication')
// router.use(auth)
// router.post('/create-webhook', createWebHook)

// router.patch('/update-webhook',validateIntegrationForWebHook, updateWebHook)
// router.patch('/update-webhook-status',validateIntegrationForWebHook, updateWebHookStatus)

// router.get('/get-all-webhooks',validateIntegrationForWebHook, getAllWebHooks)
// router.get('/get-single-webhook',validateIntegrationForWebHook,getIndividualWebHook)
// router.get('/generate-webhook',generateWebhookToken)
// router.get('/get-webhook-logs-reports',validateIntegrationForWebHook, getWebHookLogsReports)



// module.exports = router