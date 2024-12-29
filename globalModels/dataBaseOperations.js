const { GlobalServiceModelForDynamicCollection } = require("../createDynamicCollection")

exports.addRecordIntoDataBase = async(integrationDetails, serviceObject, dataBaseName, responseObject,status) => {
    
    let dataMappingPathKey = serviceObject?.dataMappingPath[0]
    let refIdKey = serviceObject?.primaryKeyColumn[0]
    let reqOBJ = {
        accountId: integrationDetails.accountId,
        integrationsCronId: integrationDetails.integrationsMasterId,
        integrationsMasterId: integrationDetails.integrationsMasterId,
        refId: responseObject[`${refIdKey}`],
        refWorkOrderStatus: responseObject.Status,
        responseObject: JSON.stringify(responseObject),
        status: status,
        priority: "high"
    }
   
    GlobalServiceModelForDynamicCollection(`${dataBaseName}`,
        reqOBJ
    )
}