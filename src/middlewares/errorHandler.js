import { ZodError } from "zod";

function errorHandler(err, req, res, next) {
  // 1. Zod validation error
  if (err instanceof ZodError) {
    const issues = err.errors || err.issues || [];
    return res.status(400).json({
      status: "fail",
      message: issues[0].message
      // errors: issues.map((e) => ({
      //   path: e.path.join("."),
      //   message: e.message,
      // })),
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