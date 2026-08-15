/**
 * PM2 for production. Session lives in MySQL — Redis is not required.
 * Keep one instance unless the box has spare CPU; certificate PDF cache is on disk.
 *
 * Usage (on the server):
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "conference_manager",
      cwd: "/var/www/extapps/conference_manager",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3050",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "900M",
      env: {
        NODE_ENV: "production",
        PORT: "3050",
      },
    },
  ],
};
