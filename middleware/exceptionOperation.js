const { default: mongoose } = require("mongoose")
const exceptionsModel = require('../models/webhookExceptionsModel')

exports.exceptionLogs = async (exceptionObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, exceptionApiService) => {
   
    console.log('exceptionObject:===', exceptionObject)
    const validObjectId = (id) => {
        return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
    };
    await exceptionsModel.create({
        accountId: validObjectId(exceptionObject.accountId),
        networkCode: status,
        exceptionMessage: exceptionMessage,
        exceptionTitle: exceptionTitle,
        exceptionRequestObject: exceptionErrorObject || {},
        exceptionApiService: exceptionApiService
    })

}