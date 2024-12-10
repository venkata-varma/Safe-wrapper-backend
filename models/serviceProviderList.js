const mongoose = require('mongoose');
const serviceProviderListSchema = new mongoose.Schema({
    serviceProviderListId: {
        type: mongoose.Schema.Types.ObjectId,
        index:true,
        default:null
    },
    logo: {
        type: String,
        default:"",
        // required:[true, 'Logo is mandatory'],
         
    },
    markedLogo: {
        type: String,
        default:"",
      //  required:[true, 'Logo is mandatory'],
    },

    serviceProviders: {
        type: String,
        // enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF","CYS"],
        required: [true, "Service Provider is mandatory"],
        default : ""
    },
    serviceProviderShortName:{
        type:String,
        default:""
    },
    serviceProviderFullName:{
        type:String,
        default:""
    },
    testCredentials: {
        type: mongoose.Schema.Types.Mixed,
        // required: [true, "Credentials are mandatory"],
        default:null
    },
    categories:{
        type:Array,
        default:[]
    },
    workOrderStatus:{
        type : Array,
        default : []
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: "active"
    }

}, {
    timestamps: true
});
serviceProviderListSchema.pre('save',function(next){
    this.serviceProviderListId=this._id
    next()
})


module.exports = mongoose.model('serviceProviderList', serviceProviderListSchema);