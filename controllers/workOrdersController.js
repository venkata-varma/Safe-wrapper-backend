const asyncWrapper = require("../middleware/asyncWrapper");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");


const fieldMappingsMasterModel = require("../models/fieldMappingsMasterModel");

exports.get_corrigo_pro_latest_workOrders = asyncWrapper(async (req, res) => {
    const { integrationServiceProviderId } = req.params;
    const configguration_credentials = await integrationsMasterServiceProvidersModel.findById(integrationServiceProviderId).lean();
});