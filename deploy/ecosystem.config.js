// PM2 process file for DRISHTI AI on the VPS: the Node API and the ML worker.
// The worker only makes outbound connections (MongoDB Atlas, Cloudinary), so it
// needs no port; it polls the job queue and writes results straight back.
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
    {
      // Set up by deploy/setup-ml.sh (virtualenv, ONNX models, ml-backend/.env).
      name: 'drishti-ml',
      cwd: '/var/www/drishti-ai/ml-backend',
      script: 'services/worker.py',
      interpreter: '/opt/drishti-ml-venv/bin/python',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1200M',
      exp_backoff_restart_delay: 5000,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};
