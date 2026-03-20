import rclpy
import subprocess
from rclpy.node import Node
from ament_index_python.packages import get_package_share_directory
import os

# ROSパッケージ名を取得
package_name = "robin"
package_dir = get_package_share_directory(package_name)

client_dir = os.path.normpath(os.path.join(package_dir, "../../../../", "src", "robin", "client"))

class Client(Node):
  def __init__(self):
    super().__init__('client')
    print("Client Node Initialized")
    process = subprocess.Popen(
      ["bun", "run", "dev"],
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      cwd=client_dir,
      text=True
    )
    try:
      for line in process.stdout:
        print(line, end="")
    except KeyboardInterrupt:
      process.terminate()
      print("\nProcess terminated.")

def main(args=None):
  rclpy.init(args=args)
  
  client = Client()
  rclpy.spin(client)
  
  client.destroy_node()
  rclpy.shutdown()

if __name__ == '__main__':
  main()