import { BadRequestError } from "../../exceptions/errors.js";
import { successResponse } from "../../utils/response.js";
import { deleteTokenService, getInfoUserLoginService, registerUserService, updateTokenService } from "../service/authService.js";
import { loginUserService } from '../service/authService.js'

export const handleRegister = async (req, res, next) => {
  try {
    const { email, username, name, password } = req.body;
    // if (email && name && password) {
    const user = await registerUserService({ email, username, name, password });
    const data = {
      userId: user.id,
    }
    return successResponse(res, "register success", data, 201)
    // } else {
    //   throw new BadRequestError("email, name, password must be filled")
    // }
  } catch (err) {
    next(err); // kirim ke error handler middleware
  }
};

export const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await loginUserService({ email, password })
    // res.json(result)
    return successResponse(res, "login success", result, 200)
  } catch (err) {
    next(err)
  }
}

export const handleGetUserInfoLogin = async (req, res, next) => {
  try {
    const email = req.user.email;
    // res.json(result)
    const result = await getInfoUserLoginService(email);
    return successResponse(res, null, result,)
  } catch (err) {
    next(err)
  }
}

export const handleUpdateToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) throw new BadRequestError('refresh token cannot be null or empty');
    const newAccessToken = await updateTokenService(refreshToken);
    return successResponse(res, 'refresh token success', newAccessToken);
  } catch (error) {
    next(error);
  }
}

export const handleDeleteToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    const deleteToken = await deleteTokenService(refreshToken);
    return successResponse(res, 'delete token success');
  } catch (error) {
    next(error);
  }
}

