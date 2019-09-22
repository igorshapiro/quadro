const redis = require('redis')
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

function getRedisConfig(config) {
  const redisConfig = config.get('quadro.redis', {})
  if (typeof redisConfig === 'string') return JSON.parse(redisConfig)
}

module.exports = async function(config, log) {
  const redisConfig = getRedisConfig(config)
  log.debug('Connecting to redis')
  const client = redis.createClient(redisConfig)
  client.on('error', (err) => log.error({ err }, 'REDIS ERROR'))
  await new Promise(function(resolve, _reject) {
    client.on('ready', function() {
      log.debug('Connected to Redis')
      resolve(client)
    })
  })
  return client
}
