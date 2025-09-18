import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    console.log("Attempting to upload file from:", localFilePath);
    
    if (!localFilePath) {
      console.error("No local file path provided");
      return null;
    }

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      console.error("File does not exist at path:", localFilePath);
      return null;
    }

    // Check file stats
    const stats = fs.statSync(localFilePath);
    console.log("File size:", stats.size, "bytes");
    
    if (stats.size === 0) {
      console.error("File is empty");
      fs.unlinkSync(localFilePath);
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      timeout: 30000, // 30 second timeout
    });
    
    console.log("✅ File uploaded successfully to Cloudinary");
    console.log("Cloudinary URL:", response.url);
    
    // Clean up local file
    fs.unlinkSync(localFilePath);
    return response;
    
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);
    console.error("Error details:", error);
    
    // Clean up local file if it exists
    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
        console.log("Cleaned up local file");
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError.message);
      }
    }
    return null;
  }
};

export { uploadOnCloudinary };