const mongoose = require('mongoose')


const accountsSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },
    accountName:{
        type:String,
        require:[true, 'Account name is required.'],
        default:""
    },
    companyName:{
        type:String,
        require:[true, 'Company name is required.'],
        default:""
    },
    logo:{
        type:String,
        default:""
    },
    phone:{
        type:String,
        require:[true, 'Mobile number is required.'],
        default:""
    },
    email:{
        type:String,
        require:[true, 'Email is required.'],
        default:""
    },
    password:{
        type:String,
        require:[true, 'Password is required.'],
        default:""
    },
    address:{
        type:String,
        default:""
    },
    city:{
        type:String,
        require:[true, 'city is required.'],
        default:""
    },
    state:{
        type:String,
        require:[true, 'state is required.'],
        default:""
    },
    country:{
        type:String,
        require:[true, 'country is required.'],
        default:""
    },
    pincode:{
        type:String,
        require:[true, 'pincode is required.'],
        default:""
    },
    status:{
        type:String,
        enum:['active','deleted', 'blocked'],
        default:"active"
    },
},{timestamps:true});

accountsSchema.pre('save', function(next) {
    this.accountId = this._id;
    next();
});

module.exports = mongoose.model('accounts',accountsSchema)