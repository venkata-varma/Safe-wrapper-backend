const mongoose = require('mongoose')


const accountsSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },
    accountName:{
        type:String,
        required:[true, 'Account name is required.'],
        default:""
    },
    accountType: {
        type: String,
        required: [true, "Account type is required"],
        enum: ['customer', 'super-admin','merchant'],
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
    role:{
        type:String,
        default:"merchant"
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
    location:{
        type:String,
        required:[true, 'location is required.'],
        default:""
    },
    status:{
        type:String,
        enum:['active','in-progress','deleted', 'blocked'],
        default:"active"
    },
    machines:{
        type:[String],
        default:[]
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    }
},{timestamps:true});

accountsSchema.pre('save', function(next) {
    this.accountId = this._id;
    next();
});

module.exports = mongoose.model('accounts',accountsSchema)