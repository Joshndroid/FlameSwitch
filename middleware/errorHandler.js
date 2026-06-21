const ErrorResponse = require('../utils/ErrorResponse');
const Logger = require('../utils/Logger');
const logger = new Logger();

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // if (error.errors[0].type === 'unique violation') {
  //   const msg = error.errors[0].message;
  //   error = new ErrorResponse(`Field ${msg}`, 400);
  // }

  logger.log(error.message.split(',')[0], 'ERROR');

  if (process.env.NODE_ENV == 'development') {
    console.log(err);
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 ? 'Server Error' : error.message,
  });
};

module.exports = errorHandler;
