const asyncWrapper = require("../../middleware/asyncWrapper");
const serviceProviderServicesModel = require("../../models/serviceProviderServicesModel");
const serviceProvisersListModel = require('../../models/serviceProviderList');
const { encryptData } = require("../../utils/encryptionAlgorithms");
const { CPDAuthentication, DFAuthentication, SNOWAuthentication, CYSAuthentication } = require("../../utils/serviceProvidersAuthentication");
const customConstants = require('../config/customConstants.json');
const { validateServiceProviders } = require("../../utils/authUtils");
const { default: mongoose } = require("mongoose");


exports.validateServiceProviderExist = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderShortName, serviceProviderFullName} = req.body
    const serviceProviderExist = await serviceProvisersListModel.find({$or:[{serviceProviderShortName:serviceProviderShortName},{serviceProviderFullName:serviceProviderFullName}]})
    if(serviceProviderExist.length>0){
        return res.status(customConstants.statusCodes.DATA_ALREADY_EXISTED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_EXIST,
        })
    }
    else{
        next()
    }
})

exports.createServiceproviders = asyncWrapper(async(req,res)=>{
    const {logo,serviceProviderShortName,serviceProviderFullName,credentials,workOrderStatus,status = "active"} = req.body
    let encryptCode
    if(credentials && credentials !== null && Object.values(credentials).length > 0){
        encryptCode = await encryptData(credentials)    }
    else{
        encryptCode = null
    }

    const addServiceProviders = await serviceProvisersListModel.create({...req.body, serviceProviders:serviceProviderShortName, testCredentials:encryptCode})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ADD_SERVICE_PROVIDER,
    }) 
})

exports.serviceProviderCheck = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderId} = req.params

    const validateserviceProvider = await serviceProvisersListModel.findById(serviceProviderId).lean()
    if(!validateserviceProvider){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INVALID_SERVICE_PROVIDER,
        })
    }
    else{
        next()
    }
})

/**
 * Middleware function to check whether given credentials are valid or not.
 * If valid, this middleware passes function call to next function "updateServiceProviderList"
 * 
 */

exports.serviceProviderListCredentialsValidation = asyncWrapper(async (req, res, next) => {

    const { credentials } = req.body
    let serviceProviderValidation = await validateServiceProviders(req.body.credentials)
    if (credentials.requestMethod === "body") {
      if (serviceProviderValidation.status === "fail" || serviceProviderValidation === undefined ||
          serviceProviderValidation.statusCode !== 200 || !serviceProviderValidation.responseData?.access_token) {
        return res.status(serviceProviderValidation.statusCode).json({
          status: serviceProviderValidation.status,
          message: serviceProviderValidation.message
        })
      }
      else {
        next()
      }
    }
    else if (credentials.requestMethod === "headers") {
      if (serviceProviderValidation.status === "fail" || serviceProviderValidation === undefined ||
        serviceProviderValidation.statusCode !== 200) {
        return res.status(serviceProviderValidation.statusCode).json({
          status: serviceProviderValidation.status,
          message: serviceProviderValidation.message
        })
      }
      else {
        next()
      }
    }
    else{
        next()
    }
  })

/*
exports.serviceProviderListCredentialsValidation = asyncWrapper(async (req, res, next) => {
    // const serviceProviderList = await serviceProvisersListModel.findOne({ _id: req.params.serviceProviderId })
    
    let serviceProviders = req.body.serviceProviderShortName
    if(req.body.credentials && req.body.credentials !== null && Object.values(req.body.credentials).length > 0){
        if (serviceProviders === 'CPD') {
            const checkCPDCredentials = await CPDAuthentication(req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type, req.body.credentials.baseUrl)
    
            if (checkCPDCredentials === 'error' || checkCPDCredentials === undefined) {
                console.log("CPD-------------------Middleware failed")
                return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                    status: customConstants.messages.MESSAGE_FAIL,
                    message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
                });
            }
        }
        if (serviceProviders === 'DF') {
            const checkDFCredentials = await DFAuthentication(req.body.credentials.df_auth, req.body.credentials.df_servicecode, req.body.credentials.baseUrl)
    
            if (checkDFCredentials !== 200) {
                console.log("DF-------------------Middleware failed")
                return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                    status: customConstants.messages.MESSAGE_FAIL,
                    message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
                });
            }
        }
        if (serviceProviders === 'SNOW') {
            const checkDFCredentials = await SNOWAuthentication(req.body.credentials.baseUrl, req.body.credentials.username, req.body.credentials.password, req.body.credentials.client_id, req.body.credentials.client_secret, req.body.credentials.grant_type)
    
            if (checkDFCredentials !== 200) {
                console.log("SNOW-------------------Middleware failed")
                return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                    status: customConstants.messages.MESSAGE_FAIL,
                    message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
                });
            }
        }
        if (serviceProviders === 'CYS') {
            const checkDFCredentials = await CYSAuthentication(req.body.credentials.baseUrl, req.body.credentials.grant_type, req.body.credentials.cys_auth)
    
            if (checkDFCredentials !== 200) {
                console.log("CYS-------------------Middleware failed")
                return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
                    status: customConstants.messages.MESSAGE_FAIL,
                    message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
                });
            }
        }
        // console.log("0-------------------Middleware passed")
        next()
    }
    else{
        next()
    }
    
})
    */

