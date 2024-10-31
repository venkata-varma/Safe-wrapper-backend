const asyncWrapper = require("../../middleware/asyncWrapper");
const serviceProvisersListModel = require('../../models/serviceProviderList')
const customConstants = require('../config/customConstants.json')


exports.validateServiceProviderExist = asyncWrapper(async(req,res,next)=>{
    const {serviceProviders} = req.body
    const serviceProviderExist = await serviceProvisersListModel.find({serviceProviders:serviceProviders})
    if(serviceProviderExist.length>0){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SERVICE_PROVIDER_EXIST,
        })
    }
    else{
        next()
    }
})

exports.createServiceproviders = asyncWrapper(async(req,res)=>{
    const {logo,serviceProviders,testCredentials,workOrderStatus,status = "active"} = req.body
    const addServiceProviders = await serviceProvisersListModel.create({...req.body})
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

exports.updateServiceProviderDetails = asyncWrapper(async(req,res)=>{
    const {serviceProviderId} = req.params
    
    const serviceProviderDetails = await serviceProvisersListModel.findByIdAndUpdate(serviceProviderId,{...req.body},{new:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER,
    }) 
})


exports.getIndividualServiceProviderDetails = asyncWrapper(async(req,res)=>{
    const {serviceProviderId} = req.params
    const serviceProviderDetails = await serviceProvisersListModel.findById(serviceProviderId)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDER,
        data:serviceProviderDetails
    }) 
})