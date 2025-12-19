const { default: mongoose } = require("mongoose")
const squarePOSExceptionModel = require('../models/squarePOSExceptionModel');

exports.squarePOSExceptionLogs = async (exceptionObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, exceptionApiService, transactionId, integrationsCronId) => {

    //  console.log('exceptionObject:===', exceptionObject)
    const validObjectId = (id) => {
        return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
    };
    await squarePOSExceptionModel.create({

        accountId: validObjectId(exceptionObject?.accountId),
        userId: validObjectId(exceptionObject?.userId),
        networkCode: status,
        exceptionMessage: exceptionMessage,
        exceptionTitle: exceptionTitle,
        exceptionRequestObject: exceptionErrorObject || {},
        exceptionApiService: exceptionApiService,
        cardConnectTransactionId: transactionId || "",
        cardConnectIntegrationsCronId: validObjectId(integrationsCronId)
    })

}


