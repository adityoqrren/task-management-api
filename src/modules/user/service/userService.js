import { randomUUID } from "crypto";
import { BadRequestError, NotFoundError } from "../../../exceptions/errors.js";
import StorageService from "../../../storage/storageService.js";
import {
    getUserByName,
    getUserByUsername,
    getUserById,
    updateUserFullname,
    updateUserProfilePicture,
    getUserProfilePicture,
} from "../repository/userRepository.js";

const storageService = new StorageService();

const MIME_EXTENSION = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

export const getUserByNameOrUsernameService = async ({ name, username }) => {
    if (name != null) {
        const user = await getUserByName(name);
        return user;
    } else {
        const user = await getUserByUsername(username);
        return user;
    }
}

export const getUserByIdService = async (id) => {
    const user = await getUserById(id);
    if (!user) {
        throw new NotFoundError('user with that id is not found');
    }
    return user;
}

export const updateUserProfileService = async ({ userId, name }) => {
    const user = await updateUserFullname(userId, name);
    return user;
};

export const uploadUserProfilePhotoService = async ({ userId, file }) => {
    if (!file) {
        throw new BadRequestError('File is required');
    }

    const extension = MIME_EXTENSION[file.mimetype];
    if (!extension) {
        throw new BadRequestError('Invalid file type. Allowed types: image/jpeg, image/png, image/webp');
    }

    const existing = await getUserProfilePicture(userId);
    if (!existing) {
        throw new NotFoundError('user with that id is not found');
    }
    const oldObjectKey = existing.profilePicture;

    const objectKey = `uploads/profile-pictures/${userId}_${Date.now()}_${randomUUID()}${extension}`;

    const fileUrl = await storageService.writeFile(file.buffer, objectKey, file.mimetype);

    try {
        await updateUserProfilePicture(userId, objectKey);
    } catch (error) {
        // DB update failed, remove the file we just uploaded so it does not linger as an orphan
        try {
            await storageService.deleteFile(objectKey);
        } catch (cleanupError) {
            console.error(`Failed to cleanup orphaned profile photo ${objectKey}: ${cleanupError.message}`);
        }
        throw error;
    }

    // old photo is deleted only after the new one is saved and DB is updated
    if (oldObjectKey && oldObjectKey !== objectKey) {
        try {
            await storageService.deleteFile(oldObjectKey);
        } catch (error) {
            console.error(`Failed to delete old profile photo ${oldObjectKey}: ${error.message}`);
        }
    }

    return {
        userId,
        photoProfile: fileUrl,
    };
};

export const deleteUserProfilePhotoService = async ({ userId }) => {
    const existing = await getUserProfilePicture(userId);
    if (!existing) {
        throw new NotFoundError('user with that id is not found');
    }

    const objectKey = existing.profilePicture;
    if (!objectKey) {
        throw new NotFoundError('Profile photo not found');
    }

    await updateUserProfilePicture(userId, null);

    try {
        await storageService.deleteFile(objectKey);
    } catch (error) {
        console.error(`Failed to delete profile photo ${objectKey}: ${error.message}`);
    }

    return {
        userId,
        photoProfile: null,
    };
};
