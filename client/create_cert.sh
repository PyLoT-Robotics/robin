mkdir -p certs

# ローカルIPを取得
LOCAL_IP=$(ipconfig getifaddr en0)

mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem localhost 127.0.0.1 ::1 "$LOCAL_IP"