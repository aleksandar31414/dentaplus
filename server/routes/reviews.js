const router = require('express').Router();
const ctrl = require('../controllers/reviews');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Reviews
 *     description: Patients rate completed appointments, the clinic replies
 */

/**
 * @openapi
 * /reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Reviews (public)
 *     parameters:
 *       - { in: query, name: dentist, schema: { type: string } }
 *       - { in: query, name: mine, schema: { type: boolean } }
 *       - { in: query, name: minRating, schema: { type: integer } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200: { description: Paginated reviews }
 *   post:
 *     tags: [Reviews]
 *     summary: Review a completed appointment (once)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointment, rating, text]
 *             properties:
 *               appointment: { type: string }
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               text: { type: string, example: Брзо и безболно, препорачувам! }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Already reviewed }
 */
router.get('/', optionalAuth, ctrl.list);
router.post('/', authenticate, validate(rules.review), ctrl.create);

/**
 * @openapi
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Change own review
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { rating: { type: integer }, text: { type: string } } } } }
 *     responses:
 *       200: { description: Updated }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review (author or admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 * /reviews/{id}/reply:
 *   put:
 *     tags: [Reviews]
 *     summary: Clinic reply to a review (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [reply], properties: { reply: { type: string } } } } }
 *     responses:
 *       200: { description: Replied }
 */
router.put('/:id', authenticate, validateId(), validate(rules.reviewUpdate, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, validateId(), ctrl.remove);
router.put('/:id/reply', authenticate, authorize('admin'), validateId(), validate(rules.reply), ctrl.reply);

module.exports = router;
