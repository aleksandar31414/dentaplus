const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

/**
 * JSDoc (@openapi comments in routes/ and models/) -> swagger-jsdoc -> OpenAPI spec
 * -> served at /api/swagger.json and rendered by swagger-ui-express at /api/docs/
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'DentaPlus REST API',
    version: '1.0.0',
    description:
      'REST API of DentaPlus – dental clinic with online appointment booking.\n\n' +
      '**Test accounts** (after seeding on `/db`): `admin@dentaplus.mk / Admin1234` (admin), `marija@dentaplus.mk / Pacient123` (patient).\n\n' +
      'Use **POST /auth/login**, copy the `token` and press **Authorize**.',
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      id: { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId' },
      page: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
      limit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Податоците не се валидни' },
          errors: { type: 'object', additionalProperties: { type: 'string' }, example: { email: 'невалидна е-пошта' } },
        },
      },
      Page: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          pages: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
    },
    responses: {
      ValidationError: { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Missing / invalid JWT or wrong credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Insufficient role / not the owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Document not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
};

const spec = swaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '../routes/*.js'), path.join(__dirname, '../models/*.js')],
});

module.exports = spec;
