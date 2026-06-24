let productsModel = require("../../models/productsModel");
const asyncWrapper = require("../../middleware/asyncWrapper");
let uploadImageToCloudinary = require("../../utils/cloudinaryConfig");

exports.addProductFirstEntry = asyncWrapper(async (req, res) => {
  let { productName, brandName, category } = req.body;
  let createProduct = await productsModel.create({
    productName,
    brandName,
    category,
  });

  return res.status(201).json({
    status: "success",
    message: "A New Product is onboarded.",
    data: createProduct,
  });
});

exports.addImagesToProductWithColourVariants = asyncWrapper(
  async (req, res) => {
    const { productId } = req.params;

    const { colour, availableStock } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: "failed",
        message: "Image is mandatory.",
      });
    }

    const product = await productsModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        status: "failed",
        message: "Product not found.",
      });
    }

    const uploadedImage = await uploadImageToCloudinary(req.file.buffer);

    product.colourVariants.push({
      colour,
      image: uploadedImage.secure_url,
      availableStock,
    });
    product.availableStock += availableStock;
    await product.save();

    return res.status(200).json({
      status: "success",
      message: "Colour variation added successfully.",
      data: { product },
    });
  },
);

exports.addNonCVImages = asyncWrapper(async (req, res) => {
  const { productId } = req.params;
  let { availableStock } = req.body;
  const uploadedImages = [];
  try {
    const product = await productsModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        status: "failed",
        message: "Product not found.",
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "At least one image is required.",
      });
    }

    for (const file of req.files) {
      const result = await uploadImageToCloudinary(file.buffer);

      uploadedImages.push({
        secureUrl: result.secure_url,
        publicId: result.public_id,
      });
    }

    product.images.push(...uploadedImages.map((image) => image.secureUrl));

    product.availableStock += Number(availableStock);

    await product.save();
    return res.status(200).json({
      status: "success",
      message: "general images uploaded successfully.",
      data: {
        product,
      },
    });
  } catch (error) {
    console.log("Upload failed. Starting rollback...");

    for (const image of uploadedImages) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (deleteError) {
        console.error(
          "Rollback failed for:",
          image.publicId,
          deleteError.message,
        );
      }
    }
    throw error;
  }
});
