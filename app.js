const express = require('express');

const helmet = require('helmet');
const cors = require('cors');
const connectToDB = require('./config/Db');
const logger = require('./middlewares/logger');

const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
require('dotenv').config();
const app = express();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

connectToDB();

app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/order', require('./routes/orders'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/user', require('./routes/user'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use(notFound);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
