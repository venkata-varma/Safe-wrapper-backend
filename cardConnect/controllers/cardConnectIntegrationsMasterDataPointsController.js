const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')

const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')

const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const cardConnectTransactionLifeCycleModel = require('../models/cardConnectTransactionLifeCycle')
const cardConnectExceptionsModel = require('../models/cardConnectExceptionsModel')
const customConstants = require('../../config/constants.json');
const { statusMappings, getProcessedDisplayPoints, transactionTypeMappings } = require('../utils/helpers');
const accountsModel = require('../../models/accountsModel');


exports.getSingleIntegrationView = asyncWrapper(async (req, res) => {
    const { accountId } = req.params

    const [integrationsMasterDetails, exceptions, getAllTransactions] = await Promise.all([

        accountsModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationscredentials",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "cardconnectintegrationscredentials"
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationsapiurlflows",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "cardconnectintegrationsapiurlflows"
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationssettings",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "cardconnectintegrationssettings"
                }
            },
            { $unwind: "$cardconnectintegrationscredentials" },
            { $unwind: "$cardconnectintegrationsapiurlflows" },
            { $unwind: "$cardconnectintegrationssettings" }

        ]),
        cardConnectExceptionsModel.find({ accountId }),
        cardConnectTransactionsModel.find({ accountId })




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



/**
 * 
 * 
 */

exports.getCardConnectPayloadHeaders = asyncWrapper(async (req, res) => {

    const { accountId } = req.params;

    const [cardConnectIntegrationsSettings, cardConnectIntegrationsCredentials, customerDetails] = await Promise.all([
        cardConnectIntegrationsSettingsModel.findOne({ accountId }).lean(),
        cardconnectIntegrationsCredentialsModel.findOne({ accountId }),
        cardConnectTransactionsModel.aggregate([
            { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
            {
                $facet: {
                    customers: [
                        {
                            $group: {
                                _id: "$customerDetails.cardNumber",
                                cardBrand: { $first: "$customerDetails.cardBrand" },
                                cardType: { $first: "$customerDetails.cardType" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                customerCardNumber: "$_id",
                                cardBrand: 1,
                                cardType: 1
                            }
                        }
                    ],
                    batches: [
                        {
                            $group: {
                                _id: "$responseObject.batchid"
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                batchId: "$_id"
                            }
                        }
                    ]
                }
            }
        ])


    ]);


    let transactionStatusKeys = cardConnectIntegrationsSettings?.transactionStatusKeys;
    let transactionTypeKeys = cardConnectIntegrationsSettings?.transactionTypeKeys;


    let allMerchantIds = cardConnectIntegrationsCredentials?.primaryKeyValues?.merchantId;





    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SINGLE_INTEGRATION_VIEW_DETAILS,
            data: {
                transactionStatusKeys,
                transactionTypeKeys,
                allMerchantIds,
                customerDetails: customerDetails[0].customers,
                batches: customerDetails[0].batches

            },
        });

})