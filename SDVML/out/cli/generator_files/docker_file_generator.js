export function generateDockerfile(pkgName, rosVersion = 'jazzy') {
    return `
FROM ros:${rosVersion}

RUN apt-get update && apt-get install -y \\
    python3-colcon-common-extensions \\
    python3-pip \\
    build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /ros2_ws

# Create logs dir
RUN mkdir -p /ros2_ws/.ros/log

# Copy ${pkgName} package
COPY . /ros2_ws/src/${pkgName}

# Install dependencies
RUN . /opt/ros/jazzy/setup.sh && colcon build --merge-install

# New entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
`.trim();
}
export function generateDockerComposePart(pkgName) {
    return `
services:
  ${pkgName}:
    image: ${pkgName}
    build:
      context: ./ros2/src/${pkgName}
      dockerfile: Dockerfile
    container_name: ${pkgName}
    environment:
      - RCUTILS_LOGGING_USE_STDERR=0 # Logs STDERR
      - RCUTILS_LOGGING_USE_STDOUT=0 # Logs STDOUT
      - RCUTILS_LOGGING_IMPLEMENTATION=rcutils_logging_file
      - ROS_HOME=/ros2_ws/.ros
    volumes:
      - ./ros2/src/${pkgName}/Logs:/ros_logs_backup
    tmpfs:
      - /ros2_ws/.ros/log # To RAM
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 200M
        reservations:
          cpus: "1"
          memory: 200M
`.trim();
}
//# sourceMappingURL=docker_file_generator.js.map