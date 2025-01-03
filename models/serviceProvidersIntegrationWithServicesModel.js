const mongoose = require("mongoose");

const serviceProvidersIntegrationWithServices = new mongoose.Schema({
    serviceProvidersIntegrationServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        index:true,
        default: null
    },
    serviceProviderIntegrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "serviceproviderintegrations",
        index:true,
        default: null
    },
    from: {
        type: String,
        // enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM","CYS"]
    },
    to: {
        type: String,
        // enum: ["CPD", "SNOW", "DF", "SC", "TT", "QB", "MGP", "SI", "AM","CYS"]
    },
    name: {
        type: String,
        default: ""
    },
    dataPointUrl:{
        type:String,
        default:""
    },
    sourceIntegrationServices: [{
        dataPointUrl:{
            type:String,
            default:""
        },
        serviceName:{
            type:String,
            default:""
        },
        serviceMethod:{
            type:String,
            default:""
        },
        serviceProviderServiceId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"serviceproviderservices",
            index:true,
            default:null
        },
        category:{
            type:String,
            default:""
        },
        priority:{
            type:Number,
            default:0
        },
        primaryKeyColumn:{
            type:Array,
            default:[]
        },
        dataMappingPath:{
            type:Array,
            default:[]
        }
    }],
    destinationIntegrationServices: [{
        dataPointUrl:{
            type:String,
            default:""
        },
        serviceName:{
            type:String,
            default:""
        },
        serviceMethod:{
            type:String,
            default:""
        },
        serviceProviderServiceId:{
            type: mongoose.Schema.Types.ObjectId,
            index:true,
            ref:"serviceproviderservices",
            default:null
        },
        category:{
            type:String,
            default:""
        },
        priority:{
            type:Number,
            default:0
        },
        primaryKeyColumn:{
            type:Array,
            default:[]
        },
        dataMappingPath:{
            type:Array,
            default:[]
        }
    }],
    sourceDataPoints: {
        type: Array,
        default: []
    },
    destinationDataPoints: {
        type: Array,
        default: []
    },
    mappedDataPoints: {
        type: Object,
        required: [true, "Elements are required"]
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
    serviceMethod:{
        type:String,
        default:""
    },
    serviceName:{
        type:String,
        default:""
    },
    customFieldMapping:{
        type:Object,
        default:{}
    }

}, { timestamps: true });

serviceProvidersIntegrationWithServices.pre('save', function (next) {
    this.serviceProvidersIntegrationServiceId = this._id;
    next();
})


module.exports = mongoose.model('serviceprovidersintegrationwithservices', serviceProvidersIntegrationWithServices);
