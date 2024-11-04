const mongoose = require("mongoose");

const fieldMappingsMasterSchema = new mongoose.Schema({
    fieldMappingMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    serviceProvider: {
        type: String,
        required: [true, "Service provider is required"],
        // enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM","CYS"],
        default: ""
    },  
    serviceTitle: {
        type: String,
        default:""
    },
    serviceProviderListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "serviceProviderList",
        default:null
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
    dataPoints: {
        type: Array,
        // required: [true, "Elements are required"],
        default: []
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
    requestObject:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    }
}, {
    timestamps: true
})


fieldMappingsMasterSchema.pre('save',function(next){
    this.fieldMappingMasterId = this._id;
    next()
})
const fieldMappingsMasterModel = mongoose.model('fieldMappingsMaster', fieldMappingsMasterSchema)
module.exports = fieldMappingsMasterModel