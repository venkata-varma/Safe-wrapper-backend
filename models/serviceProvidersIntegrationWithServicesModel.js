const mongoose = require("mongoose");

const serviceProvidersIntegrationWithServices = new mongoose.Schema({
    serviceProvidersIntegrationServiceId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    serviceProviderIntegrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"serviceproviderintegrations",
        default:null
    },
    from:{
        type:String,
        // enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM","CYS"]
    },
    to: {
        type: String,
        // enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM","CYS"]
    },
    serviceMethod:{
        type:String,
        enum:["post","patch","put","get","delete","head","options"],
      // default: ""
    },
    serviceType:{
        type: String,
        default:"work-order"
    },
    name:{
        type:String,
        default:""
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

serviceProvidersIntegrationWithServices.pre('save',function(next){
    this.serviceProvidersIntegrationServiceId = this._id;
    next();
})


module.exports = mongoose.model('serviceprovidersintegrationwithservices', serviceProvidersIntegrationWithServices);
