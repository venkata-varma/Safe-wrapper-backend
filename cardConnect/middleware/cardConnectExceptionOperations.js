const { default: mongoose } = require("mongoose")
const cardConnectExceptionsModel = require('../models/cardConnectExceptionsModel')

exports.cardConnectExceptionLogs = async (exceptionObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, exceptionApiService) => {
   
  //  console.log('exceptionObject:===', exceptionObject)
    const validObjectId = (id) => {
        return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
    };
    await cardConnectExceptionsModel.create({
        cardConnectIntegrationsMasterId:validObjectId(exceptionObject?.cardConnectIntegrationsMasterId),
        accountId: validObjectId(exceptionObject?.accountId),
        networkCode: status,
        exceptionMessage: exceptionMessage,
        exceptionTitle: exceptionTitle,
        exceptionRequestObject: exceptionErrorObject || {},
        exceptionApiService: exceptionApiService
    })

}