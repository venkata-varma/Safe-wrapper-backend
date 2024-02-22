const mongoose = require('mongoose')

const IntegrationsSchema = new mongoose.Schema({
    name:{
        type:String
    },
    description:{
        type:String
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration"
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    status:{
        type:String,
        enum:["active","deleted"],
        default:"active"
    }
},{timestamps:true});

module.exports = mongoose.model('integrations',IntegrationsSchema)