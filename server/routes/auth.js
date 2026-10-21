const router = require('express').Router();
const ctrl = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: Registration and login (JWT)
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new patient
 *     description: Creates a user with role `user`, hashes the password (bcryptjs), sends a welcome e-mail (nodemailer) and returns a JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, fullName]
 *             properties:
 *               username: { type: string, example: novo.lice }
 *               email: { type: string, example: novo@dentaplus.mk }
 *               password: { type: string, example: Pacient123 }
 *               fullName: { type: string, example: Novo Lice }
 *               phone: { type: string, example: '+389 70 123 456' }
 *               emailNotifications: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Username or e-mail already exists, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/register', validate(rules.register), ctrl.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@dentaplus.mk }
 *               password: { type: string, example: Admin1234 }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/login', validate(rules.login), ctrl.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Currently logged-in user
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: User, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', authenticate, ctrl.me);

module.exports = router;
