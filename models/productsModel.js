let mongoose = require("mongoose");

let productsSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, "Product name is mandatory."],
    index: true,
  },
  brandName: {
    type: String,
    required: [true, "Brand name is mandatory."],
  },
  trending: {
    type: Boolean,
    default: false,
  },
  images: {
    type: Array,
    required: [true, "Image urls for specific product are mandatory"],
    default: [],
  },
  availableStock: {
    type: Number,
    required: [true, "Stock count is mandatory."],
    default: 0,
  },
  category: {
    type: String,
    required: [true, "Category is mandatory."],
  },
  status: {
    type: String,
    enum: ["Pending", "On-hold", "active-for-sale"],
  },
  colourVariants: [
    {
      colour: {
        type: String,
      },
      image: {
        type: String,
        required: [true, "Image url is mandatory."],
      },
      availableStock: {
        type: Number,
        required: [true, "Stock count is mandatory."],
      },
      status: {
        type: String,
        enum: ["Pending", "On-hold", "active-for-sale"],
      },
    },
  ],
});

module.exports = mongoose.model("productsModel", productsSchema);
