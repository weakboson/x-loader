import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// 設定ファイルを読み込む
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ディレクトリを作成する関数
const createDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

(async () => {
  // Puppeteerを起動
  const browser = await puppeteer.launch({ headless: false }); // 動作確認のためheadless: falseにしています
  const page = await browser.newPage();

  // 認証クッキーを設定
  const cookies = config.cookie.split(';').map(pair => {
    const name = pair.trim().slice(0, pair.trim().indexOf('='));
    const value = pair.trim().slice(pair.trim().indexOf('=') + 1);
    return { name, value, domain: '.x.com' };
  });
  await page.setCookie(...cookies);

  // ブックマークページに移動
  await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });

  console.log('ブックマークページに移動しました。');

  // ポストの情報を格納する配列
  const posts = [];

  // 指定した数のポストを取得
  while (posts.length < config.post_count) {
    // ページ上のポストを取得
    const articles = await page.$$('article[data-testid="tweet"]');

    for (const article of articles) {
      if (posts.length >= config.post_count) {
        break;
      }

      try {
        // ポストのIDを取得
        const postLink = await article.$('a[href*="/status/"]');
        const href = await page.evaluate(a => a.href, postLink);
        const postId = href.split('/').pop();

        // ユーザー名を取得
        const userElement = await article.$('div[data-testid="User-Name"] a');
        const userName = await page.evaluate(a => a.textContent, userElement);

        // 画像を取得
        const images = await article.$$('div[data-testid="tweetPhoto"] img');
        if (images.length > 0) {
          const imageUrls = [];
          for (const img of images) {
            const src = await page.evaluate(i => i.src, img);
            imageUrls.push(src.replace(/name=\w+$/, 'name=orig')); // オリジナル画像
          }

          posts.push({
            postId,
            userName,
            imageUrls,
            articleElement: article // ブックマーク削除のために要素を保持
          });
        }
      } catch (error) {
        // console.error('ポストの解析中にエラーが発生しました:', error);
      }
    }

    // ページをスクロールして新しいポストを読み込む
    await page.evaluate('window.scrollBy(0, window.innerHeight)');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 読み込み待ち
  }

  console.log(`${posts.length}件の画像付きポストを取得しました。`);

  // 画像をダウンロード
  for (const post of posts) {
    const userDirectory = path.join(config.download_directory, post.userName);
    createDirectory(userDirectory);

    for (let i = 0; i < post.imageUrls.length; i++) {
      const imageUrl = post.imageUrls[i];
      const fileName = `${post.postId}_${i + 1}.jpg`;
      const filePath = path.join(userDirectory, fileName);

      try {
        const imagePage = await browser.newPage();
        const response = await imagePage.goto(imageUrl);
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);
        console.log(`画像を保存しました: ${filePath}`);
        await imagePage.close();
      } catch (error) {
        console.error(`画像のダウンロード中にエラーが発生しました: ${imageUrl}`, error);
      }
    }

    // ブックマークを削除
    // try {
    //     const bookmarkButton = await post.articleElement.$('button[data-testid="removeBookmark"]');
    //     if (bookmarkButton) {
    //         await bookmarkButton.click();
    //         console.log(`ポストID ${post.postId} のブックマークを削除しました。`);
    //         await new Promise(resolve => setTimeout(resolve, 500)); // 削除処理の待ち時間
    //     } else {
    //         console.log(`ポストID ${post.postId} のブックマーク削除ボタンが見つかりませんでした。`);
    //     }
    // } catch (error) {
    //     console.error(`ブックマークの削除中にエラーが発生しました: ${post.postId}`, error);
    // }
  }

  await browser.close();
})();
