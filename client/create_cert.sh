#!/usr/bin/env sh

mkdir -p certs

# OSごとにローカルIPを取得
OS_NAME=$(uname -s)
if [ "$OS_NAME" = "Darwin" ]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0)
elif [ "$OS_NAME" = "Linux" ]; then
    # Ubuntu/Linux
    LOCAL_IP=$(ip -4 route get 1.1.1.1 | awk '{print $7; exit}')
else
    echo "Unsupported OS: $OS_NAME"
    exit 1
fi

mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem localhost 127.0.0.1 ::1 "$LOCAL_IP"