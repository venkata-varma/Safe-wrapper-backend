const asyncWrapper = require("../middleware/asyncWrapper");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");


const fieldMappingsMasterModel = require("../models/fieldMappingsMasterModel");

exports.get_corrigo_pro_latest_workOrders = asyncWrapper(async (req, res) => {
    const { integrationServiceProviderId } = req.params;
    const configguration_credentials = await integrationsMasterServiceProvidersModel.findById(integrationServiceProviderId).lean();
})

//---------------
exports.insertFieldMappingMasterManually = async () => {
    let doc = {
        serviceProvider: 'CPD',
        serviceType: 'PUT work-order-note',
        dataPoint: [
"InternalNote",
            "PerformedBy.Name", "PerformedBy.Phone", "WorkOrderId", "MessageId"
        ]

        ,
        status: 'active',
        dataPointPriority: 'Primary',
        dataPointURL: "https://am-api.corrigopro.com/Direct/api/workOrder/note"


    }

    let fieldMappingsMaster = await fieldMappingsMasterModel.create(doc);
    console.log(fieldMappingsMaster, "fieldMasteruseconsole")
}