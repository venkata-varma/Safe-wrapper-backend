const express = require('express')
const { CheckAuthenticationStatus } = require('../controller/AuthManagerController')
const router = express.Router()

// router.use(superAdminAuth)

router.route('/').post(CheckAuthenticationStatus)


module.exports = router