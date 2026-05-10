#!/usr/bin/env bash
# Build the SYNKRON file integrity hasher (C program)
# Run: bash scripts/build_hasher.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/hasher"

echo "Building SYNKRON hasher..."

# Try standard Linux build first
if gcc -O2 -o "$OUT" "$SCRIPT_DIR/hasher.c" -lssl -lcrypto 2>/dev/null; then
    echo "✓ Built with system OpenSSL → $OUT"
    exit 0
fi

# macOS with Homebrew OpenSSL
if [ -d /opt/homebrew/opt/openssl ]; then
    OSSL=/opt/homebrew/opt/openssl
    if gcc -O2 -o "$OUT" "$SCRIPT_DIR/hasher.c" \
        -I"$OSSL/include" -L"$OSSL/lib" -lssl -lcrypto 2>/dev/null; then
        echo "✓ Built with Homebrew OpenSSL (arm64) → $OUT"
        exit 0
    fi
fi

if [ -d /usr/local/opt/openssl ]; then
    OSSL=/usr/local/opt/openssl
    if gcc -O2 -o "$OUT" "$SCRIPT_DIR/hasher.c" \
        -I"$OSSL/include" -L"$OSSL/lib" -lssl -lcrypto 2>/dev/null; then
        echo "✓ Built with Homebrew OpenSSL (x86) → $OUT"
        exit 0
    fi
fi

echo "⚠ Could not build hasher (OpenSSL not found). The API will use Python fallback."
exit 0
