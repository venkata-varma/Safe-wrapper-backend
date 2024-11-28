const asyncWrapper = require("../../middleware/asyncWrapper");
const serviceProvidersIntegrationWithServicesModel = require("../../models/serviceProvidersIntegrationWithServicesModel");
const serviceProviderServicesModel = require("../../models/serviceProviderServicesModel");
const serviceProviderIntegrationsModel = require('../../models/serviceProviderIntegrationsModel')
const { defaultSatusMappingKeys, getDefaultDestinationStatusMappingkeys } = require("../../utils/general");
const customConstants = require('../config/customConstants.json');
const mongoose  = require("mongoose");
const serviceProviderListModel = require("../../models/serviceProviderList");

exports.validateServiceProvidersIntegration = asyncWrapper(async(req,res,next)=>{
    const {from, to} = req.body
    const serviceProvidersIntegrationsDetails = await serviceProviderIntegrationsModel.find({from:from,to:to})
    if(serviceProvidersIntegrationsDetails.length > 0){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_CREATE_SERVICE_PROVIDERS_INTEGRATION_EXIST,
        })
    }
    else{
        next()
    }
})

exports.createServiceProvidersIntegration = asyncWrapper(async(req,res)=>{
    await serviceProviderIntegrationsModel.create({...req.body})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CREATE_SERVICE_PROVIDERS_INTEGRATION,
    })
})

exports.validateServiceProvidersIntegrationExist = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderIntegrationId} = req.params
    const serviceProviderIntegrationDetails = await serviceProviderIntegrationsModel.findById(serviceProviderIntegrationId)
    if(!serviceProviderIntegrationDetails){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_CREATE_SERVICE_PROVIDERS_INTEGRATION_NOT_EXIST,
        })
    }
    else{
        next()
    }
})

exports.updateServiceProvidersIntegration = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationId} = req.params
    await serviceProviderIntegrationsModel.findByIdAndUpdate(serviceProviderIntegrationId,{...req.body},{new:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CREATE_SERVICE_PROVIDERS_INTEGRATION_UPDATE,
    })
})
exports.updateServiceProvidersIntegrationStatus = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationId} = req.params
    const {status} = req.body
    if(status === 'delete'){
        await serviceProviderIntegrationsModel.findByIdAndUpdate(serviceProviderIntegrationId,{status:"deleted"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDERS_INTEGRATION_STATUS_DELETE,
        })
    }
    else if(status === 'active'){
        await serviceProviderIntegrationsModel.findByIdAndUpdate(serviceProviderIntegrationId,{status:"active"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDERS_INTEGRATION_STATUS_ACTIVE,
        })
    }
    else if(status === 'offline'){
        await serviceProviderIntegrationsModel.findByIdAndUpdate(serviceProviderIntegrationId,{status:"offline"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_SERVICE_PROVIDERS_INTEGRATION_STATUS_OFFLINE,
        })
    }

})

exports.createServiceProviderServices = asyncWrapper(async(req,res)=>{
    const addServiceProviderService = await serviceProviderServicesModel.create({...req.body,serviceProvider:req.body.serviceProviderShortName,status:"active"})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ADD_FIELD_MAPPINGS,
    })
})

exports.validateServiceProviderStatus = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderServiceId} = req.params
    const fieldMappingDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId)
    if(!fieldMappingDetails){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_FIELD_MAPPING_NOT_EXIST,
        })
    }
    if(fieldMappingDetails.status === "deleted"){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_FIELD_MAPPING_CHECK_STATUS,
        })
    }
    else{
        next()
    }
})
exports.validateServiceProviderServiceExist = asyncWrapper(async(req,res,next)=>{
    const {serviceProviderServiceId} = req.params
    const fieldMappingDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId)
    if(!fieldMappingDetails){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_FIELD_MAPPING_NOT_EXIST,
        })
    }
    else{
        next()
    }
})

exports.updateServiceProviderServices = asyncWrapper(async(req,res)=>{
    const {serviceProviderServiceId} = req.params
    const updateServiceProviderServices = await serviceProviderServicesModel.findByIdAndUpdate(serviceProviderServiceId,{...req.body},{new:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS,
    })
})

exports.getIndividualServiceProviderServiceDetails= asyncWrapper(async(req,res)=>{
    const {serviceProviderServiceId} = req.params
    const serviceProviderServiceDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_FIELD_MAPPING_DETAILS,
        data:serviceProviderServiceDetails
    })
})

