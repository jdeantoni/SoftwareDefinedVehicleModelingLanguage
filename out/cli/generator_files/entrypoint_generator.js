export function generateEntrypoint(pkgName, loggerLevel) {
    return `
#!/bin/bash

LOG_DIR="/ros2_ws/.ros/log"
BACKUP_DIR="/ros_logs_backup"

# Function to save logs
function save_logs {
    echo "Saving ROS2 logs to disk..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$LOG_DIR"/* "$BACKUP_DIR"/
    echo "Logs saved to $BACKUP_DIR."
}

# Set trap to call save_logs on exit
trap save_logs EXIT

# Run ROS2 node
echo "Starting ROS2 node..."
source /opt/ros/jazzy/setup.sh
source /ros2_ws/install/setup.sh

echo "Running entrypoint script..."
ros2 launch ${pkgName} ${pkgName}_launch.py
`.trim();
}
//# sourceMappingURL=entrypoint_generator.js.map