import formidable from "formidable";
import fs from "fs";
import { client } from "../sanity/client.js";

export const uploadImage = async (req, res) => {
  const form = formidable({ keepExtensions: true, multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable error:", err);
      return res.status(500).json({ message: "Form parsing failed" });
    }

    try {
      const file = files.image;

      // Support both array and object formats
      const imageFile = Array.isArray(file) ? file[0] : file;

      if (!imageFile || !imageFile.filepath) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const uploaded = await client.assets.upload(
        "image",
        fs.createReadStream(imageFile.filepath),
        { filename: imageFile.originalFilename }
      );

      res.status(200).json({
        message: "Image uploaded successfully",
        asset: {
          _id: uploaded._id,
          url: uploaded.url,
        },
      });
    } catch (uploadErr) {
      console.error("Sanity upload error:", uploadErr);
      res.status(500).json({
        message: "Failed to upload image to Sanity",
        error: uploadErr.message,
      });
    }
  });
};
