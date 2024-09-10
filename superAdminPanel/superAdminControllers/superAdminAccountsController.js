const accountsModel = require('../../models/accountsModel');
const asyncWrapper = require('../../middleware/asyncWrapper')
const customConstants = require('../config/customConstants.json');
const { validatePhoneNumber } = require('../../utils/userLoginValidation')
const { hashPwd, comparePassword } = require('../../utils/helpers')
const usersModel = require('../../models/usersModel')
const mongoose = require('mongoose')
const integrationsMasterModel = require('../../models/integrationsMasterModel');
const accountSettingsModel = require('../../models/accountSettingsModel');
const serviceProvidersListModel = require('../../models/serviceProviderList')
const { CPDAuthentication, DFAuthentication, SNOWAuthentication, CYSAuthentication } = require('../../utils/serviceProvidersAuthentication')
const { encryptData, decryptData } = require('../../utils/encryptionAlgorithms');
const workOrderLifeCycleModel = require('../../models/workOrderLifeCycleModel');
const CPDWorkordersModel = require('../../models/CPDWorkordersModel')
const DFWorkOrdersModel = require('../../models/DFWorkOrdersModel')
const SNOWWorkOrdersModel = require('../../models/SNOWWorkOrdersModel')
const CYSWorkOrdersModel = require('../../models/CYSWorkordersModel')
const sessionsModel = require('../../models/sessionsModel')
const integrationsMasterSettingsModel = require('../../models/integrationsSettingsModel');
const integrationsMasterServiceProvidersModel = require('../../models/integrationsMasterServiceProvidersModel')
const integrationsMasterFieldMappingsModel = require('../../models/integrationsFieldMappingModel')
const integrationsExceptionsModel = require('../../models/integrationsExceptionsModel')
const integrationsCronsModel = require('../../models/integrationsCronsModel')
const moment=require('moment')
const {returnIndianDate}=require('../../utils/utilsFunctions');
const CPDtoDFBuildingMasterModel = require('../../models/CPDtoDFBuildingMasterModel');

/*
Miidleware function to controller, "createAccount"
Mandatory fields ->  AccountName, CompanyName, Email, Phone, Password, City, State, Pincode, Country
If returns True, moves to "next" function,-> "createAccount"
*/
exports.validateAccountRegistration = asyncWrapper(async (req, res, next) => {
    console.log('reqoriginal', req.originalUrl.includes('super-admin'))
    const { accountName, companyName, email, phone, password, city, state, pincode, country, accountType } = req.body;

    //console.log(accountName, companyName, email, phone, password,"okkkkk");
    if (!accountName || !companyName || !email || !phone || !password || !accountType || !city || !state || !country || !pincode) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
        });
    }

    // if(!req.file){
    //     return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
    //         status: customConstants.messages.MESSAGE_FAIL,
    //         message: customConstants.messages.MESSAGE_LOGO_MANDATORY
    //     });
    // }
    if (!await validatePhoneNumber(phone)) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PHONE_NUMBER_VALIDATE  // Might need to use API to validate Phone number
        });
    }
    else {

        next()
    }
})

/**
 * Function to create super-admin account
 * Account Type=super-admin
 */


exports.superAdminAccountRegister = asyncWrapper(async (req, res) => {
    const baseUrl = process.env.DOMAIN_NAME;
    const { accountName, companyName, email, phone, password } = req.body
    const accountDetails = await accountsModel.findOne({ $or: [{ email }, { phone }] })
    if (accountDetails) {

        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {

        req.body.password = await hashPwd(password)
        const accountData = await accountsModel.create({
            ...req.body,
            status: "active",
            logo: req.file ? `${baseUrl}/accountLogos/${req.file.filename}` : ""
        })
        const customId = new mongoose.Types.ObjectId();

        const user = await usersModel.create({
            _id: customId,
            userId: customId,
            createdBy: customId,
            accountId: accountData._id,
            name: accountName,
            password: req.body.password,
            companyName: companyName,
            phone: phone,
            email: email,
            role: 'super-admin',
        });

        //To delete Password from Response while displaying it.
        delete accountData._doc.password;
        delete user._doc.password;

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_CREATED,

        })
    }


})


/**
 * Function to get all accounts
 * 
 */
exports.getAllAccounts = asyncWrapper(async (req, res) => {
    const allAccounts = await accountsModel.find({accountType:"customer"}, { password: 0 }).sort({ _id: -1 });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ALL_ACCOUNTS,
        data: {
            count: allAccounts.length,
            allAccounts
        }
    })
})

