const router = require('express').Router()

const auth = require('../../middleware/authentication')
const {createWebHook,
    validateIntegrationForWebHook,
    updateWebHook,
    getAllWebHooks,
    getIndividualWebHook,
    deleteWebHook} = require('../controllers/webHooksController')


router.post('/create-webhook', createWebHook)

router.patch('/update-webhook',validateIntegrationForWebHook, updateWebHook)
router.patch('/delte-webhook',validateIntegrationForWebHook, deleteWebHook)

router.get('/get-all-webhooks',validateIntegrationForWebHook, getAllWebHooks)
router.get('/get-single-webhook',validateIntegrationForWebHook,getIndividualWebHook)

module.exports = router