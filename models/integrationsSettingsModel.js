const mongoose = require('mongoose')

const integrationsSettingsSchema = new mongoose.Schema({
    integrationsSettingId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    integrationsMasterId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrationsMaster",
        require:[true,"integrationId required"],
        default:null
    },
    periodType:{
        type:String,
        enum:["hours","days","weeks","months","years"],
        default:""
    },
    periodSettings:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    }
},{timestamps:true});

integrationsSettingsSchema.pre('save', function(next) {
    this.integrationsSettingId = this._id;
    next();
});


module.exports = mongoose.model('integrationsSettings',integrationsSettingsSchema)