<p align="center">
  <img
    height="300"
    alt="Robin Logo"
    src="client/public/icon.svg"/>
</p>

# Robin

[PyLoT Robotics](https://pylot.kaijo-physics.club)で制作しているロボットのデバッグ用コントローラーです。

# セットアップ
このREADMEを内包しているフォルダで、
```bash
sh gists/setup.sh
```
を実行すればあとは指示に従えばいいです

# 証明書のインストール
スマホに証明書をインストールしなければパソコンで起動したclientにアクセスした際にブラウザに警告が表示されます。
```bash
sh gist/setup.sh
```
で最後に「rootCAを表示しますか？」と聞かれるのでyを入力してファイルアプリでrootCAを表示します
適当な方法でrootCA.pem(⚠rootCA-key.pemではない)をスマホに送ります。
## iPhoneの場合
https://zenn.dev/takumiabe21/articles/645a38c0c18389 の「○iPhoneのSafariからHTTPS接続する。」以降を参考にインストールしてください。
## Androidの場合
また今度書きます、、

# 起動する
Topicの送受信に必要なRosbrdige_serverの起動
```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```
クライアントの起動
```bash
colcon build
source install/setup.bash
ros2 run robin client
```
(2秒以内くらいにQRコードがでれば成功です、でなければ何かがうまく行ってないので`sh gist/setup.sh`をしてください)
映像送信用のVideo_publisherの起動
```bash
source install/setup.bash
ros2 run robin video_publisher
```