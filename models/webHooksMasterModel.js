const mongoose = require("mongoose");

const webhookMastersSchema = new mongoose.Schema(
  {
    webhookMasterId: {
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
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
      required: [true, "Webhook URL code is mandatory"]
    },
    authenticationCode: {
      type: String,
      required: [true, "Authentication code is mandatory"],
      unique: [true, "Authentication code must be unique"]
    },
    webhookToken: {
      type: String,
      default: null,
      // required: [true, "Webhook token code is mandatory"],
    },

    requestObject: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    primaryHookId: {
      type: String,
      index: true,
      default: "",
    },
    comments: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "offline", "deleted"],
      default: "active",
    },
    lastPullDate: {
      type: Date,
      default: null
    },
    webhookSettings: {
      periodType: {
        type: String,
        enum: ["each second", "once each minute", "once each hour", "once each day", "once each month"],
        required: [true, 'periodType required'],
        default: ""
      },
      currentStatus: {
        type: String,
        enum: ['start', 'stop'],
        default: "stop"
      },
      interval: {
        type: Number,
        default: 1
      },
      expiresOn: {
        type: Date,
        default: new Date()
      }
    }
  },
  { timestamps: true }
);

webhookMastersSchema.pre("save", function (next) {
  (this.webhookMasterId = this._id), next();
});

module.exports = mongoose.model("webhookmasters", webhookMastersSchema);