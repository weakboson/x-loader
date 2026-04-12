#!/bin/bash
set -euo pipefail

# ステップ1: config.json の検証
if [ ! -f config.json ]; then
  echo "エラー: config.json が見つかりません" >&2
  exit 1
fi

node -e "
  const c = require('./config.json');
  if (!c.download_directory) throw new Error('download_directory が未設定');
  if (!c.post_count) throw new Error('post_count が未設定');
  if (!c.cookie || !c.cookie.includes('auth_token=')) throw new Error('cookie が不正');
  const fs = require('fs');
  if (!fs.existsSync(c.download_directory)) {
    fs.mkdirSync(c.download_directory, { recursive: true });
    console.log('ダウンロードディレクトリを作成しました: ' + c.download_directory);
  }
"
echo "設定確認OK"

# ステップ2: 0件になるまでループ実行
echo "ダウンロード開始..."
while true; do
  OUTPUT=$(node index.js 2>&1)
  echo "$OUTPUT"
  if echo "$OUTPUT" | grep -q "^0件の画像付きポストを処理しました。"; then
    echo "新規ダウンロードなし。ループ終了。"
    break
  fi
done

# ステップ3: zip 圧縮
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="x-images-${TIMESTAMP}.zip"
echo "zip 圧縮中: ${ZIP_NAME}"
IMAGES_DIR=$(node -e "console.log(require('./config.json').download_directory)")
zip -r "${ZIP_NAME}" "${IMAGES_DIR}"
echo "zip 作成完了: ${ZIP_NAME}"

# ステップ4: クリーンアップ
bash clean-up-images-dir.sh
