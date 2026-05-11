import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../../exceptions/errors.js';

export const authenticate = (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    // 1️⃣ Bearer
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    // 2️⃣ Cookie
    else if (cookieToken) {
      token = cookieToken;
    }

    console.log(`token: ${token}`);

    if (!token) {
      throw new UnauthorizedError('Unauthorized: No token provided')
    }

    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
      // console.log(`payload : ${payload.sub} | ${payload.email}`);
      req.user = { id: payload.sub, email: payload.email }
      next()
    } catch (err) {
      // return res.status(401).json({ message: 'Unauthorized: Invalid token' })
      throw new UnauthorizedError('Unauthorized: Invalid token');
    }
  } catch (error) {
    next(error)
  }
}
