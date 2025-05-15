export function generatePackageXml(pkgName) {
    return `
<package format="3">
  <name>${pkgName}</name>
  <version>0.0.1</version>
  <description>Auto-generated ROS 2 package</description>
  <maintainer email="noreply@example.com">Auto Generator</maintainer>
  <!-- Or other, it's just mandatory -->
  <license>Apache-2.0</license>

  <exec_depend>rclpy</exec_depend>
  <exec_depend>std_msgs</exec_depend>
  <exec_depend>python3</exec_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
`.trim();
}
//# sourceMappingURL=xml_generator.js.map