exports.deleteServiceProviderService = asyncWrapper(async(req,res)=>{
    const {status} = req.body
    if(status === 'delete'){
        const fieldMappingDetails = await serviceProviderServicesModel.findByIdAndUpdate(req.params.serviceProviderServiceId,{status:"deleted"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS_STATUS_DELETE,
        })
    }
    else if(status === 'active'){
        const fieldMappingDetails = await serviceProviderServicesModel.findByIdAndUpdate(req.params.serviceProviderServiceId,{status:"active"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS_STATUS_ACTIVE,
        })
    }
    
})

exports.getAllServiceProversIntegrationDefaultFiledMappingServices = asyncWrapper(async(req,res)=>{
    const fieldMappingDefaultServices = await serviceProvidersIntegrationWithServicesModel.find({})
                                                .populate({
                                                    path:"serviceProviderIntegrationId",
                                                    populate:[
                                                        {path:"fromServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo"},
                                                        {path:"toServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo"}
                                                    ]
                                                })

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_DEFAULT_FIELD_MAPPINGS_SERVICE,
        data:fieldMappingDefaultServices
    })
})

exports.validateServiceProvidersIntegrationService = asyncWrapper(async(req,res,next)=>{
    const {from, to, dataPoints, dataPointURL, serviceMethod, dataPointPriority, serviceType} = req.body
    const validateFieldMappingDefaultServices = await serviceProvidersIntegrationWithServicesModel.find({from:from, to:to, serviceMethod:serviceMethod, serviceType: serviceType})
    if(validateFieldMappingDefaultServices.length > 0){
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_DEFAULT_FIELD_MAPPINGS_SERVICE_EXIST,
        })
    }
    else{
        next()
    }
})

exports.createServiceProvidersIntegrationService = asyncWrapper(async(req,res)=>{
    const {from, to, dataPoints, dataPointURL, serviceMethod, dataPointPriority, serviceProviderIntegrationId} = req.body
    await serviceProvidersIntegrationWithServicesModel.create({...req.body})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ADD_DEFAULT_FIELD_MAPPINGS_SERVICE,
    })
})

exports.updatecreateServiceProvidersIntegrationService = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationServiceId} = req.params
    await serviceProvidersIntegrationWithServicesModel.findByIdAndUpdate(serviceProviderIntegrationServiceId,{...req.body},{new:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_DEFAULT_FIELD_MAPPINGS_SERVICE,
    })
})

exports.getIndividualServiceProvidersIntegrationService = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationServiceId} = req.params
    const defaultFieldMappingServiceDetails = await serviceProvidersIntegrationWithServicesModel.findById(serviceProviderIntegrationServiceId)
                                                     .populate({
                                                         path:"serviceProviderIntegrationId",
                                                         populate:[
                                                             {path:"fromServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo"},
                                                             {path:"toServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo"}
                                                         ]
                                                     })
    let defaultSourceFieldMappingKeys = await defaultSatusMappingKeys(defaultFieldMappingServiceDetails.from)
    let defaultDestinationFieldMappingkeys = await getDefaultDestinationStatusMappingkeys(defaultFieldMappingServiceDetails.to, defaultFieldMappingServiceDetails.serviceMethod)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_DEFAULT_FIELD_MAPPINGS_SERVICE,
        data:{defaultFieldMappingServiceDetails,defaultSourceFieldMappingKeys, defaultDestinationFieldMappingkeys}
    })
})


