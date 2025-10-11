import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import {
    getSignedUrl,
} from '@aws-sdk/s3-request-presigner';
import { ForbiddenError, BadRequestError } from '../exceptions/errors.js';

export default class StorageService {
    constructor() {
        this._R2 = new S3Client({
            region: process.env.R2_REGION,
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
    }

    async writeFile(fileBuffer, objectKey, fileMimeType) {
        try {
            const parameter = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: objectKey,
                Body: fileBuffer,
                ContentType: fileMimeType,
            });

            await this._R2.send(parameter);

            return await this.createPreSignedUrl({
                bucket: process.env.R2_BUCKET_NAME,
                key: objectKey,
            });
        } catch (error) {
            if (error.statusCode === 403) {
                throw new ForbiddenError('Access to the storage service is forbidden. Please check your credentials and permissions.');
            } else if (error.statusCode === 400 || error.statusCode === 404) {
                throw new BadRequestError('Bad request to the storage service. Please check the provided parameters.');
            } else {
                throw error;
            }
        }
    }

    async deleteFile(objectKey) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: objectKey, // nama/path file di bucket
            });

            await this._R2.send(command);
            console.log(`File '${objectKey}' success deleting from bucket.`);
            return { success: true };
        } catch (error) {
            if (error.statusCode === 403) {
                throw new ForbiddenError('Access to the storage service is forbidden. Please check your credentials and permissions.');
            } else if (error.statusCode === 400 || error.statusCode === 404) {
                throw new BadRequestError('Bad request to the storage service. Please check the provided parameters.');
            } else {
                throw error;
            }
        }
    }

    async createPreSignedUrl({ bucket, key }) {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        return await getSignedUrl(this._R2, command, { expiresIn: 3600 });
    }
}
