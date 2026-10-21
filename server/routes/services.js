const router = require('express').Router();
const ctrl = require('../controllers/services');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Services
 *     description: Treatments offered by the clinic (price list)
 */

/**
 * @openapi
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Price list with filters
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string }, description: "Comma separated: preventive,cosmetic,…" }
 *       - { in: query, name: minPrice, schema: { type: integer } }
 *       - { in: query, name: maxPrice, schema: { type: integer } }
 *       - { in: query, name: maxDuration, schema: { type: integer } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, price, -price, duration, popular] } }
 *     responses:
 *       200: { description: Services, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Service' } } } } }
 *   post:
 *     tags: [Services]
 *     summary: Add a service (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Name already exists }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.service), ctrl.create);

/**
 * @openapi
 * /services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: One service
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Service }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Services]
 *     summary: Update a service (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Service' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *   delete:
 *     tags: [Services]
 *     summary: Delete a service (admin) – refused (409) if it was ever booked
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       409: { description: Used by appointments }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, authorize('admin'), validateId(), validate(rules.service, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

module.exports = router;
