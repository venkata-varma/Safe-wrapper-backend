const mongoose = require("mongoose");

const integrationsMasterSchema = new mongoose.Schema(
  {
    integrationsMasterId: {
      type: mongoose.Schema.Types.ObjectId,
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
    title: {
      type: String,
      require: [true, "Title is required."],
      default: "",
    },
    description: {
      type: String,
      require: [true, "Description is required."],
      default: "",
    },
    from: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
      //   require: [true, "Role is required."],
      default: "CPD",
    },
    to: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
    //   require: [true, "Role is required."],
      //   default: "",
    },
    status: {
      type: String,
      enum: ["active", "deleted", "blocked"],
      default: "active",
    },
    stepCount: {
      type: Number,
      default: 0,
    },
    lastPullDate: {
      type: Date,
      default: "",
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

integrationsMasterSchema.pre("save", function (next) {
  this.integrationsMasterId = this._id;
  next();
});

module.exports = mongoose.model("integrationsMaster", integrationsMasterSchema);
