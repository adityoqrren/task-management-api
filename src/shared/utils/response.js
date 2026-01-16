export const makeError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

//except getting data
export const successResponse = (res, message = null, data = null, statusCode = 200) => {

  const response = {
    status: 'success',
  }

  if (message != null) response.message = message;

  if (data != null) response.data = data;

  return res.status(statusCode).json(response);
};

//except getting data
export const successPaginationResponse = (res, message = null, data = null, pagination = null, statusCode = 200) => {

  const response = {
    status: 'success',
  }

  if (message != null) response.message = message;

  if (data != null) response.data = data;

  if (pagination != null) response.pagination = pagination;

  return res.status(statusCode).json(response);
};