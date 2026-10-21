const router = require('express').Router();
const ctrl = require('../controllers/records');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Dental record
 *     description: Patient's dental chart (treatments per tooth, FDI numbering)
 */

/**
 * @openapi
 * /records:
 *   get:
 *     tags: [Dental record]
 *     summary: Dental record (own for patients, ?patient= for admins)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: patient, schema: { type: string }, description: admin only }
 *     responses:
 *       200: { description: Records, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Record' } } } } }
 *   post:
 *     tags: [Dental record]
 *     summary: Add an entry (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RecordInput'
 *               - type: object
 *                 required: [patient]
 *                 properties: { patient: { type: string } }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 * /records/{id}:
 *   delete:
 *     tags: [Dental record]
 *     summary: Delete an entry (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 */
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.record), ctrl.create);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

module.exports = router;
