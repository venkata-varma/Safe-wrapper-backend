const mongoose = require('mongoose')

const integrationsSettingsSchema = new mongoose.Schema({
    integrationsSettingId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    integrationsMasterId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrationsMaster",
        required:[true,"integrationId required"],
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        default: null,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null,
      },
    periodType:{
        type:String,
        enum:["hours","days","weeks","months","years"],
        default:""
    },
    periodSettings:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: [true, "Created by is required."],
        default: null,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null,
      },
},{timestamps:true});

integrationsSettingsSchema.pre('save', function(next) {
    this.integrationsSettingId = this._id;
    next();
});


module.exports = mongoose.model('integrationsSettings',integrationsSettingsSchema)