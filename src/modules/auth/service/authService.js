import bcrypt from 'bcrypt'
import { addRefreshToken, addUser, getUserByEmailOrUsername, getUserByEmail, getUserByUsername, getRefreshToken, updateRefreshToken } from '../repository/authRepository.js';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../../../exceptions/errors.js';
import { generateTokens } from '../../../jwt/jwt.js';
import { hashToken } from '../../../shared/utils/generate.js';
import { getUserByIdService } from '../../user/service/userService.js';
import StorageService from '../../../storage/storageService.js';

import {
  getLoginProtectionStatusService,
  recordLoginFailureService,
  resetLoginAttemptsService,
} from '../../../shared/services/loginAttemptService.js';

import {
  LOGIN_EXPECTED_ACTION,
  REGISTER_EXPECTED_ACTION,
  verifyTurnstileService,
} from '../../../shared/services/turnstileService.js';

const SALT_ROUNDS = 10;
const storageService = new StorageService();

export const registerUserService = async ({ email, username, name, password, turnstileToken, remoteIp }) => {
  const isVerified = await verifyTurnstileService({
    token: turnstileToken,
    remoteIp,
    expectedAction: REGISTER_EXPECTED_ACTION,
  });

  if (!isVerified) {
    throw new ForbiddenError('Verification failed. Please try again.');
  }

  const existing = await getUserByEmail(email);
  // console.log(existing);
  if (existing) {
    throw new BadRequestError('Email already registered');
  }

  const existingUsername = await getUserByUsername(username);
  // console.log(existing);
  if (existingUsername) {
    throw new BadRequestError('Username already taken');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await addUser({ email, username, name, password: hashedPassword });
  return user;
};


export const loginUserService = async ({
  email,
  password,
  turnstileToken,
  remoteIp,
}) => {
  const user = await getUserByEmailOrUsername(email);

  if (!user) {
    throw new BadRequestError('Invalid credentials');
  }

  // Check whether additional verification is required.
  const protection = await getLoginProtectionStatusService(user.id);

  if (protection.required) {
    if (!turnstileToken) {
      throw new ForbiddenError('Additional verification required');
    }

    const isVerified = await verifyTurnstileService({
      token: turnstileToken,
      remoteIp,
      expectedAction: LOGIN_EXPECTED_ACTION
    }
    );

    //console.log(`ip here : ${remoteIp}`);
    //console.log(`isVerified : ${isVerified}`)

    if (!isVerified) {
      throw new ForbiddenError('Verification failed. Please try again.');
    }
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    await recordLoginFailureService(user.id);

    throw new BadRequestError('Invalid credentials');
  }

  const { accessToken, refreshToken } = generateTokens(user);

  const tokenHash = hashToken(refreshToken);

  await addRefreshToken(user.id, tokenHash);

  // Clear account login protection after successful authentication.
  await resetLoginAttemptsService(user.id);

  return {
    accessToken,
    refreshToken,
  };
};


export const getInfoUserLoginService = async (email) => {
  const existing = await getUserByEmail(email);
  if (!existing) {
    throw new UnauthorizedError('User not found');
  }

  const { profilePicture, ...userDetail } = existing;

  let photoProfile = null;
  if (profilePicture) {
    photoProfile = await storageService.createPreSignedUrl({
      bucket: process.env.R2_BUCKET_NAME,
      key: profilePicture,
    });
  }

  return {
    ...userDetail,
    photoProfile,
  };
}

// export const updateTokenService = async (refreshToken) => {
//     //get refresh token from db
//     const findToken = await getToken(refreshToken);
//     if (!findToken) throw new BadRequestError('refresh token is not valid');

//     //verify refresh token
//     const payload = verifyRefreshToken(refreshToken);

//     //if verify is complete then we create new accessToken and refreshToken
//     const { accessToken, refreshToken: newRefresh } = generateTokens(payload);

//     // TODO: uncomment code below to implement refreshToken rotation

//     // //delete old refresh token from db
//     // await deleteToken(refreshToken);

//     // //add new refresh token to db
//     // await addToken(newRefresh);

//     return {
//         accessToken,
//         // refreshToken: newRefresh
//     }
// }

export const updateTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token required");
  }

  const tokenHash = hashToken(refreshToken);

  const existingToken = await getRefreshToken(tokenHash);

  if (!existingToken || existingToken.revoked) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (existingToken.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired");
  }

  // ambil user dari relation
  const user = await getUserByIdService(existingToken.userId);

  // revoke old token
  await updateRefreshToken(existingToken.id);

  // generate new tokens
  const { accessToken, refreshToken: newRefreshToken } =
    generateTokens(user);

  const newHash = hashToken(newRefreshToken);

  await addRefreshToken(existingToken.userId, newHash);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutService = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token required");
  }

  const tokenHash = hashToken(refreshToken);

  const existingToken = await getRefreshToken(tokenHash, false);

  if (!existingToken) {
    throw new BadRequestError('refresh token is not valid');
  }

  // if (!existingToken.revoked) {
  await updateRefreshToken(existingToken.id);
  // }

  return refreshToken;
};

// export const deleteTokenService = async (refreshToken) => {
//   //get refresh token from db
//   const findToken = await getToken(refreshToken);
//   if (!findToken) throw new BadRequestError('refresh token is not valid');

//   //delete token from db
//   const deletedToken = await deleteRefreshToken(refreshToken);
//   return deletedToken;
// }