/**
 * Function to update "Account status"
 * @params AccountId
 * Returns Updated account record
 */
exports.updateAccountStatus = asyncWrapper(async (req, res) => {
    let accountId = req.params.accountId

    const models = [
        workOrderLifeCycleModel,
        CPDWorkordersModel,
        DFWorkOrdersModel,
        SNOWWorkOrdersModel,
        CYSWorkOrdersModel,
        integrationsCronsModel,
        integrationsExceptionsModel,
        integrationsMasterSettingsModel,
        integrationsMasterFieldMappingsModel,
        integrationsMasterServiceProvidersModel,
        integrationsMasterModel,
        sessionsModel,
        usersModel,
        accountSettingsModel,
        accountsModel
    ];
    if (req.body.status === 'deleted') {

        for (const model of models) {
            await model.deleteMany({ accountId });
        }

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_PERMENANT_DELETED,

        })

    } else if (req.body.status !== 'deleted') {
        const updateAccountStatus = await accountsModel.findOneAndUpdate({ _id: req.params.accountId }, { $set: { status: req.body.status } }, { new: true, runValidators: true })

        let responseMessage = `Success. Account is ${updateAccountStatus.status}.`
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: responseMessage,
            data: {
                updateAccountStatus
            }
        })

    }


})




/**
 * Function to get all integrations of respective account
 * @params AccountId
 * 
 */
exports.getAllIntegrations = asyncWrapper(async (req, res) => {
    const allIntegrations = await integrationsMasterModel.find({ accountId: req.params.accountId });


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ALL_INTEGRATIONS_OF_ACCOUNT,
        data: {
            count: allIntegrations.length,
            allIntegrations
        }
    })
})

/**
 * 
 * 
 */
exports.getAccountSettings = asyncWrapper(async (req, res) => {
    const accountSettings = await accountSettingsModel.findOne({ accountId: req.params.accountId }).lean();

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ACCOUNT_SETTINGS,
        data: {
            accountSettings
        }
    })
})


/**
 * Function to update settings of account
 * @params AccountId
 * 
 * 
 */
exports.updateAccountSettings = asyncWrapper(async (req, res) => {

    const updateAccountSettings = await accountSettingsModel.findOneAndUpdate({ accountId: req.params.accountId }, req.body, { new: true, runValidators: true })

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_ACCOUNT_SETTINGS,
        data: {
            updateAccountSettings
        }
    })


})


/**
 * Middleware function to check whether given credentials are valid or not.
 * If valid, this middleware passes function call to next function "updateServiceProviderList"
 * 
 */
exports.serviceProviderListCredentialsValidation = asyncWrapper(async (req, res, next) => {
    const serviceProviderList = await serviceProvidersListModel.findOne({ _id: req.params.serviceProviderListId })



    if (serviceProviderList.serviceProviders === 'CPD') {
        const checkCPDCredentials = await CPDAuthentication(req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type, req.body.credentials.baseUrl)

        if (checkCPDCredentials === 'error' || checkCPDCredentials === undefined) {
            console.log("CPD-------------------Middleware failed")
            return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                status: customConstants.messages.MESSAGE_FAIL,
                message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
            });
        }
    }
    if (serviceProviderList.serviceProviders === 'DF') {
        const checkDFCredentials = await DFAuthentication(req.body.credentials.df_auth, req.body.credentials.df_servicecode, req.body.credentials.baseUrl)

        if (checkDFCredentials !== 200) {
            console.log("DF-------------------Middleware failed")
            return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                status: customConstants.messages.MESSAGE_FAIL,
                message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
            });
        }
    }
    if (serviceProviderList.serviceProviders === 'SNOW') {
        const checkDFCredentials = await SNOWAuthentication(req.body.credentials.baseUrl, req.body.credentials.username, req.body.credentials.password, req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type)

        if (checkDFCredentials !== 200) {
            console.log("SNOW-------------------Middleware failed")
            return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                status: customConstants.messages.MESSAGE_FAIL,
                message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
            });
        }
    }
    if (serviceProviderList.serviceProviders === 'CYS') {
        const checkDFCredentials = await CYSAuthentication(req.body.credentials.baseUrl, req.body.credentials.grant_type, req.body.credentials.cys_auth)

        if (checkDFCredentials !== 200) {
            console.log("CYS-------------------Middleware failed")
            return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                status: customConstants.messages.MESSAGE_FAIL,
                message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
            });
        }
    }
    console.log("0-------------------Middleware passed")
    next()
})






