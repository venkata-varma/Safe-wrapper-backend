const integrationsExceptionsModel = require("../models/integrationsMasterModels/integrationsExceptionsModel")


exports.exceptionLogs = async(integrationObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, integrationsApiServices, CPDWorkOrderId, CPDWorkOrderNumber, runnigWorkOrderId) => {
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
}