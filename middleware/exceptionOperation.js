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
   if(![undefined].includes(integrationObject?.integrationsMasterId) && ![undefined].includes(integrationObject?.accountId) )
    await integrationsExceptionsModel.create({
        integrationsMasterId: integrationObject?.integrationsMasterId || null,
        accountId: integrationObject?.accountId || null,
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