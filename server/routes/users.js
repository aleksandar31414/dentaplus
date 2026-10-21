const router = require('express').Router();
const ctrl = require('../controllers/users');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management (admin)
 */

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin)
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Users, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/User' } } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authenticate, authorize('admin'), ctrl.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: User, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Users]
 *     summary: Update profile (own) or role (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               emailNotifications: { type: boolean }
 *               role: { type: string, enum: [user, admin], description: admin only }
 *     responses:
 *       200: { description: Updated user, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user with their appointments, reviews and dental record (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, validateId(), ctrl.getOne);
router.put('/:id', authenticate, validateId(), validate(rules.userUpdate, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

module.exports = router;
