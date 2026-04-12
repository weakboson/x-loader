#!/bin/bash
set -euo pipefail

IMAGES_DIR=$(node -e "console.log(require('./config.json').download_directory)")
echo "クリーンアップ開始: $IMAGES_DIR"
find "$IMAGES_DIR" -mindepth 1 -maxdepth 1 ! -name '.keep' -exec rm -rf {} +
echo "クリーンアップ完了: $IMAGES_DIR"
