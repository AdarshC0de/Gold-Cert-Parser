import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// For regular images (JPG/PNG)
export async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "gold-certs", public_id: filename, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    ).end(buffer);
  });
}

// For PDFs — resource_type must be "image" so Cloudinary processes pages
export async function uploadPdfToCloudinary(buffer: Buffer, filename: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "gold-certs-pdf",
        public_id: filename,
        resource_type: "image", // ← must be "image" not "raw" for page conversion
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}

export default cloudinary;