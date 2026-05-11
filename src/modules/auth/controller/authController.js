import { BadRequestError } from "../../../exceptions/errors.js";
import { successResponse } from "../../../shared/utils/response.js";
import { getInfoUserLoginService, logoutService, registerUserService, updateTokenService } from "../service/authService.js";
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
    const { accessToken, refreshToken } = await loginUserService({ email, password })
    const isMobile = req.headers['x-client-type'] === 'mobile'
    // res.json(result)
    if (isMobile) {
      // MOBILE → return tokens
      return successResponse(res, "login success", {
        accessToken,
        refreshToken
      }, 200)
    }
    // WEB → set HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1 * 60 * 1000
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return successResponse(res, "login success")
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
    // from cookie (web)
    const cookieToken = req.cookies?.refreshToken;

    // from body (mobile)
    const bodyToken = req.body?.refreshToken;

    let refreshToken = null;

    if (bodyToken) {
      refreshToken = bodyToken
    } else if (cookieToken) {
      refreshToken = cookieToken
    } else {
      throw new BadRequestError('refresh token cannot be null or empty');
    }

    const newTokens = await updateTokenService(refreshToken);

    if (bodyToken) {
      return successResponse(res, 'refresh token success', newTokens);
    } else {
      // WEB → set HttpOnly cookies
      res.cookie('accessToken', newTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 60 * 1000
      })

      res.cookie('refreshToken', newTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      return successResponse(res, 'refresh token success');
    }

  } catch (error) {
    next(error);
  }
}

export const handleLogout = async (req, res, next) => {
  try {
    // from cookie (web)
    const cookieToken = req.cookies?.refreshToken;

    // from body (mobile)
    const bodyToken = req.body?.refreshToken;

    let refreshToken = null;

    if (bodyToken) {
      refreshToken = bodyToken
    } else if (cookieToken) {
      refreshToken = cookieToken
    } else {
      throw new BadRequestError('refresh token cannot be null or empty');
    }

    await logoutService(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return successResponse(res, 'logout success');
  } catch (err) {
    next(err);
  }
};

// export const handleDeleteToken = async (req, res, next) => {
//   try {
//     const refreshToken = req.body.refreshToken;
//     const deleteToken = await deleteTokenService(refreshToken);
//     return successResponse(res, 'delete token success');
//   } catch (error) {
//     next(error);
//   }
// }