exports.getAllServiceProviderIntegrations = asyncWrapper(async(req,res)=>{
   
    const serviceProviderIntegrationsDetails = await serviceProviderIntegrationsModel.aggregate(
        [
            {
                $addFields: {
                    serviceProviderIntegrationDetails: "$$ROOT"
                }
            },
            {
                $lookup: {
                    from: "serviceproviderlists",
                    localField: "fromServiceProviderListId",
                    foreignField: "_id",
                    as: "fromServiceProviderDetails"
                }
            },
            {
                $unwind: {
                    path: "$fromServiceProviderDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "serviceproviderlists",
                    localField: "toServiceProviderListId",
                    foreignField: "_id",
                    as: "toServiceProviderDetails"
                }
            },
            {
                $unwind: {
                    path: "$toServiceProviderDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "serviceprovidersintegrationwithservices",
                    localField: "_id",
                    foreignField: "serviceProviderIntegrationId",
                    as: "integrationMappings"
                }
            },
            {
                $addFields: {
                    integrationMappingsCount: { $size: "$integrationMappings" },
                    fromServiceProviderListId:"$fromServiceProviderDetails",
                    toServiceProviderListId:"$toServiceProviderDetails"
                }
            },
            {
                $project: {
                    // "serviceProviderIntegrationDetails": 0,
                    fromServiceProviderListId: 1,
                    toServiceProviderListId: 1,
                    services: 1,
                    filterServices: 1,
                    mapping: 1,
                    from:1,
                    to:1,
                    status:1,
                    createdAt:1,
                    updateAt:1,
                    serviceProviderIntegrationId:1,
                    fromServiceProviderListId: {
                        serviceProviderFullName: 1,
                        serviceProviderShortName: 1,
                        serviceProviderListId: 1,
                        markedLogo: 1,
                    },
                    toServiceProviderListId: {
                        serviceProviderFullName: 1,
                        serviceProviderShortName: 1,
                        serviceProviderListId: 1,
                        markedLogo: 1,
                    },
                    integrationMappingsCount: 1
                }
            }
        ]
        );
    

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ALL_SERVICE_PROVIDER_INTEGRATIONS_DETAILS,
        data:serviceProviderIntegrationsDetails
    })
})

exports.getIndividualServiceProviderIntegrationsDetails = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationId} = req.params
    const individualServiceProviderIntegrationsDetails = await serviceProvidersIntegrationWithServicesModel.find({serviceProviderIntegrationId:serviceProviderIntegrationId})
                                                                .populate({
                                                                    path:"serviceProviderIntegrationId",
                                                                    populate:[
                                                                        {path:"fromServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo "},
                                                                        {path:"toServiceProviderListId", select:"serviceProviderFullName serviceProviderShortName serviceProviderListId markedLogo"}
                                                                    ]
                                                                })

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_SERVICE_PROVIDER_INTEGRATIONS_SERVICES_DETAILS,
        data:individualServiceProviderIntegrationsDetails
    })
})

exports.getAllServiceProviderServicesToCreateIntegration = asyncWrapper(async(req,res)=>{
    const {serviceProviderIntegrationId} = req.params
    
    const getServiceProvidersServices = await serviceProviderIntegrationsModel.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(serviceProviderIntegrationId)
            }
        },
        {
            $lookup:{
                from:'serviceproviderservices',
                foreignField:'serviceProviderListId',
                localField:'fromServiceProviderListId',
                as:'fromServiceProviderServices'
            }
        },
        {
            $lookup:{
                from:'serviceproviderservices',
                foreignField:'serviceProviderListId',
                localField:'toServiceProviderListId',
                as:'toServiceProviderServices'
            }
        },
        {
            $lookup:{
                from:'serviceproviderlists',
                foreignField:'_id',
                localField:'fromServiceProviderListId',
                as:'fromServiceProviderServiceList'
            }
        },
        {
            $lookup:{
                from:'serviceproviderlists',
                foreignField:'_id',
                localField:'toServiceProviderListId',
                as:'toServiceProviderServiceList'
            }
        },
        {
            $addFields: {
                source:{
                    markedLogo: {
                        $arrayElemAt: ['$fromServiceProviderServiceList.markedLogo', 0]
                    },
                    serviceProviderFullName:{
                        $arrayElemAt:['$fromServiceProviderServiceList.serviceProviderFullName',0]
                    },
                    serviceProviderShortName:{
                        $arrayElemAt:['$fromServiceProviderServiceList.serviceProviderShortName',0]
                    }

                },
                destination:{
                    markedLogo: {
                        $arrayElemAt: ['$toServiceProviderServiceList.markedLogo', 0]
                    },
                    serviceProviderFullName:{
                        $arrayElemAt:['$toServiceProviderServiceList.serviceProviderFullName',0]
                    },
                    serviceProviderShortName:{
                        $arrayElemAt:['$toServiceProviderServiceList.serviceProviderShortName',0]
                    }
                }                
            }
        },
        {
            $unset: [
                'fromServiceProviderServiceList', 
                'toServiceProviderServiceList'
            ]
        },
        {
            $project:{
                serviceProvidersServices: '$$ROOT',             
            }
        }
    ])

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_LIST_OF_SERVICE_PROVIDER_SERVICES_TO_CREATE_INTEGRATION,
        data:getServiceProvidersServices[0]
    })
})