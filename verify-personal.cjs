const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('ip-calendar:v2:device-state', JSON.stringify({
      done: [
        '2026-09-25-shared-text:鋼琴課',
        '2026-09-25-grade1-text:帶水壺',
        '2026-09-11-grade1-text:複習「國語課本」P34–P37'
      ],
      extra: {
        '2026-09-25-shared': ['鋼琴課'],
        '2026-09-25-grade1': ['帶水壺']
      },
      supplies: []
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (errors.length) throw new Error(`頁面錯誤：${errors.join('; ')}`);

  const heading = page.locator('.dates td[data-date="2026-09-25"]');
  const headingText = await heading.innerText();
  assert(headingText.trim().startsWith('25'), '日期數字在加入共用項目後遺失');
  assert(headingText.indexOf('共用') >= 0, '共用標籤未顯示');
  assert(headingText.indexOf('共用') < headingText.indexOf('全校'), '共用項目沒有排在全校資訊之前');
  assert(await heading.getByText('鋼琴課', { exact: true }).count() === 1, '共用項目重複或遺失');
  assert(await heading.locator('input[type="checkbox"]').first().isChecked(), '共用項目的舊勾選狀態未保留');

  const childCell = page.locator('td[data-date="2026-09-25"][data-who="grade1"]');
  assert(await childCell.getByText('帶水壺', { exact: true }).count() === 1, '舊版個人代辦未保留');
  assert(await childCell.locator('li:has-text("帶水壺") input').isChecked(), '個人代辦的舊勾選狀態未保留');
  const sep11Tasks = await page.locator('td[data-date="2026-09-11"][data-who="grade1"] li').allInnerTexts();
  for (const task of ['複習「國語課本」P34–P37', '背國語第三課課文 P34–P35', '複習「數學課本」第一單元']) assert(sep11Tasks.includes(task), `弟弟 9/11 聯絡本缺少獨立項目：${task}`);
  assert(await page.locator('td[data-date="2026-09-11"][data-who="grade1"] li:has-text("複習「國語課本」P34–P37") input').isChecked(), '一般作業的舊勾選狀態未轉換');
  const wbcCell = page.locator('td[data-date="2026-09-15"][data-who="grade1"]');
  const wbcText = await wbcCell.innerText();
  for (const detail of ['WBC 大樓', '600cc 水壺', '薇小體服（長褲）＋運動鞋', '勿帶零食']) assert(wbcText.includes(detail), `WBC 須知缺少：${detail}`);
  assert(await wbcCell.locator('a[href="assets/wbc-notice-2026-09-15.jpg"]').count() === 1, 'WBC 原始通知連結遺失');
  const readingText = await page.locator('td[data-date="2026-09-16"][data-who="grade1"]').innerText();
  assert(readingText.includes('中文第 1 次｜上台座號：1、2、3、4、42、43、44'), '9/16 晨間朗讀座號不完整');

  page.once('dialog', dialog => dialog.accept('鋼琴課改期'));
  await heading.getByRole('button', { name: '編輯代辦：鋼琴課' }).click();
  assert(await heading.getByText('鋼琴課改期', { exact: true }).count() === 1, '編輯後文字未更新');
  assert(await heading.locator('input[type="checkbox"]').first().isChecked(), '編輯後勾選狀態未保留');
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert(await page.locator('.dates td[data-date="2026-09-25"]').getByText('鋼琴課改期', { exact: true }).count() === 1, '重新開啟後編輯內容未保留');
  assert(await page.locator('td[data-date="2026-09-11"][data-who="grade1"] li:has-text("複習「國語課本」P34–P37") input').isChecked(), '重新開啟後一般作業勾選未保留');

  await page.locator('.todo-add input[type="date"]').fill('2026-09-25');
  await page.locator('.todo-add select').selectOption('shared');
  await page.locator('.todo-add input[type="text"]').fill('家庭聚餐');
  await page.locator('[data-act="add"]').click();
  assert(await page.locator('.dates td[data-date="2026-09-25"]').getByText('家庭聚餐', { exact: true }).count() === 1, '新增共用代辦失敗');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('.dates td[data-date="2026-09-25"]').getByRole('button', { name: '刪除代辦：家庭聚餐' }).click();
  assert(await page.locator('.dates td[data-date="2026-09-25"]').getByText('家庭聚餐', { exact: true }).count() === 0, '刪除共用代辦失敗');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ip-calendar:v2:device-state')));
  assert(typeof stored.extra['2026-09-25-shared'][0] === 'object', '舊資料未轉換成可編輯格式');

  await page.locator('[data-act="accounts"]').click();
  await page.locator('#account-password').fill('19850515');
  await page.locator('[data-act="unlock"]').click();
  const appRow = page.locator('#account-content tr').filter({ hasText: '國小app' });
  await appRow.waitFor({ state: 'visible' });
  assert(await appRow.count() === 1, '學習帳密區缺少國小app');
  assert(await appRow.locator('code').count() === 2, '國小app應顯示兩位孩子的帳號');
  assert((await appRow.innerText()).includes('爸爸 D、媽媽 M、其他 O'), '國小app缺少家長代碼說明');
  assert((await appRow.innerText()).includes('請使用「國小 app」'), '國小app缺少使用方式');
  const hmhRow = page.locator('#account-content tr').filter({ hasText: 'HMH' });
  assert(await hmhRow.count() === 1, '學習帳密區缺少 HMH');
  assert(await hmhRow.locator('a').getAttribute('href') === 'https://www.hmhco.com/ui/login/?connection=88733990', 'HMH 登入網址不正確');
  assert(errors.length === 0, `頁面錯誤：${errors.join('; ')}`);
  await browser.close();
  console.log('Personal calendar todo checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
