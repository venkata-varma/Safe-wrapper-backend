const { GlobalServiceModelForDynamicCollection } = require("../createDynamicCollection")

exports.addRecordIntoDataBase = async (integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, responseObject, updatingDataBaseName, status, operationType, sourceReferenceId) => {

    let reqOBJ = {
        accountId: integrationDetails.accountId,
        integrationsCronId: integrationDetails.integrationsMasterId,
        integrationsMasterId: integrationDetails.integrationsMasterId,
        referenceId:responseObject[`${primaryKeyColumn}`].toString(),
        sourceReferenceId: operationType === "source" ? responseObject[`${primaryKeyColumn}`].toString() : sourceReferenceId,
        destinationReferenceId: operationType === "destination" ? responseObject[`${primaryKeyColumn}`] : "",
        referenceStatus: responseObject.Status,
        responseObject: JSON.stringify(responseObject),
        status: status,
        priority: "high"
    }
    
    GlobalServiceModelForDynamicCollection(`${insertingDataBaseName}`,
        reqOBJ,operationType, updatingDataBaseName, integrationDetails
    )
}