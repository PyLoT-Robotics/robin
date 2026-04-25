cd "$(cd "$(dirname "$0")" && pwd)/../client"
cp "$(mkcert -CAROOT)/rootCA.pem" ./public/rootCA.pem
bun run transfer_rootCA