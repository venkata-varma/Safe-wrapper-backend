const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const usersSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"accounts",
        default:null
    },
    name:{
        type:String,
        require:[true, 'Account name is required.'],
        default:""
    },
    password:{
        type:String,
        required:[true, 'Password is required.'],
        default:""
    },
    companyName:{
        type:String,
        required:[true, 'Company name is required.'],
        default:""
    },
    phone:{
        type:String,
        required:[true, 'Mobile number is required.'],
        default:""
    },
    email:{
        type:String,
        required:[true, 'Email is required.'],
        default:""
    },
    role:{
        type:String,
        enum:['super-admin','admin','manager', 'support'],
        required:[true, 'Role is required.'],
        default:""
    },
    status:{
        type:String,
        enum:['active','deleted', 'blocked'],
        default:"active"
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required:[true, 'Created by is required.'],
        default:null
    },
    updatedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default:null
    },
},{timestamps:true});

usersSchema.pre('save', function(next) {
    this.userId = this._id;
    next();
});

usersSchema.methods.getJWTToken = function () {
    return jwt.sign({ userId: this._id }, 'secret', {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
}

usersSchema.methods.getJWTTokenExpireDate = async (jwtToken) => {
    const decode = jwt.verify(jwtToken, 'secret');
    return decode;
}


module.exports = mongoose.model('users',usersSchema)