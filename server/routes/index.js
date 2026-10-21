const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/dentists', require('./dentists'));
router.use('/services', require('./services'));
router.use('/appointments', require('./appointments'));
router.use('/reviews', require('./reviews'));
router.use('/records', require('./records'));
router.use('/', require('./misc'));

module.exports = router;
