require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { startCurator } = require('./services/ghosts/curator');

// Import routes
const inputRouter = require('./routes/input');
const searchRouter = require('./routes/search');
const silenceRouter = require('./routes/silence');

// Create Express app
const app = express();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '../logs/system-echo.log' })
  ]
});

// Configure rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: 'The void hears you. But slower, please.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(limiter);

// Routes
app.use('/api/input', inputRouter);
app.use('/api/search', searchRouter);
app.use('/api/silence', silenceRouter);
app.use('/api/trace', require('./routes/trace'));

// Start the curator service
startCurator();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke in the silence...');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server is listening in the void on port ${PORT}`);
  console.log(`Server is listening in the void on port ${PORT}`);
}); 