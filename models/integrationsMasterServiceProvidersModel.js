const mongoose = require("mongoose");

const integrationsMasterServiceProvidersSchema = new mongoose.Schema(
  {
    integrationServiceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    integrationsMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "integrationsMaster",
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "accounts",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    serviceProvider: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
      //   require: [true, "Role is required."],
      // default: "",
    },
    status: {
      type: String,
      enum: ["new", "verified", "failed", "deleted"],
      default: "active",
    },
    createdBy: {
      type: String,
      require: [true, "Created by is required."],
      default: "",
    },
    updatedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

integrationsMasterServiceProvidersSchema.pre("save", function (next) {
  this.integrationServiceProviderId = this._id;
  next();
});

module.exports = mongoose.model(
  "integrationsMasterServiceProviders",
  integrationsMasterServiceProvidersSchema
);
