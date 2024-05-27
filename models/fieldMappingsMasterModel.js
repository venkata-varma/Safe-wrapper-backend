const mongoose = require("mongoose");

const fieldMappingsMasterSchema = new mongoose.Schema({
    fieldMappingMasterId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    serviceProvider: {
        type: String,
        required: [true, "Service provider is required"],
        enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM"]
    },
    serviceType: {
        type: String,
        required: [true, "Service type is required"],
    },
    dataPointURL: {
        type: String,
        required: [true, "Data point url is required"]
    },
    dataPoint: {
        type: Array,
        required: [true, "Elements are required"]
    },
    dataPointPriority: {
        type: String,
        enum: ['Primary', 'Secondary', 'Optional']
    },
    status: {
        type: String,
        enum: ['active', 'deleted']

    },

}, {
    timestamps: true
})

const fieldMappingsMasterModel = mongoose.model('fieldMappingsMaster', fieldMappingsMasterSchema)
module.exports = fieldMappingsMasterModel