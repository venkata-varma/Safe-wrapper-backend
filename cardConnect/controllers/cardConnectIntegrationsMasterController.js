const asyncWrapper = require('../../middleware/asyncWrapper');
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsMModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const customConstants = require('../../config/constants.json')


exports.validatecreateCardConnectIntegrationsMaster = asyncWrapper(async (req, res, next) => {
    let payload = req.body;
    if (!payload.title) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_TITLE
        });
    }

    if (!payload.accountId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_ACCOUNTID
        });
    }

    if (!payload.userId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_USERID
        });
    }
    next()
})




/**
 * 
 * 
 */
exports.createCardConnectIntegrationsMaster = asyncWrapper(async (req, res) => {
    const cardConnectIntegrationsMaster = await cardconnectIntegrationsMastersModel.create({
        ...req.body,
        createdBy: req.user._id,
        updatedBY: req.user._id,
        stepCount: 1
    });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CREATED_CARD_CONNECT_INTEGRATIONS_MASTER,
        data: {
            cardConnectIntegrationsMaster
        }
    })
})


/**
 * 
 */
exports.validateintegrationsMasterExist = asyncWrapper(async (req, res, next) => {
  const { cardConnectintegrationsMasterId } = req.body;

  console.log('cardConnectintegrationsMasterId:===', cardConnectintegrationsMasterId)
  const integrationMasterDetails = await cardconnectIntegrationsMastersModel.findById(cardConnectintegrationsMasterId)
  if (!integrationMasterDetails) {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
    });
  }
  else {
    next()
  }
});



/**
 * 
 * 
 */
exports.validateintegrationsMasterExist = asyncWrapper(async (req, res, next) => {
  const { cardConnectintegrationsMasterId } = req.body;

  
});
