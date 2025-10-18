# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

x-loaderは、X.com（Twitter）のブックマークからフルサイズ画像をダウンロードするPuppeteerベースのツールです。Cookie認証を使用し、ユーザー名ごとに整理して画像をダウンロードし、ダウンロード成功後にブックマークを削除します。

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# アプリケーションの実行
node index.js
```

注意: テスト、lint、ビルドスクリプトは設定されていません。プロジェクトはNode.jsで直接実行されます。

## 設定ファイル

アプリケーションの実行には、ルートディレクトリに以下の構造の `config.json` ファイルが必要です:

```json
{
  "download_directory": "./images",
  "post_count": 100,
  "cookie": "auth_token=YOUR_X_AUTH_TOKEN"
}
```

- `download_directory`: ダウンロード画像の保存先ベースディレクトリ
- `post_count`: 処理する最大ポスト数
- `cookie`: X.com認証クッキー（auth_token）

**重要**: `config.json` は.gitignoreに含まれており、有効なX.com認証情報で手動作成する必要があります。

## アーキテクチャ

アプリケーションは単一ファイルのスクリプト（[index.js](index.js)）で、以下の処理を実行します:

1. **認証**: configからX.comのクッキーを設定してセッションを認証
2. **ナビゲーション**: ユーザーのブックマークページ `https://x.com/i/bookmarks` を開く
3. **ポスト処理ループ**:
   - `article[data-testid="tweet"]` を使用して画像付きポストを検索
   - ステータスリンクからポストIDを抽出
   - User-Name要素からユーザー名を抽出
   - `div[data-testid="tweetPhoto"] img` で画像要素を検索
4. **画像ダウンロード**:
   - オリジナル画質を取得するため画像URLを修正（`name=orig` パラメータ）
   - ダウンロードディレクトリ配下にユーザー別サブディレクトリを作成
   - ファイル名パターン `{postId}_{imageNumber}.jpg` で画像を保存
5. **ブックマーク削除**: ダウンロード成功後にブックマーク削除ボタンをクリック
6. **ページネーション**: `post_count` に達するまでページをスクロールして追加のブックマークを読み込み

## 主な実装詳細

### 画像品質
画像は `name` クエリパラメータを置換してオリジナル解像度でダウンロードされます:
```javascript
imageUrls.push(src.replace(/name=\w+$/, 'name=orig'));
```

### ディレクトリ構造
ダウンロードされた画像は以下のように整理されます:
```
images/
  └── @username/
      ├── postId1_1.jpg
      ├── postId1_2.jpg
      └── postId2_1.jpg
```

### タイミングと同期
- ブックマーク削除後、DOM更新を待つため500msの遅延
- スクロール後、コンテンツ読み込みを待つため2秒の遅延
- 初回ページ読み込みで `networkidle2` 待機条件を使用

### エラーハンドリング
スクリプトは以下の処理にtry-catchブロックを使用:
- 個別の画像ダウンロード失敗（エラーをログ出力して処理継続）
- ブックマーク削除失敗（エラーをログ出力して処理継続）
- ポスト解析エラー（サイレントにスキップ - 104行目参照）

### ブックマーク削除の動作
現在の実装では、各ポストの処理直後（スクロール前）にブックマークを削除します。これにより、ページスクロール時にDOM要素がスコープ外になる問題を防ぎます。

## 既知の制約

- バックグラウンド動作のためヘッドレスモードが有効（`headless: true`）
- 画像付きポストのみ処理（テキストのみのポストはスキップ）
- ブックマークへのアクセスには有効なX.com認証クッキーが必要
- 順次処理: 各画像ダウンロードごとに新しいページを開く
