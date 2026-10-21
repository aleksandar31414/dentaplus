const router = require('express').Router();
const activities = require('../controllers/activities');
const stats = require('../controllers/stats');
const external = require('../controllers/external');
const db = require('../controllers/db');
const { authenticate } = require('../middleware/auth');

/**
 * @openapi
 * tags:
 *   - name: Activities
 *     description: History of user activities
 *   - name: Statistics
 *     description: Aggregated data for the charts
 *   - name: External (Nager.Date)
 *     description: Public holidays of North Macedonia from the Nager.Date REST API
 *   - name: Database
 *     description: Test helpers used by the /db page
 */

/**
 * @openapi
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: Activity history (own for patients, all for admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: action, schema: { type: string, enum: [create, update, delete, login, register, book, cancel, confirm, complete, reply] } }
 *       - { in: query, name: entityType, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string }, description: admin only }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200: { description: Paginated activities }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/activities', authenticate, activities.list);

/**
 * @openapi
 * /stats/overview:
 *   get:
 *     tags: [Statistics]
 *     summary: Counts and aggregations for the dashboard charts
 *     responses:
 *       200: { description: Statistics }
 */
router.get('/stats/overview', stats.overview);

/**
 * @openapi
 * /external/holidays:
 *   get:
 *     tags: [External (Nager.Date)]
 *     summary: Public holidays (the clinic is closed – they cannot be booked)
 *     parameters:
 *       - { in: query, name: year, schema: { type: integer, example: 2026 } }
 *     responses:
 *       200: { description: "{ source, holidays: [{ date, name, localName }] }" }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/external/holidays', external.holidays);

/**
 * @openapi
 * /db:
 *   get:
 *     tags: [Database]
 *     summary: Number of documents per collection
 *     responses:
 *       200: { description: Counts }
 *   delete:
 *     tags: [Database]
 *     summary: Delete ALL data from the database
 *     responses:
 *       200: { description: Deleted counts }
 * /db/seed:
 *   post:
 *     tags: [Database]
 *     summary: Reset and insert the initial data (users, dentists, services, appointments, reviews, records)
 *     responses:
 *       201: { description: Inserted counts }
 */
router.get('/db', db.status);
router.delete('/db', db.clear);
router.post('/db/seed', db.seed);

module.exports = router;
