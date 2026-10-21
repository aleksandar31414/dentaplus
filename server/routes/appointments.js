const router = require('express').Router();
const ctrl = require('../controllers/appointments');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Appointments
 *     description: Online booking – patients book, the clinic confirms and completes
 */

/**
 * @openapi
 * /appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Appointments (patients see their own, admins all)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pending, confirmed, completed, cancelled] } }
 *       - { in: query, name: when, schema: { type: string, enum: [upcoming, past] } }
 *       - { in: query, name: date, schema: { type: string, format: date }, description: One day (calendar) }
 *       - { in: query, name: dentist, schema: { type: string } }
 *       - { in: query, name: patient, schema: { type: string }, description: admin only }
 *       - { in: query, name: mine, schema: { type: boolean } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200: { description: Paginated appointments }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Appointments]
 *     summary: Book a free slot (status pending)
 *     description: "Rules: free slot of the dentist, at least 1 h and at most 90 days ahead, not on a public holiday, max 3 active appointments per patient, no overlap with own appointments. The patient and the admins get an e-mail."
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/AppointmentInput' } } }
 *     responses:
 *       201: { description: Booked, content: { application/json: { schema: { $ref: '#/components/schemas/Appointment' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Slot already taken }
 */
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, validate(rules.appointment), ctrl.create);

/**
 * @openapi
 * /appointments/export.csv:
 *   get:
 *     tags: [Appointments]
 *     summary: Download appointments as a CSV report (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: date, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: CSV file, content: { text/csv: { schema: { type: string } } } }
 */
router.get('/export.csv', authenticate, authorize('admin'), ctrl.exportCsv);

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: One appointment (owner or admin) with its dental record entries
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Appointment }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Appointments]
 *     summary: Delete an appointment (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 * /appointments/{id}/cancel:
 *   put:
 *     tags: [Appointments]
 *     summary: Cancel (patient until 24 h before, admin always)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { reason: { type: string } } } } }
 *     responses:
 *       200: { description: Cancelled }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /appointments/{id}/status:
 *   put:
 *     tags: [Appointments]
 *     summary: Confirm / complete / cancel (admin)
 *     description: Completing can add entries to the patient's dental record. The patient gets an e-mail.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [confirmed, completed, cancelled] }
 *               reason: { type: string }
 *               records: { type: array, items: { $ref: '#/components/schemas/RecordInput' } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/:id', authenticate, validateId(), ctrl.getOne);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);
router.put('/:id/cancel', authenticate, validateId(), validate(rules.cancel), ctrl.cancel);
router.put('/:id/status', authenticate, authorize('admin'), validateId(), validate(rules.status), ctrl.setStatus);

module.exports = router;
