// PM2 configuration for VPS deployment
module.exports = {
  apps: [
    {
      name: 'cruizapp',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
