const mongoose = require('mongoose')


const registrationSchema = new mongoose.Schema({
    fullName:{
        type:String,
        require:[true, 'name is required.'],
        default:""
    },
    companyName:{
        type:String,
        require:[true, 'comapany name is required.'],
        default:""
    },
    mobileNumber:{
        type:String,
        require:[true, 'mobile number is required.'],
        default:""
    },
    email:{
        type:String,
        require:[true, 'email is required.'],
        default:""
    },
    password:{
        type:String,
        require:[true, 'password is required.'],
        default:""
    },
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "registration",
        default:null
    },
    status:{
        type:String,
        enum:['active','deleted'],
        default:"active"
    }
},{timestamps:true});

registrationSchema.pre('save', function(next) {
    this.registrationId = this._id;
    next();
});

module.exports = mongoose.model('registration',registrationSchema)