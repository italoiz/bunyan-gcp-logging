const Bunyan = require('bunyan');
const {createStream} = require('../dist');

const logger = Bunyan.createLogger({
  name: 'mylog',
  level: Bunyan.DEBUG,
  serializers: Bunyan.stdSerializers,
  streams: [createStream(Bunyan.DEBUG)],
});

logger.info('simple log info');

logger.info({ data1: { id: 'sample-id' }, data2: { id: 'simple-id-2' } }, 'sample message');

logger.info(new Error('sample error'));

logger.info({ err: new Error('sample error'), field: 'other field' }, 'sample error message');
