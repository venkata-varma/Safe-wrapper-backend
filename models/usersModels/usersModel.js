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
        index : true,
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
        // required:[true, 'Company name is required.'],
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
       // required:[true, 'Created by is required.'],    // To be un-commented later when provision for admin to create User is provided from Front-end
        default:null
    },
    updatedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default:null
    },
},{timestamps:true});

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