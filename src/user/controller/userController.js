import { NotFoundError } from "../../exceptions/errors.js";
import { makeError, successResponse } from "../../utils/response.js";
import { getUserByNameOrUsernameService, getUserByIdService } from "../service/userService.js";

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