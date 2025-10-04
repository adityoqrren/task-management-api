import { ZodError } from "zod";

export const validateRequest = (schema) => (req, res, next) => {
  try {
    // gabungkan semua input (opsional, tergantung kebutuhan)
    const data = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    schema.parse(data); // akan throw kalau invalid
    next();
  } catch (error) {
    next(error);
  }
};