/**
 * Function to retreive all the records from table "service provider list "
 * 
 */
exports.getAllServiceProvidersList = asyncWrapper(async (req, res) => {
    const allServiceProviders = await serviceProvidersListModel.find({});
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_SERVICE_PROVIDERS,
        data: {
            allServiceProviders
        }
    })
})

/**
 * After middleware to validate credentials is passed, this funtion is to encrypt credentials and update it in record
 * On success, it returns newly updated value
 * 
 */

exports.updateServiceProviderList = asyncWrapper(async (req, res) => {

    const encryptCode = await encryptData(req.body.credentials)

    const updateServiceProviderList = await serviceProvidersListModel.findOneAndUpdate({ _id: req.params.serviceProviderListId }, { $set: { testCredentials: encryptCode } }, { new: true, runValidators: true })
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER_LIST,
        data: {
            updateServiceProviderList
        }
    })
})

/**
 * Function to delete (deactivate) service provider list from super-admin side
 *  @params {*} serviceProviderListId
 * If success, returns newly updated service provider list record 
 */
exports.deleteServiceProviderList = asyncWrapper(async (req, res) => {
    const deleteServiceProviderList = await serviceProvidersListModel.findOneAndUpdate({ _id: req.params.serviceProviderListId }, { $set: { status: req.body.status } }, { new: true, runValidators: true })
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_DELETE_SERVICE_PROVIDER_LIST,
        data: {
            deleteServiceProviderList
        }
    })
})

/**
 * Middleware for the endpoint '/get-activity-logs/:accountId' 
 * Checks for the existence of : 1.  @params {*} accountId   2. @query {*} integrationsMasterId  3. @query {*} fromDate  3. @query {*} toDate
 * If all validations are passed, this middleware function call to "getActivityLogs" to return Activity logs based on given filters from customer.
 */

exports.validationForGetActivityLogs = asyncWrapper(async (req, res, next) => {
    const accountId = req.params.accountId;
    const integrationsMasterId = req.query.integrationsMasterId;
    let fromDateQuery = req.query.fromDate;
    let toDateQuery = req.query.toDate;
    console.log("fromDateQuery,toDateQuery",fromDateQuery,toDateQuery )
    if (!accountId) {
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNTID_NOT_FOUND,
        })
    }
    if (!integrationsMasterId) {
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_ID_NOT_FOUND,
        })
    }
    if (!fromDateQuery || !toDateQuery) {
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_DATE_QUERIES_NOT_FOUND,
        })
    }
    next()
})



/**
 * After passin thorugh the middleware "validationForGetActivityLogs", this End-point is to give Activity logs based on below given filters.
 * @params {*} accountId
 * @Filters :  1. Select Integration master Id   
 *             2. From date
 *             3. To date
 * 
 */
exports.getActivityLogs = asyncWrapper(async (req, res) => {
   
    const accountId = req.params.accountId;
    const integrationsMasterId = req.query.integrationsMasterId;
    let fromDateQuery =new Date(req.query.fromDate );
    console.log("fromDateQuery",  fromDateQuery)
    let toDateQuery =new Date(req.query.toDate );
    toDateQuery.setHours(23, 59,59,999)
    toDateQuery.setHours(toDateQuery.getHours()+5)
    toDateQuery.setMinutes(toDateQuery.getMinutes()+30)
    
     console.log("toDate", toDateQuery)
    const activityLogs = await integrationsCronsModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),

            createdAt: { $gte: fromDateQuery, $lte: toDateQuery }


            },

        },
        {$sort:{ createdAt:-1}}


    ])
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ACTIVITY_LOGS,
        activityLogs:activityLogs
    })

})

/**
 * Get all Building details of an integration by accountId and integrationsMasterId.
 */
exports.getIntegrationBuildingDetails = asyncWrapper(async(req,res)=>{
    const {accountId, integrationsMasterId} = req.query
    const getIntegrationBuildingDetails = await CPDtoDFBuildingMasterModel.find({integrationsMasterId:new mongoose.Types.ObjectId(integrationsMasterId),accountId:new mongoose.Types.ObjectId(accountId)})

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_INTEGRATION_BUILDING_DETAILS,
        data: getIntegrationBuildingDetails
    })
})