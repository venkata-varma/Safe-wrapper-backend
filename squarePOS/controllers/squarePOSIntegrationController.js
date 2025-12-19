const axios = require('axios');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json')

/**
 * Helper to validate credentials against the Square API
 */
exports.validateSquarePOSCredentails = asyncWrapper(async (payload) => {
    const { accessToken } = payload.credentials;
    console.log('accessToken:', accessToken);
    const response = await axios.get('https://connect.squareupsandbox.com/v2/merchants', {
        headers: {
            'Square-Version': '2024-12-18',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const merchants = response?.data?.merchant;
    console.log('merchants:', merchants);

    if (!merchants || merchants.length === 0) {
        return {
            status: customConstants.messages.MESSAGE_FAIL,
            statusCode: customConstants.statusCodes.UNAUTHORIZED,
            message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE
        };
    }
    return {
        status: customConstants.messages.MESSAGE_SUCCESS,
        statusCode: customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS,
        data: merchants[0]

    };

})

/**
 * Front-end screen exists for giving values to settings for card-connect integration.
 */
exports.createSquarePOSIntegrationMasterSettings = asyncWrapper(async (req, res) => {

    let createCardConnectIntegrationsSettings = await cardConnectIntegrationsSettingsModel.create({
        ...req.body,
        createdBy: req.user._id,
        transactionStatusKeys: cardConnectPredefinedKeys.transactionStatusKeys,
        transactionTypeKeys: cardConnectPredefinedKeys.transactionTypeKeys,
        requiredDatapoints: cardConnectPredefinedKeys.requiredDatapoints,
        customerObjectKeys: cardConnectPredefinedKeys.customerObjectKeys   //Not useful as of now
    });


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
            data: {
                cardConnectIntegrationsSettings: createCardConnectIntegrationsSettings
            },
        });

})

