require('dotenv').config({ quiet: true });

// Secret stuff 
const { initializeSecret } = require('./utils/secret');
initializeSecret();

// Database
const { connectDB } = require('./db');

// Server
const api = require('./api');

// Utils
const initApp = require('./utils/init');
const Logger = require('./utils/Logger');
const logger = new Logger();

(async () => {
  const PORT = process.env.PORT || 5005;

  // Init app
  await initApp();
  await connectDB();
  api.listen(PORT, () => {
    logger.log(
      `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
})();
