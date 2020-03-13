module.exports = {
  apps: [{
    name: 'awesome-service-api',
    script: 'index.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: '',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      DADATA_API_KEY: '00c3ab4b56af68caa1ea96ef0f2f63fb6d1e0cb1'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      DADATA_API_KEY: '00c3ab4b56af68caa1ea96ef0f2f63fb6d1e0cb1'
    },
  }],
};
