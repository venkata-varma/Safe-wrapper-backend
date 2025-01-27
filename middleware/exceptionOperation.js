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
    await integrationsExceptionsModel.create({
        integrationsMasterId: integrationObject?.integrationsMasterId,
        accountId: integrationObject.accountId,
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