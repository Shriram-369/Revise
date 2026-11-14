import { v2 as cloudinary } from 'cloudinary';
import env from '../config.js';

export const cloudinaryReady = Boolean(env.CLOUDINARY_URL);
if (cloudinaryReady) cloudinary.config({ secure: true }); // credentials come from CLOUDINARY_URL

export const uploadImage = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: 'image', allowed_formats: ['jpg', 'png', 'webp', 'gif'], transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }] },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });

// Best effort: a failed cleanup should not block deleting the topic or image.
export const deleteImage = publicId => (cloudinaryReady ? cloudinary.uploader.destroy(publicId).catch(() => {}) : Promise.resolve());
