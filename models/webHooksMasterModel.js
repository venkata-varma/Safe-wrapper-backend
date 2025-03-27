const mongoose = require("mongoose");

const webHookMastersSchema = new mongoose.Schema(
  {
    webHookMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "AccountId is Mandatory"],
      ref: "accounts",
      index: true,
      default: null,
    },
    location: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Webhook name is required"],
     
    },
    webHookUrl: {
      type: String,
     
      required:[true, "Webhook URL code is mandatory"]
    },
    authenticationCode: {
      type: String,
      required:[true, "Authentication code is mandatory"],
      unique:[true, "Authentication code must be unique"]
    },

    requestObject: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    primaryHookId: {
      type: String,
      default: "",
    },
    comments: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "offline", "delete"],
      default: "active",
    },
  },
  { timestamps: true }
);

webHookMastersSchema.pre("save", function (next) {
  (this.webHookMasterId = this._id), next();
});

module.exports = mongoose.model("webhookmasters", webHookMastersSchema);