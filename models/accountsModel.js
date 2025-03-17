const mongoose = require('mongoose')


const accountsSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },

    noOfIntegrations: {
        type: Number,
        default: 2
    },
    accountName:{
        type:String,
        required:[true, 'Account name is required.'],
        default:""
    },
    accountType: {
        type: String,
        required: [true, "Account type is required"],
        enum: ['customer', 'super-admin'],
        default:"customer"
    },
    companyName:{
        type:String,
        required:[true, 'Company name is required.'],
        default:""
    },
    logo:{
        type:String,
        default:""
    },
    phone:{
        type:String,
        required:[true, 'Mobile number is required.'],
        minlength: 10,
        maxlength: 15,
        match: /^[0-9]+$/,
        default:"",
        unique:[true, 'Phone must be unique']
    },
    email:{
        type:String,
        required:[true, 'Email is required.'],
        default:"",
        unique:[true, 'Email must be unique']
    },
    password:{
        type:String,
        required:[true, 'Password is required.'],
        default:""
    },
    address:{
        type:String,
        default:""
    },
    city:{
        type:String,
        required:[true, 'city is required.'],
        default:""
    },
    state:{
        type:String,
        required:[true, 'state is required.'],
        default:""
    },
    country:{
        type:String,
        required:[true, 'country is required.'],
        default:""
    },
    pincode:{
        type:String,
        required:[true, 'pincode is required.'],
        default:""
    },
    status:{
        type:String,
        enum:['active','in-progress','deleted', 'blocked'],
        default:"active"
    },
},{timestamps:true});

accountsSchema.pre('save', function(next) {
    this.accountId = this._id;
    next();
});

module.exports = mongoose.model('accounts',accountsSchema)