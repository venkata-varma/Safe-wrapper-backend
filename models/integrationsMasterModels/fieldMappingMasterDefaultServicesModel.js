const mongoose = require("mongoose");

const fieldMappingMasterDefaultServices = new mongoose.Schema({
    fieldMappingMasterDefaultServicesId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    from:{
        type:String,
        enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM"]
    },
    to: {
        type: String,
        enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM"]
    },
    serviceMethod:{
        type:String,
        enum:["create","update","get","delete"],
      // default: ""
    },
    dataPointURL: {
        type: String,
        required: [true, "Data point url is required"]
    },
    dataPoints: {
        type: Object,
        required: [true, "Elements are required"]
    },
    dataPointPriority: {
        type: String,
        enum: ['Primary', 'Secondary', 'Optional'],
        default:"Primary"
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default:"active"
    },

}, {timestamps: true});

fieldMappingMasterDefaultServices.pre('save',function(next){
    this.fieldMappingMasterDefaultServicesId = this._id;
    next();
})


module.exports = mongoose.model('fieldMappingMasterDefaultServices', fieldMappingMasterDefaultServices);
