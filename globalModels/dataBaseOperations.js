const { GlobalServiceModelForDynamicCollection } = require("../createDynamicCollection")

exports.addRecordIntoDataBase = async (integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, responseObject, updatingDataBaseName, status, operationType, sourceReferenceId) => {

    // let dataMappingPathKey = serviceObject?.dataMappingPath[0]
    let refIdKey = primaryKeyColumn
    // console.log("refIdKey")
    let reqOBJ = {
        accountId: integrationDetails.accountId,
        integrationsCronId: integrationDetails.integrationsMasterId,
        integrationsMasterId: integrationDetails.integrationsMasterId,
        referenceId:responseObject[`${refIdKey}`].toString(),
        sourceReferenceId: operationType === "source" ? responseObject[`${refIdKey}`].toString() : sourceReferenceId,
        destinationReferenceId: operationType === "destination" ? responseObject[`${refIdKey}`] : "",
        referenceStatus: responseObject.Status,
        responseObject: JSON.stringify(responseObject),
        status: status,
        priority: "high"
    }
    
    GlobalServiceModelForDynamicCollection(`${insertingDataBaseName}`,
        reqOBJ,operationType, updatingDataBaseName, integrationDetails
    )
}