const mongoose = require('mongoose');
const serviceProviderListSchema = new mongoose.Schema({
    serviceProviderListId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },
    logo: {
        type: String,
         required:[true, 'Logo is mandatory'],
         default:""
    },
    markedLogo: {
        type: String,
        required:[true, 'Logo is mandatory'],
        default:""
    },

    serviceProviders: {
        type: String,
        enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
        default : ""
    },
    testCredentials: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, "Credentials are mandatory"],
        default:{}
    },
    defaultScheduler: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: "active"
    }

}, {
    timestamps: true
});
serviceProviderListSchema.pre('save',(next)=>{
    this.serviceProviderListId=this._id
    next()
})


module.exports = mongoose.model('serviceProviderList', serviceProviderListSchema);