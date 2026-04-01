module.exports = {
  apps: [
    {
      name: "wa-ai-control-center",
      cwd: "/var/www/jaka-ai-wa",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      env: {
        NODE_ENV: "production",
        PORT: "3010"
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true
    }
  ]
};
