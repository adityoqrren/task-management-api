import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../exceptions/errors.js'

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // return res.status(401).json({ message: 'Unauthorized: No token provided' })
      throw new UnauthorizedError('Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1]

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
    next(error);
  }
}
