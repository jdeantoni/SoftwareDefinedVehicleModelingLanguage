import { camelCaseToSnakeCase } from '../cli-util.js';
export function generateLaunchFile(pkgName, components, loggerLevel) {
    // Build nodes array with forEach
    let nodesString = '';
    components.forEach((node) => {
        nodesString += `
        Node(
            package='${pkgName}',
            executable='${camelCaseToSnakeCase(node.name)}',
            name='${node.name}Node',
            output='screen',
            arguments=['--ros-args', '--log-level', '${loggerLevel.toUpperCase()}'],
        ),`;
    });
    return `
from launch import LaunchDescription
from launch.actions import LogInfo
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([${nodesString}
        LogInfo(
            condition=None,
            msg="Launch file executed successfully!"
        )
    ])
`.trim();
}
//# sourceMappingURL=launch_generation.js.map