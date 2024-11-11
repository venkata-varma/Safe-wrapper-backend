const mongoose = require('mongoose')

const serviceProviderIntegrations = mongoose.Schema({
    serviceProviderIntegrationId:{
        type:mongoose.Schema.Types.ObjectId,
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
    }
},{timestamps:true});

serviceProviderIntegrations.pre('save',function(next){
    this.serviceProviderIntegrationId = this._id
})

module.exports = mongoose.model('serviceproviderIntegrations',serviceProviderIntegrations);