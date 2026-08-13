import { successResponse } from "../../../shared/utils/response.js";
import { generateWebSocketTokenService } from "../service/websocketService.js";

export const handleGenerateWebSocketToken = async (
  req,
  res,
  next
) => {
  try {
    const token =
      await generateWebSocketTokenService(req.user);
    
      //console.log(`token websocket: ${token} `)

    return successResponse(
      res,
      "WebSocket token generated",
      {
        token,
        "expiresIn": 30,
      }
    );
  } catch (err) {
    next(err);
  }
};