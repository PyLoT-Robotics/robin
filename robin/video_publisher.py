import asyncio
import json
import logging
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, VideoStreamTrack
from aiohttp import web
import aiohttp_cors
import cv2
from av import VideoFrame
import numpy as np
import time

IMAGE_SUBSCRIBE_TOPIC_NAME = "/camera/camera/color/image_raw"

def runServer(on_shutdown, offer):
    async def start_server():
        app = web.Application()
        app.on_shutdown.append(on_shutdown)
        app.router.add_post("/offer", offer)

        cors = aiohttp_cors.setup(
            app,
            defaults={
                "*": aiohttp_cors.ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*"
                )
            }
        )
        for route in list(app.router.routes()):
            cors.add(route)

        runner = web.AppRunner(app)
        await runner.setup()

        site = web.TCPSite(runner, host="0.0.0.0", port=8080)
        await site.start()

        print("Server started at http://0.0.0.0:8080")
        # keep it running
        while True:
            await asyncio.sleep(3600)

    def thread_target():
        asyncio.run(start_server())

    threading.Thread(target=thread_target, daemon=True).start()


logging.basicConfig(level=logging.INFO)
pcs = set()

width = 640
height = 480
frame = np.zeros((height, width, 3), np.uint8) #初期の画像

class OpenCVCameraStreamTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        global frame

        pts, time_base = await self.next_timestamp()

        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = pts
        video_frame.time_base = time_base

        await asyncio.sleep(1 / 30)  # 30fps程度に制限
        return video_frame


async def offer(request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=[]))
    pcs.add(pc)

    pc.addTrack(OpenCVCameraStreamTrack())

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        ),
    )


async def on_shutdown(app):
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()

###

from rclpy.node import Node
from sensor_msgs.msg import Image
import rclpy
from cv_bridge import CvBridge
import threading

class Client(Node):
    def __init__(self):
        super().__init__("client")

        self.image_subscriber = self.create_subscription(
            Image, IMAGE_SUBSCRIBE_TOPIC_NAME, self.update_latest_frame, 10
        )

        self.bridge = CvBridge()
        self.logger = logging.getLogger("Client")

        self.logger.info("Video Publisher Node Initialized")
        threading.Thread(target=runServer, args=(on_shutdown, offer), daemon=True).start()

    def update_latest_frame(self, msg):
        global frame
        self.logger.info("Received image")
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding="rgb8")

def main(args=None):
    rclpy.init(args=args)

    client = Client()
    rclpy.spin(client)

    client.destroy_node()
    rclpy.shutdown()


if __name__ == "__main__":
    main()