# Deployment Guide: Maritime Compliance Platform

This guide covers deploying the Maritime Compliance Platform on a local vessel machine.

## Prerequisites
- Docker and Docker Compose installed
- Bash shell (Linux/macOS)
- Port 80 available on the host machine

## Installation

1. **Clone the repository** onto the vessel hardware.
2. **Navigate to the root directory**:
   ```bash
   cd maritime-compliance
   ```
3. **Run the setup script**:
   ```bash
   sudo ./install/setup.sh
   ```

The script will automatically:
- Generate unique, secure credentials.
- Start the Docker container stack (API, Dashboard, Database, and Discovery).
- Run database migrations to ensure the schema is up to date.

## Accessing the Platform

Once the containers are running, you can access the platform from any device on the local network by opening your browser to:

**[http://maritime.local](http://maritime.local)**

## Troubleshooting

- **If maritime.local is not reachable**: Check if the host supports mDNS (most Linux distributions do by default via Avahi). You can also access the service via the host's IP address: `http://<host-ip-address>`.
- **Containers not starting**: Ensure Docker is running (`systemctl status docker`) and check the logs using:
  ```bash
  docker-compose logs -f
  ```
- **Re-running migrations**: If you update the application, you can run migrations manually:
  ```bash
  docker-compose exec vessel-agent pnpm db:migrate
  ```
