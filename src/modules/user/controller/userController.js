import { NotFoundError } from "../../../exceptions/errors.js";
import { makeError, successResponse } from "../../../shared/utils/response.js";
import {
  getUserByNameOrUsernameService,
  getUserByIdService,
  updateUserProfileService,
  uploadUserProfilePhotoService,
  deleteUserProfilePhotoService,
} from "../service/userService.js";

export const handleGetUserByUsernameOrName = async (req, res, next) => {
  try {
    const { username, name } = req.query;
    console.log(`${username} | ${name}`);
    if (username === undefined && name === undefined) throw new NotFoundError('username or name must not empty', 400);
    const user = await getUserByNameOrUsernameService({ name, username });
    return successResponse(res, null, user);
  } catch (error) {
    next(error);
  }
}

export const handleGetUserById = async (req, res, next) => {
  try {
    const userIdToFind = req.params.userid;
    const user = await getUserByIdService(userIdToFind);
    return successResponse(res, null, user);
  } catch (error) {
    next(error);
  }
}

export const handleGetUserLoggedIn = async (req, res, next) => {
  try {
    const userIdToFind = req.user.id;
    console.log(`userIdToFind: ${userIdToFind}`);
    const user = await getUserByIdService(userIdToFind);
    return successResponse(res, null, user);
  } catch (error) {
    next(error);
  }
}

export const handleUpdateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const user = await updateUserProfileService({ userId, name });
    return successResponse(res, "profile updated successfully", user);
  } catch (error) {
    next(error);
  }
}

export const handleUploadProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    const result = await uploadUserProfilePhotoService({ userId, file });
    return successResponse(res, "profile photo uploaded successfully", result, 201);
  } catch (error) {
    next(error);
  }
}

export const handleDeleteProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await deleteUserProfilePhotoService({ userId });
    return successResponse(res, "profile photo deleted successfully", result);
  } catch (error) {
    next(error);
  }
}