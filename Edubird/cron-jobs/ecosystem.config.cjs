module.exports = {
  apps: [
    {
      name: "edubird-cron-jobs",
      script: "src/worker.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      kill_timeout: 10000,
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
