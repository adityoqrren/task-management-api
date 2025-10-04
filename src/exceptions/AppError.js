// utils/AppError.js
export default class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // penanda error yang memang kita buat sendiri
    
    Error.captureStackTrace(this, this.constructor);
  }
}
