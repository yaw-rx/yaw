#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_DIR="$SCRIPT_DIR/js-framework-benchmark"
FRAMEWORK_DIR="$HARNESS_DIR/frameworks/keyed/yaw"
WEBDRIVER_DIR="$HARNESS_DIR/webdriver-ts"

# Clone harness if not present
if [ ! -d "$HARNESS_DIR" ]; then
    echo "Cloning js-framework-benchmark..."
    git clone https://github.com/krausest/js-framework-benchmark.git "$HARNESS_DIR"
else
    echo "Harness already cloned."
fi

# Install harness dependencies (skip if already done)
if [ ! -d "$HARNESS_DIR/node_modules" ]; then
    echo "Installing harness dependencies..."
    cd "$HARNESS_DIR"
    npm ci
    npm run install-server
else
    echo "Harness dependencies already installed."
fi

# Build webdriver-ts (skip if already done)
if [ ! -d "$WEBDRIVER_DIR/dist" ]; then
    echo "Building webdriver-ts..."
    cd "$WEBDRIVER_DIR"
    npm install
    npx tsc
else
    echo "Webdriver already built."
fi

# Build yaw-bench
echo "Building yaw-bench..."
cd "$SCRIPT_DIR"
npm run build-prod

# Copy built output into harness
echo "Copying yaw into harness..."
rm -rf "$FRAMEWORK_DIR"
mkdir -p "$FRAMEWORK_DIR"
cp "$SCRIPT_DIR/package.json" "$FRAMEWORK_DIR/"
echo '{}' > "$FRAMEWORK_DIR/package-lock.json"
cp -r "$SCRIPT_DIR/dist/"* "$FRAMEWORK_DIR/"

echo ""
echo "=== Setup complete ==="
