const mongoose = require('mongoose')

const configurationModelSchema = new mongoose.Schema({
    config_integration_type:{
        type:String,
        enum:['corrigo-pro','service-channel','quick-books'],
        default:""
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration",
        default:null
    },
    integrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrations",
        default:null
    },
    credentials: {
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    status:{
        type:String,
        enum:["pending",'verified','rejected','deleted'],
        default:"pending"
    },
},{timestamps:true});

module.exports = mongoose.model('configurations',configurationModelSchema)