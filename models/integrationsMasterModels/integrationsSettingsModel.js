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
        enum:["each second","once each minute","once each hour","once each day","once each month"],
        default:""
    },
    currentStatus : {
      type : String,
      enum : ['start','stop'],
      default : "stop"
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
      statusFieldMappingKeys:{
        type:Object,
        default:{}
      },
    dataDumpFrom:{
      type:Date,
      default : new Date(new Date().setDate(new Date().getDate()-3)) //Three days prior to the current date is the default date.
    }
},{timestamps:true});

integrationsSettingsSchema.pre('save', function(next) {
    this.integrationsSettingId = this._id;
    next();
});


module.exports = mongoose.model('integrationsSettings',integrationsSettingsSchema)