/**
 * After middleware to validate credentials is passed, this funtion is to encrypt credentials and update it in record
 * On success, it returns newly updated value
 * 
 */

exports.updateServiceProviderList = asyncWrapper(async (req, res) => {
    const {credentials} = req.body
    let encryptCode
    if(credentials && credentials !== null && Object.values(credentials).length > 0){
        encryptCode = await encryptData(req.body.credentials)
    }
    else{
        encryptCode = await serviceProvisersListModel.findById(req.params.serviceProviderId).testCredentials
    }

    const updateServiceProviderList = await serviceProvisersListModel.findOneAndUpdate({ _id: req.params.serviceProviderId }, { $set: { testCredentials: encryptCode,...req.body } }, { new: true, runValidators: true })
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER_LIST,
        data: {
            updateServiceProviderList
        }
    })
})



exports.getIndividualServiceProviderServiceDetails = asyncWrapper(async(req,res)=>{
    const {serviceProviderId} = req.params
    const serviceProviderDetails = await serviceProvisersListModel.findById(serviceProviderId).lean()
    const serviceProviderServices = await serviceProviderServicesModel.find({serviceProviderListId:serviceProviderId}).sort({ status:1,createdAt:-1})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER,
        data:{serviceProviderDetails,serviceProviderServices}
    }) 
})


/**
 * Function to retreive all the records from table "service provider list "
 * 
 */
exports.getAllServiceProvidersList = asyncWrapper(async (req, res) => {
    // const allServiceProviders = await serviceProvisersListModel.find({});
    //Sort the service providers with "active" first, followed by the remaining statuses.
    const allServiceProviders = await serviceProvisersListModel.aggregate([
       { 
        $addFields:{
            sortOrder:{
                $switch:{
                    branches:[
                        {case:{$eq:["$status","active"]},then:1},
                        {case:{$eq:["$status","delete"]},then:2}
                    ],
                    default:3
                }
            }
        }
    },
    {
        $sort:{
            sortOrder:1,
            createdAt:1
        }
    },
    {$project:{
        sortOrder:0,
        // status:1,
        // createdAt:1
    }}
    ])
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_SERVICE_PROVIDERS,
        data: {
            allServiceProviders
        }
    })
})

/**
 * Function to delete (deactivate) service provider list from super-admin side
 *  @params {*} serviceProviderListId
 * If success, returns newly updated service provider list record 
 */
exports.deleteServiceProviderList = asyncWrapper(async (req, res) => {

    const {status} = req.body
    if(status === 'delete'){
        await serviceProvisersListModel.findByIdAndUpdate(req.params.serviceProviderId,{status:"deleted"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_DELETE_SERVICE_PROVIDER_LIST,
        })
    }
    else if(status === 'active'){
        const fieldMappingDetails = await serviceProvisersListModel.findByIdAndUpdate(req.params.serviceProviderId,{status:"active"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACTIVE_SERVICE_PROVIDER_LIST,
        })
    }
})

exports.serviceProviderExist = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderId} = req.params
    const serviceProviderExist = await serviceProvisersListModel.findById({_id: new mongoose.Types.ObjectId(serviceProviderId)})
    if(!serviceProviderExist){
        return res.status(customConstants.statusCodes.DATA_ALREADY_EXISTED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_INVALID,
        })
    }
    else{
        next()
    }
})

exports.updateSPServiceCategories = asyncWrapper(async(req,res)=>{
    const {serviceProviderId} = req.params
    await serviceProvisersListModel.findByIdAndUpdate(serviceProviderId,{categories:req.body.categories},{new:true,upsert:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER_CATEGORIES,
    })
})