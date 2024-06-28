const Joi = require('joi');

function isNumeric(value) {
    return /^-?\d+$/.test(value);
}

exports.validateUserMobileEmailData = (data) => {
    const {  mobileEmail  } = data;
    if (isNumeric(mobileEmail)) {
        const schema = Joi.object({
            mobileEmail: Joi.string().regex(/^[0-9]{10}$/).messages({ 'string.pattern.base': `Phone number must have 10 digits.` }).required(),
        }).unknown().options({ abortEarly: false });
        return schema.validate(data);
    }
    else {
        const schema = Joi.object({
            mobileEmail: Joi.string().min(5).required().email(),
        }).unknown().options({ abortEarly: false });
        return schema.validate(data);
    }
}

//Validate Phone Number.
exports.validatePhoneNumber = async (phoneNumber) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phoneNumber);
}
