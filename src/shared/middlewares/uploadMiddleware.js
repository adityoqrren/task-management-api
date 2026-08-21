import multer from 'multer';
import { BadRequestError } from '../../exceptions/errors.js';

/**
 * Multer : memory buffer -> file saved in memory buffer before processing, not disk
 * Factory function for making flexible upload middleware
 * @param {Object} options
 * @param {Array<string>} options.allowedMimeTypes - eg: ['image/jpeg', 'image/png']
 * @param {number} options.maxFileSizeMB - file size limit in Megabyte (default: 2MB)
 */
export const createUploader = ({ allowedMimeTypes = [], maxFileSizeMB = 2 }) => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024, // Convert MB to Bytes
    },
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestError(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
      }
      cb(null, true);
    },
  });
};

// Preset middleware
export const uploadImage = createUploader({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeMB: 2,
});

export const uploadDocument = createUploader({
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ],
  maxFileSizeMB: 10,
});
