const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const apiRouter = require('./routes');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ---------- REST API documentation ----------
app.get('/api/swagger.json', (_req, res) => res.json(swaggerSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'DentaPlus API',
  swaggerOptions: { persistAuthorization: true },
}));

// ---------- REST API ----------
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' }));
app.use('/api', apiRouter);
app.use('/api', apiNotFound);

// ---------- Static front-end ----------
// Part 1 mockups are always available at /mockups.
const mockupsDir = path.join(__dirname, '..', 'mockups');
app.use('/mockups', express.static(mockupsDir));

// Part 4: the built React SPA (client/dist). Until it is built, / serves the static mockups (Part 2).
const spaDir = process.env.CLIENT_DIST || path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(spaDir, 'index.html'))) {
  app.use(express.static(spaDir));
  // client-side routing: every non-API GET returns index.html (incl. /db)
  app.get('*', (_req, res) => res.sendFile(path.join(spaDir, 'index.html')));
} else {
  app.use(express.static(mockupsDir));
}

app.use(errorHandler);

module.exports = app;
