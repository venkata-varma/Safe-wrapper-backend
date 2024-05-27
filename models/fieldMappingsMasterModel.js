const mongoose = require("mongoose");

const fieldMappingsMasterSchema = new mongoose.Schema({
    fieldMappingMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    serviceProvider: {
        type: String,
        required: [true, "Service provider is required"],
        enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM"],
        default: ""
    },  
    serviceMethod:{
        type:String,
        enum:["create","update","get","delete"],
        default:""
    },
    serviceType: {
        type: String,
        required: [true, "Service type is required"],
        default: ""
    },
    dataPointURL: {
        type: String,
        required: [true, "Data point url is required"],
        default: ""
    },
    dataPoint: {
        type: Array,
        required: [true, "Elements are required"],
        default: ""
    },
    dataPointPriority: {
        type: String,
        enum: ['Primary', 'Secondary', 'Optional'],
        default: "Primary"
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: "active"

    },

}, {
    timestamps: true
})

const fieldMappingsMasterModel = mongoose.model('fieldMappingsMaster', fieldMappingsMasterSchema)
module.exports = fieldMappingsMasterModel