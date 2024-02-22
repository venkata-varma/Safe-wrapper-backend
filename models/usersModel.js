const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'registration',
        index: true,
    },
    fullName:{
        type:String
    },
    email:{
        type:String
    },
    mobileNumber:{
        type:String,
        require:[true, 'mobile number is required.']
    },
    password:{
        type:String,
        require:[true, 'password is required.']
    },
    status:{
        type:String
    }
},{timestamps:true});


userSchema.methods.getJWTToken = function () {
    return jwt.sign({ user_id: this._id }, 'secret', {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
}

userSchema.methods.getJWTTokenExpireDate = async (jwtToken) => {
    const decode = jwt.verify(jwtToken, 'secret');
    return decode;
}


module.exports = mongoose.model('user',userSchema)