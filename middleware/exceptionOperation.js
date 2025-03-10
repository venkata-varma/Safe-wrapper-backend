const { default: mongoose } = require("mongoose")
const integrationsExceptionsModel = require("../models/integrationsExceptionsModel")


exports.exceptionLogs = async(integrationObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, integrationsApiServices, sourceWOId, sourceWONumber, runnigWorkOrderId, destinationWONumber) => {
    /*
    await integrationsExceptionsModel.create({
        integrationsMasterId: integrationObject.integrationsMasterId,
        accountId: integrationObject.accountId,
        CPDWorkOrderId: CPDWorkOrderId,
        CPDWorkOrderNumber: CPDWorkOrderNumber,
        runnigWorkOrderId: runnigWorkOrderId,
        networkCode: status,
        exceptionMessage: exceptionMessage,
        exceptionTitle: exceptionTitle,
        exceptionRequestObject: exceptionErrorObject,
        integrationsApiServices: integrationsApiServices
    })
    */
   console.log('integrationObject:===',integrationObject)
    await integrationsExceptionsModel.create({
        integrationsMasterId: integrationObject.integrationsMasterId === undefined ? null : mongoose.Types.ObjectId(integrationObject.integrationsMasterId),
        accountId: integrationObject.accountId === undefined ? null : mongoose.Types.ObjectId(integrationObject.accountId),
        sourceWOId: sourceWOId,
        sourceWONumber: sourceWONumber,
        destinationWONumber: destinationWONumber,
        runnigWorkOrderId: runnigWorkOrderId,
        networkCode: status,
        exceptionMessage: exceptionMessage,
        exceptionTitle: exceptionTitle,
        exceptionRequestObject: exceptionErrorObject,
        integrationsApiServices: integrationsApiServices
    })
}