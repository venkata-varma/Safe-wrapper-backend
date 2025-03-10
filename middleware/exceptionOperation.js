const { default: mongoose } = require("mongoose")
const integrationsExceptionsModel = require("../models/integrationsExceptionsModel")


exports.exceptionLogs = async (integrationObject, status, exceptionMessage, exceptionTitle, exceptionErrorObject, integrationsApiServices, sourceWOId, sourceWONumber, runnigWorkOrderId, destinationWONumber) => {
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
    console.log('integrationObject:===', integrationObject)
    const validObjectId = (id) => {
        return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
    };
    await integrationsExceptionsModel.create({
        integrationsMasterId: validObjectId(integrationObject.integrationsMasterId),
        accountId: validObjectId(integrationObject.accountId),
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