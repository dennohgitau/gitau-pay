module.exports = {
  apps: [{
    name: 'gitau-pay-backend',
    script: 'backend/main.py',
    interpreter: 'python3',
    cwd: '/home/ubuntu/pesapal-aws',
    env_file: '/home/ubuntu/pesapal-aws/backend/.env',
    env: {
      PORT: 8000,
      NODE_ENV: 'production',
      PYTHONUNBUFFERED: '1'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/home/ubuntu/pesapal-aws/logs/backend-error.log',
    out_file: '/home/ubuntu/pesapal-aws/logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
