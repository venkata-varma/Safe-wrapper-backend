const integrationsMasterModel = require("../../models/integrationsMasterModel");
const accountSettingsModel=require('../../models/accountSettingsModel')
const asyncWrapper=require('../../middleware/asyncWrapper')
const customConstants=require('../../config/constants.json')


/**
  *Middleware function to check count of active integrations of respective account
  *If count is already 2 ,and Any user visits to add one more, 
     Returns Warning message with exisiting count

*/
exports.validateCreateIntegrationsCount = asyncWrapper(async (req, res, next) => {
    const integrationsCount = await integrationsMasterModel.find({ accountId: req.user.accountId });
  
    const respectiveAccount = await accountSettingsModel.findOne({ accountId: req.user.accountId });
    if (integrationsCount.length >= respectiveAccount.noOfIntegrations) {
      return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
        status: customConstants.messages.MESSAGE_WARNING,
        message: customConstants.messages.MESSAGE_INTEGRATION_COUNT_REACHED
      });
    }
    else {
      next()
    }
  
  })
  
  /*
  Function to create first step of initiating new integration process
  Mandatory-> Title and Description
  Returns newly created IntegrationMaster record 
  */
  exports.createIntegrationMaster = asyncWrapper(async (req, res) => {
  
    console.log("req", req.user)
    const integrationsDetails = await integrationsMasterModel.create({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      accountId: req.user.accountId,
      userId: req.user.userId
    });
  
    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATION_CREATED,
        data: { integrationsDetails },
      });
  
  });