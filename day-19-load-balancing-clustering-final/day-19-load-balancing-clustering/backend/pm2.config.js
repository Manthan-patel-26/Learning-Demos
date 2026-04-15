/**
 * PM2 Ecosystem File
 * Usage:
 *   npm install -g pm2
 *   npm run build
 *   pm2 start pm2.config.js
 *   pm2 logs          (tail logs)
 *   pm2 monit         (CPU/memory dashboard)
 *   pm2 reload all    (zero-downtime reload)
 *   pm2 stop all
 */
module.exports = {
  apps: [{
    name: "api-server",
    script: "./dist/index.js",

    // Cluster mode: PM2 spawns one process per CPU core.
    // Each process is a full Node.js instance sharing the same port.
    instances: "max",  // "max" = number of CPU cores. Or use a number: 4
    exec_mode: "cluster",

    // Auto-restart on crash
    autorestart: true,
    watch: false,       // Don't watch files in production!
    max_memory_restart: "1G", // Restart if process exceeds 1GB

    // Environment variables
    env: {
      NODE_ENV: "production",
      PORT: 3001,
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3001,
    },

    // Logging
    log_file: "./logs/combined.log",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",

    // Graceful shutdown: wait up to 5000ms for existing requests to finish
    kill_timeout: 5000,
    listen_timeout: 3000,

    // Exponential backoff for restarts
    min_uptime: "10s",
    max_restarts: 10,
  }],
};
