const asyncWrapper = require("../../middleware/asyncWrapper");
const fieldMappingsMasterModel = require("../../models/fieldMappingsMasterModel");
const customConstants = require('../config/customConstants.json')




exports.createFieldMappings = asyncWrapper(async(req,res)=>{
    const addFiledMappings = await fieldMappingsMasterModel.create({...req.body,status:"active"})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ADD_FIELD_MAPPINGS,
    })
})

exports.validateFieldMappingExist = asyncWrapper(async(req,res,next)=>{
    const {fieldMappingId} = req.params
    const fieldMappingDetails = await fieldMappingsMasterModel.findById(fieldMappingId)
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

exports.updateFieldMappings = asyncWrapper(async(req,res)=>{
    const {fieldMappingId} = req.params
    const updatedFieldMappingDetails = await fieldMappingsMasterModel.findByIdAndUpdate(fieldMappingId,{...req.body},{new:true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS,
    })
})

exports.getIndividualFieldMappingDetails= asyncWrapper(async(req,res)=>{
    const fieldMappingDetails = await fieldMappingsMasterModel.findById(req.params.fieldMappingId)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_FIELD_MAPPING_DETAILS,
        data:fieldMappingDetails
    })
})

exports.deleteFieldMappings = asyncWrapper(async(req,res)=>{
    const {status} = req.body
    if(status === 'delete'){
        const fieldMappingDetails = await fieldMappingsMasterModel.findByIdAndUpdate(req.params.fieldMappingId,{status:"deleted"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS_STATUS_DELETE,
        })
    }
    else if(status === 'active'){
        const fieldMappingDetails = await fieldMappingsMasterModel.findByIdAndUpdate(req.params.fieldMappingId,{status:"active"},{new:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_FIELD_MAPPINGS_STATUS_ACTIVE,
        })
    }
    
})