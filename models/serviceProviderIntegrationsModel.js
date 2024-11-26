const mongoose = require('mongoose')

const serviceProviderIntegrations = new mongoose.Schema({
    serviceProviderIntegrationId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    fromServiceProviderListId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'serviceProviderList',
        default:null
    },
    toServiceProviderListId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'serviceProviderList',
        default:null
    },
    from :{
        type : String,
        default : ""
    },
    to : {
        type : String,
        default : ""
    },
    services : {
        type : Array,
        default : []
    },
    filterServices:{
        type : Array,
        default : []
    },
    mapping : {
        type : Object,
        default : {}
    },
    status:{
        type:String,
        default:"active"
    }
},{timestamps:true});

serviceProviderIntegrations.pre('save',function(next){
    this.serviceProviderIntegrationId = this._id
    next()
})

module.exports = mongoose.model('serviceproviderintegrations',serviceProviderIntegrations);