import bcrypt from 'bcrypt'
import prisma from '../../../db/db.js';
import { addRefreshToken, addUser, getUserByEmailOrUsername, getUserByEmail, getUserByUsername, getRefreshToken, updateRefreshToken } from '../repository/authRepository.js';
import { BadRequestError, UnauthorizedError } from '../../../exceptions/errors.js';
import { generateTokens } from '../../../jwt/jwt.js';
import { hashToken } from '../../../shared/utils/generate.js';
import { getUserByIdService } from '../../user/service/userService.js';

const SALT_ROUNDS = 10;

export const registerUserService = async ({ email, username, name, password }) => {
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

export const loginUserService = async ({ email, password }) => {
  // console.log(`${email} - ${password}`)
  const user = await getUserByEmailOrUsername(email)
  if (!user) throw new BadRequestError('Invalid email')

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new BadRequestError('Invalid password')

  //Generate token yang mengandung data user_id
  //Diencrypt dengan JWT_SECRET
  const { accessToken, refreshToken } = generateTokens(user)

  const tokenHash = hashToken(refreshToken);

  //store refresh token ke database
  await addRefreshToken(user.id, tokenHash);

  return {
    accessToken,
    refreshToken,
  }
}

export const getInfoUserLoginService = async (email) => {
  const existing = await getUserByEmail(email);
  return existing;
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

  // generate new tokens
  const { accessToken, refreshToken: newRefreshToken } =
    generateTokens(user);

  const newHash = hashToken(newRefreshToken);

  // revoke old token and persist the new one atomically
  await prisma.$transaction(async (tx) => {
    await updateRefreshToken(existingToken.id, tx);
    await addRefreshToken(existingToken.userId, newHash, tx);
  });

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
