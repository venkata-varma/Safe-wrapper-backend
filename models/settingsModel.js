const mongoose = require('mongoose')

const settingsDetailSchema = new mongoose.Schema({
    integrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrations",
        require:[true,"integrationId required"],
        default:null
    },
    periodType:{
        type:String,
        enum:["hours","days","weeks","months","years"]
    },
    periodSettings:{
        type:mongoose.Schema.Types.Mixed
    }
},{timestamps:true});

module.exports = mongoose.model('settings',settingsDetailSchema)