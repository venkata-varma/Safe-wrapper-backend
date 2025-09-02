const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')
const cardconnectIntegrationsMasterModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')
const cardConnectAPIUrlFlowModel = require('../models/cardConnectAPIUrlFlowsModel')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const cardConnectTransactionLifeCycleModel = require('../models/cardConnectTransactionLifeCycle')
const cardConnectExceptionsModel = require('../models/cardConnectExceptionsModel')
const customConstants = require('../../config/constants.json');
const { statusMappings, getProcessedDisplayPoints, transactionTypeMappings } = require('../utils/helpers');


exports.getSingleIntegrationView = asyncWrapper(async (req, res) => {
    const { cardConnectIntegrationsMasterId } = req.params

    const [integrationsMasterDetails, exceptions, getAllTransactions] = await Promise.all([

        cardconnectIntegrationsMasterModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(cardConnectIntegrationsMasterId)
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationscredentials",
                    localField: "_id",
                    foreignField: "cardConnectIntegrationsMasterId",
                    as: "cardconnectintegrationscredentials"
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationsapiurlflows",
                    localField: "_id",
                    foreignField: "cardConnectIntegrationsMasterId",
                    as: "cardconnectintegrationsapiurlflows"
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationssettings",
                    localField: "_id",
                    foreignField: "cardConnectIntegrationsMasterId",
                    as: "cardconnectintegrationssettings"
                }
            },
            { $unwind: "$cardconnectintegrationscredentials" },
            { $unwind: "$cardconnectintegrationsapiurlflows" },
            { $unwind: "$cardconnectintegrationssettings" }

        ]),
        cardConnectExceptionsModel.find({ cardConnectIntegrationsMasterId }),
        cardConnectTransactionsModel.find({ cardConnectIntegrationsMasterId })




    ])

    let getStatusMappings = await statusMappings(getAllTransactions, integrationsMasterDetails[0].cardconnectintegrationssettings);

    let processRequiredDisplayPoints = await getProcessedDisplayPoints(getAllTransactions, integrationsMasterDetails[0].cardconnectintegrationssettings.requiredDatapoints)

    console.log("processRequiredDisplayPoints===", processRequiredDisplayPoints.length)

    let getTransactionTypeMappings = await transactionTypeMappings(processRequiredDisplayPoints, integrationsMasterDetails[0].cardconnectintegrationssettings.transactionTypeKeys);



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SINGLE_INTEGRATION_VIEW_DETAILS,
            data: {
                integrationDetails: integrationsMasterDetails[0],
                exceptions,
                getStatusMappings,
                getTransactionTypeMappings,
                processRequiredDisplayPoints
            },
        });





})
