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