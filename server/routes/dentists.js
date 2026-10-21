const router = require('express').Router();
const ctrl = require('../controllers/dentists');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Dentists
 *     description: Dentists of the clinic and their free appointment slots
 */

/**
 * @openapi
 * /dentists:
 *   get:
 *     tags: [Dentists]
 *     summary: List dentists (with average rating from the reviews)
 *     parameters:
 *       - { in: query, name: specialty, schema: { type: string, enum: [general, orthodontics, surgery, endodontics, pediatric, prosthetics, periodontics] } }
 *       - { in: query, name: day, schema: { type: integer, minimum: 1, maximum: 6 }, description: "Works on this weekday (1 = Monday)" }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: minRating, schema: { type: number } }
 *       - { in: query, name: all, schema: { type: boolean }, description: Include inactive dentists }
 *     responses:
 *       200: { description: Dentists, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Dentist' } } } } }
 *   post:
 *     tags: [Dentists]
 *     summary: Add a dentist (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Dentist' } } }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.dentist), ctrl.create);

/**
 * @openapi
 * /dentists/{id}:
 *   get:
 *     tags: [Dentists]
 *     summary: Dentist details (rating distribution, number of appointments)
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Dentist, content: { application/json: { schema: { $ref: '#/components/schemas/Dentist' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Dentists]
 *     summary: Update a dentist (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Dentist' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Dentists]
 *     summary: Delete a dentist (admin) – refused (409) while there are upcoming appointments
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       409: { description: Has upcoming appointments }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, authorize('admin'), validateId(), validate(rules.dentist, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

/**
 * @openapi
 * /dentists/{id}/slots:
 *   get:
 *     tags: [Dentists]
 *     summary: Free / taken appointment slots of one day for a service
 *     description: "Respects the dentist's working days and hours, existing appointments and public holidays (Nager.Date)."
 *     parameters:
 *       - { $ref: '#/components/parameters/id' }
 *       - { in: query, name: date, required: true, schema: { type: string, format: date, example: '2026-10-27' } }
 *       - { in: query, name: service, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ date, closed, slots: [{ start, end, free }] }" }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id/slots', validateId(), ctrl.slots);

module.exports = router;
