# A Simple Factorio Server Status Webpage

This is a simple webpage that displays the status of a Factorio server.

It uses the Factorio server's RCON interface to get the server status and exposes it over an HTTP interface.

You must serve the compiled version of the ui folder with a web server.

The backend server must be started and configured with the correct RCON settings.

## Setup

```bash
git clone https://github.com/cinderblock/factorio-stats.git
cd factorio-stats

pushd ui
npm install
npm run build
# Serve the contents of the ui/dist folder with a web server

popd

pushd backend
npm install
cp .env.example .env
# Edit .env to match your server's RCON settings
npm start
```

### Example Nginx Config

```nginx
server {
    listen 80;
    server_name factorio.example.com;

    root /path/to/factorio-stats/ui/dist;

    location / {
        try_files $uri $uri/ /index.html @backend;
    }

    location @backend {
        proxy_pass http://localhost:3000; # Change this to the port the backend server is running on
        proxy_set_header Host factorio.example.com;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
