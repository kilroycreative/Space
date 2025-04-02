require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/input', inputRouter);
app.use('/api/search', searchRouter);
app.use('/api/silence', silenceRouter);

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