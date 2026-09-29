import { generateWebSocketToken } from "../../../jwt/jwt.js";

export const generateWebSocketTokenService = async (user) => {
  return generateWebSocketToken(user);
};