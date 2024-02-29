const mongoose = require('mongoose')

const IntegrationsSchema = new mongoose.Schema({
    name:{
        type:String,
        default:""
    },
    description:{
        type:String,
        default:""
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registrations",
        default:null
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        default:null
    },
    status:{
        type:String,
        enum:["active","deleted"],
        default:"active"
    }
},{timestamps:true});

module.exports = mongoose.model('integrations',IntegrationsSchema)