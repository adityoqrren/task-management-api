import { ZodError } from "zod";
import multer from "multer";

function errorHandler(err, req, res, next) {
  // 1. Zod validation error
  if (err instanceof ZodError) {
    const issues = err.errors || err.issues || [];
    return res.status(400).json({
      status: "fail",
      message: "Validation Error",
      errors: issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 1b. Multer upload error (e.g. file too large)
  if (err instanceof multer.MulterError) {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "File too large. Maximum allowed size exceeded."
      : `Upload error: ${err.message}`;
    return res.status(statusCode).json({
      status: "fail",
      message,
    });
  }

  // 2. AppError (custom)
  if (err.isOperational) {
    // Expected errors
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  // 3. Not expected errors
  console.error("UNEXPECTED ERROR ❌", err);

  res.status(500).json({
    status: 'fail',
    message: "Internal Server Error",
  });
}

export default errorHandler;