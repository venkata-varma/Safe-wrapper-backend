const asyncWrapper = require('../../middleware/asyncWrapper');
const cardConnectAPIUrlFlowsModel = require('../models/cardConnectAPIUrlFlowsModel')
const customConstants = require('../../config/constants.json')


/**
 * 
 */
exports.createAPIUrlFlow=asyncWrapper(async(req,res)=>{
let createAPIUrlFlow=await cardConnectAPIUrlFlowsModel.create(req.body);

 return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CREATED_API_URL_FLOW,
        data: {
            createAPIUrlFlow
        }
    })
})