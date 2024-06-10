const mongoose = require('mongoose')

const serviceProvidersMappingAndServicesSchema = mongoose.Schema({
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
    mapping : {
        type : Object,
        default : {}
    }
},{timestamps:true});

module.exports = mongoose.model('serviceProvidersMappingAndServicesSchema',serviceProvidersMappingAndServicesSchema);