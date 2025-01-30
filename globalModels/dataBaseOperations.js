const { GlobalServiceModelForDynamicCollection } = require("../createDynamicCollection")

exports.addRecordIntoDataBase = async (integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, responseObject, updatingDataBaseName, status, operationType, sourceReferenceId) => {
    // console.log('serviceObject:===',serviceObject?.destinationReferenceId)
    let reqOBJ = {
        accountId: integrationDetails.accountId,
        integrationsCronId: integrationDetails.integrationsCronId,
        integrationsMasterId: integrationDetails.integrationsMasterId,
        referenceId:serviceObject?.serviceMethod === "post" ||  operationType === "source" ? responseObject[`${primaryKeyColumn}`].toString(): responseObject?.destinationReferenceId.toString(),
        sourceReferenceId: operationType === "source" ? responseObject[`${primaryKeyColumn}`].toString() : sourceReferenceId.toString(),
        destinationReferenceId: operationType === "destination" ? responseObject[`${primaryKeyColumn}`].toString() : "",
        referenceStatus: responseObject.Status,
        responseObject: JSON.stringify(responseObject),
        status: status,
        priority: "high",
        createdAt:new Date(),
        updatedAt: new Date()
    }
    
    GlobalServiceModelForDynamicCollection(`${insertingDataBaseName}`,
        reqOBJ,operationType, updatingDataBaseName, integrationDetails
    )
}