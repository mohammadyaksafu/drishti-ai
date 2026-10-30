// PM2 process file for the Node API on the VPS.
// The ML worker is deliberately not here: it runs on the local AI machine and
// reaches MongoDB and Cloudinary outbound, exactly as in the Vercel setup.
module.exports = {
  apps: [
    {
      name: 'drishti-api',
      cwd: '/var/www/drishti-ai/backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      // Back off instead of hammering Atlas when the database is unreachable.
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
