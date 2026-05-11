// utils/jwt.js
import jwt from "jsonwebtoken";
import { generateRefreshToken } from "../shared/utils/generate.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" }
  );

  const refreshToken = generateRefreshToken();

  return { accessToken, refreshToken };
}

//export const verifyRefreshToken = (refreshToken) => jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

