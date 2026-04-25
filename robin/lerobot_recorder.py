import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import rclpy
from rclpy.node import Node
from rosidl_runtime_py.convert import message_to_ordereddict
from rosidl_runtime_py.utilities import get_message
from std_msgs.msg import String


class LeRobotTopicRecorder(Node):
    def __init__(self) -> None:
        super().__init__("lerobot_topic_recorder")

        self.declare_parameter("topic_name", "/joint_states")
        self.declare_parameter("message_type", "")
        self.declare_parameter("control_topic_name", "/lerobot_recorder/config")
        self.declare_parameter("output_dir", "./lerobot_dataset")
        self.declare_parameter("task_name", "ros2_topic_capture")
        self.declare_parameter("episode_index", 0)
        self.declare_parameter("episode_file_name", "")

        self.initial_topic_name = (
            self.get_parameter("topic_name").get_parameter_value().string_value
        )
        self.initial_message_type_hint = (
            self.get_parameter("message_type").get_parameter_value().string_value
        )
        self.control_topic_name = (
            self.get_parameter("control_topic_name").get_parameter_value().string_value
        )
        self.output_dir = Path(
            self.get_parameter("output_dir").get_parameter_value().string_value
        )
        self.task_name = self.get_parameter("task_name").get_parameter_value().string_value
        self.episode_index = (
            self.get_parameter("episode_index").get_parameter_value().integer_value
        )
        self.episode_file_name = (
            self.get_parameter("episode_file_name").get_parameter_value().string_value
        )

        self.task_index = 0
        self.sample_count = 0
        self._topic_subscriptions: Dict[str, Any] = {}
        self.desired_topics: Set[str] = {self.initial_topic_name}
        self.topic_type_hints: Dict[str, str] = {}
        if self.initial_message_type_hint:
            self.topic_type_hints[self.initial_topic_name] = self.initial_message_type_hint

        self.config_subscription = self.create_subscription(
            String,
            self.control_topic_name,
            self._on_config,
            10,
        )

        self.parquet_writer: Optional[pq.ParquetWriter] = None
        self.episode_file_path: Optional[Path] = None

        self._prepare_output_structure(self.output_dir)
        self._write_static_meta_files(self.output_dir)

        self.create_timer(1.0, self._sync_subscriptions)
        self.get_logger().info(
            "Recorder ready: "
            f"topics={sorted(self.desired_topics)}, output_dir={self.output_dir}, "
            f"control_topic={self.control_topic_name}"
        )

    def _prepare_output_structure(self, output_dir: Path) -> None:
        self.meta_dir = output_dir / "meta"
        self.data_dir = output_dir / "data" / "chunk-000"
        self.meta_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _write_static_meta_files(self, output_dir: Path) -> None:
        info = {
            "format": "lerobot",
            "dataset_version": "v2",
            "task": self.task_name,
            "source": "ros2_topic_recorder",
            "topic_names": sorted(self.desired_topics),
            "control_topic": self.control_topic_name,
        }
        ((output_dir / "meta") / "info.json").write_text(
            json.dumps(info, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        tasks = [{"task_index": self.task_index, "task": self.task_name}]
        with ((output_dir / "meta") / "tasks.jsonl").open("w", encoding="utf-8") as tasks_file:
            for item in tasks:
                tasks_file.write(json.dumps(item, ensure_ascii=False) + "\n")

    def _resolve_topic_type(self, topic_name: str) -> Optional[str]:
        topic_type_hint = self.topic_type_hints.get(topic_name)
        if topic_type_hint:
            return topic_type_hint

        topics = dict(self.get_topic_names_and_types())
        message_types = topics.get(topic_name)
        if not message_types:
            return None

        return message_types[0]

    def _normalize_episode_file_name(self, file_name: str) -> str:
        candidate = file_name.strip()
        if not candidate:
            return f"episode_{int(self.episode_index):06d}.parquet"
        if not candidate.endswith(".parquet"):
            return f"{candidate}.parquet"
        return candidate

    def _create_writer(self) -> None:
        if self.parquet_writer is not None:
            return

        file_name = self._normalize_episode_file_name(self.episode_file_name)
        self.episode_file_path = self.data_dir / file_name

        schema = pa.schema(
            [
                pa.field("episode_index", pa.int64()),
                pa.field("frame_index", pa.int64()),
                pa.field("timestamp_ns", pa.int64()),
                pa.field("task_index", pa.int64()),
                pa.field("topic", pa.string()),
                pa.field("message", pa.string()),
            ]
        )
        self.parquet_writer = pq.ParquetWriter(str(self.episode_file_path), schema=schema)

    def _sync_subscriptions(self) -> None:
        removable_topics = set(self._topic_subscriptions.keys()) - self.desired_topics
        for topic_name in removable_topics:
            self.destroy_subscription(self._topic_subscriptions[topic_name])
            del self._topic_subscriptions[topic_name]
            self.get_logger().info(f"Unsubscribed: {topic_name}")

        addable_topics = self.desired_topics - set(self._topic_subscriptions.keys())
        for topic_name in sorted(addable_topics):
            topic_type = self._resolve_topic_type(topic_name)
            if topic_type is None:
                continue

            msg_class = get_message(topic_type)
            self._topic_subscriptions[topic_name] = self.create_subscription(
                msg_class,
                topic_name,
                lambda msg, t=topic_name: self._on_message(msg, t),
                10,
            )
            self.get_logger().info(f"Subscribed: topic={topic_name}, type={topic_type}")

    def _parse_topic_list(self, text: str) -> List[str]:
        normalized = text.replace("\n", ",")
        raw_topics = [item.strip() for item in normalized.split(",")]
        topics = [topic for topic in raw_topics if topic]
        unique_topics: List[str] = []
        seen: Set[str] = set()
        for topic in topics:
            if topic in seen:
                continue
            seen.add(topic)
            unique_topics.append(topic)
        return unique_topics

    def _rotate_writer_if_needed(self) -> None:
        if self.parquet_writer is not None:
            self.parquet_writer.close()
            self.parquet_writer = None
            self._write_episode_meta()

        self.sample_count = 0
        self.episode_file_path = None

    def _apply_output_dir(self, output_dir_text: str) -> None:
        next_output_dir = Path(output_dir_text).expanduser().resolve()
        if next_output_dir == self.output_dir:
            return

        self._rotate_writer_if_needed()
        self.output_dir = next_output_dir
        self._prepare_output_structure(self.output_dir)
        self._write_static_meta_files(self.output_dir)
        self.get_logger().info(f"Switched output_dir: {self.output_dir}")

    def _on_config(self, msg: String) -> None:
        raw_text = msg.data.strip()
        if not raw_text:
            self.get_logger().warning("Ignore empty config message")
            return

        parsed_json: Optional[Any] = None
        try:
            parsed_json = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed_json = None

        if isinstance(parsed_json, dict):
            topics_data = parsed_json.get("topics", [])
            if isinstance(topics_data, list):
                topics = [str(item).strip() for item in topics_data if str(item).strip()]
            else:
                topics = self._parse_topic_list(str(topics_data))

            output_dir_data = parsed_json.get("output_dir")
            if isinstance(output_dir_data, str) and output_dir_data.strip():
                self._apply_output_dir(output_dir_data)

            task_name_data = parsed_json.get("task_name")
            if isinstance(task_name_data, str) and task_name_data.strip():
                self.task_name = task_name_data.strip()

            episode_index_data = parsed_json.get("episode_index")
            if episode_index_data is not None:
                self.episode_index = int(episode_index_data)
                self._rotate_writer_if_needed()

            episode_file_name_data = parsed_json.get("episode_file_name")
            if isinstance(episode_file_name_data, str):
                self.episode_file_name = episode_file_name_data.strip()
                self._rotate_writer_if_needed()

            message_types_data = parsed_json.get("message_types")
            if isinstance(message_types_data, dict):
                for topic_name, message_type in message_types_data.items():
                    topic_name_str = str(topic_name).strip()
                    message_type_str = str(message_type).strip()
                    if topic_name_str and message_type_str:
                        self.topic_type_hints[topic_name_str] = message_type_str

            if topics:
                self.desired_topics = set(topics)
                self._write_static_meta_files(self.output_dir)
                self.get_logger().info(
                    f"Updated topics from config: {sorted(self.desired_topics)}"
                )
            self._sync_subscriptions()
            return

        if isinstance(parsed_json, list):
            topics = [str(item).strip() for item in parsed_json if str(item).strip()]
            if topics:
                self.desired_topics = set(topics)
                self._write_static_meta_files(self.output_dir)
                self._sync_subscriptions()
                self.get_logger().info(
                    f"Updated topics from list config: {sorted(self.desired_topics)}"
                )
            return

        topics = self._parse_topic_list(raw_text)
        if not topics:
            self.get_logger().warning("Config message has no topic names")
            return

        self.desired_topics = set(topics)
        self._write_static_meta_files(self.output_dir)
        self._sync_subscriptions()
        self.get_logger().info(
            f"Updated topics from text config: {sorted(self.desired_topics)}"
        )

    def _serialize_message(self, msg: Any) -> Dict[str, Any]:
        message_dict = message_to_ordereddict(msg)
        return json.loads(json.dumps(message_dict, default=str))

    def _on_message(self, msg: Any, topic_name: str) -> None:
        self._create_writer()
        if self.parquet_writer is None:
            return

        now_ns = self.get_clock().now().nanoseconds
        payload = {
            "episode_index": int(self.episode_index),
            "frame_index": self.sample_count,
            "timestamp_ns": now_ns,
            "task_index": self.task_index,
            "topic": topic_name,
            "message": json.dumps(self._serialize_message(msg), ensure_ascii=False),
        }

        table = pa.Table.from_pandas(pd.DataFrame([payload]), preserve_index=False)
        self.parquet_writer.write_table(table)
        self.sample_count += 1

        if self.sample_count % 100 == 0:
            self.get_logger().info(f"Recorded samples: {self.sample_count}")

    def _write_episode_meta(self) -> None:
        if self.episode_file_path is None:
            return

        episode_record = {
            "episode_index": int(self.episode_index),
            "tasks": [self.task_index],
            "length": self.sample_count,
            "parquet_path": (
                str(self.episode_file_path.relative_to(self.output_dir))
                if self.episode_file_path is not None
                else ""
            ),
            "topics": sorted(self.desired_topics),
        }
        with (self.meta_dir / "episodes.jsonl").open("a", encoding="utf-8") as file:
            file.write(json.dumps(episode_record, ensure_ascii=False) + "\n")

    def destroy_node(self) -> bool:
        self._rotate_writer_if_needed()
        return super().destroy_node()


def main(args=None) -> None:
    rclpy.init(args=args)
    node = LeRobotTopicRecorder()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()