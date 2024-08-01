const mongoose = require('mongoose')


const accountSettingsSchema = mongoose.Schema({
    accountSettingId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        default: null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        default: null
    },
    noOfIntegrations: {
        type: Number,
        default: 2
    },
    menus: {
        type: Object,
        default: {
            "dashboard": true,
            "integrations": true,
            "fieldsmapping": true,
            "insights": true,
            "exceptions": true,
            "users": true,
            "settings": true,
            "createIntegrations": true
        }
    },
    serviceProviders: {
        type: Array,
        default: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF","CYS"],
    },
    dataPoints: {
        type: Array,
        default:[{
            "interationDetails": {
                "source": true,
                "destination": true,
                "activityLog": true,
                "fieldMappings": true,
                "exceptions": true
            }
        }]
    },
    timeZone:{
        type:String,
        default:"IST"
    }

}, { timestamps: true });

accountSettingsSchema.pre('save', function (next) {
    this.accountSettingId = this._id;
    next()
});

module.exports = mongoose.model('accountsettings', accountSettingsSchema)