#!/bin/bash

# コマンド存在確認（出力は捨てる）
if command -v bun >/dev/null 2>&1; then
    BUN_OK=true
else
    BUN_OK=false
fi

if command -v vp >/dev/null 2>&1; then
    VP_OK=true
else
    VP_OK=false
fi

# bun の表示
if [ "$BUN_OK" = true ]; then
    echo "✅ bun is installed: $(bun --version 2>/dev/null)"
else
    echo "❌ bun is not installed"
    echo "Please install bun: https://bun.com/docs/installation"
fi

# vp の表示
if [ "$VP_OK" = true ]; then
    echo "✅ vp is installed"
else
    echo "❌ vp is not installed"
    echo "Please install vp: https://viteplus.dev/guide/"
fi

# 両方がインストールされている場合のみ実行
if [ "$BUN_OK" = true ] && [ "$VP_OK" = true ]; then
    if [ -d "client" ]; then
        if [ -d "client/node_modules" ]; then
            read -r -p "⚠️ client/node_modules が存在します。削除して再インストールしますか？ [Y/n]: " REINSTALL
            if [ -z "$REINSTALL" ]; then
            echo "🗑 Removing client/node_modules..."
            rm -rf client/node_modules
            echo "📦 Running 'bun i' in client..."
            (cd client && bun i)
            else
            case "$REINSTALL" in
                [Yy])
                echo "🗑 Removing client/node_modules..."
                rm -rf client/node_modules
                echo "📦 Running 'bun i' in client..."
                (cd client && bun i)
                ;;
                *)
                echo "⏭ Skipping reinstall."
                ;;
            esac
            fi
        else
            echo "📦 Running 'bun i' in client..."
            (cd client && bun i)
        fi
    else
        echo "❌ client directory not found"
    fi
fi

#TODO:mkcertが入っているかの確認もする
#TODO:ROS bridge serverも入っているか確認する

# client/certs ディレクトリ確認
if [ -d "client/certs" ]; then
    echo "✅ client/certs already exists"
    echo "🗑 Removing existing client/certs..."
    rm -rf client/certs

    if [ -d "client" ]; then
        echo "🔐 Recreating certificates by running 'sh create_cert.sh' in client..."
        (cd client && sh create_cert.sh)
    else
        echo "❌ client directory not found"
    fi
else
    if [ -d "client" ]; then
        echo "🔐 client/certs not found. Running 'sh create_cert.sh' in client..."
        (cd client && sh create_cert.sh)
    else
        echo "❌ client directory not found"
    fi
fi

# rootCA を表示するか確認
if command -v mkcert >/dev/null 2>&1; then
    read -r -p "🔎 rootCA を表示しますか？詳しくはREADMEの「証明書のインストール」を確認してください。[y/N]: " SHOW_ROOTCA
    case "$SHOW_ROOTCA" in
        [Yy])
            echo "📂 Opening mkcert CAROOT..."
            open "$(mkcert -CAROOT)"
            ;;
        *)
            echo "⏭ Skipping rootCA display."
            ;;
    esac
else
    echo "❌ mkcert is not installed"
fi

echo "🎉 Setup complete!"