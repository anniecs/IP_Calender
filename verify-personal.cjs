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
  await page.waitForTimeout(500);
  if (errors.length) throw new Error(`頁面錯誤：${errors.join('; ')}`);
  const today = new Date();
  assert(await page.locator('#month-select').inputValue() === String((today.getFullYear() - 2026) * 12 + today.getMonth()), '首頁未顯示當月');
  await page.locator('#month-select').selectOption('8');

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
  const codingText = await page.locator('td[data-date="2026-09-17"][data-who="grade1"]').innerText();
  assert(codingText.includes('數位與邏輯'), '弟弟行事曆缺少 Coding 課程標籤');
  assert(codingText.includes('第 3 週：海豚歐文的研究室（一）｜STEAM＋Maker'), '弟弟 Coding 第 3 週內容不正確');
  assert(await page.locator('td[data-date="2026-09-17"][data-who="grade1"] .pill-coding').count() === 1, 'Coding 課程標籤樣式未套用');
  const sep18Text = await page.locator('td[data-date="2026-09-18"][data-who="grade1"]').innerText();
  for (const detail of ['複習「注音①號本」第四課並訂正', '依班級雲端進度表複習 LA', '線上查看 STEAM 課程相關補充', '檢查鉛筆盒文具並削好鉛筆', '本週沒有 Reading Worksheet', '下週三（9/23）考國語第四課']) assert(sep18Text.includes(detail), `弟弟 9/18 聯絡本缺少：${detail}`);
  assert(await page.locator('td[data-date="2026-09-18"][data-who="grade1"] .pill-brother').count() === 1, '9/18 聯絡本標籤樣式不正確');
  const noticeChecks = {
    '2026-09-19': '五樓活動中心',
    '2026-09-21': '完成藍思閱讀測驗',
    '2026-09-23': '牙齒塗氟：攜帶牙刷（當日帶回）',
    '2026-09-24': '家庭樹活動：攜帶數張已剪好的家人照片',
    '2026-09-30': '疫苗意願簽署截止'
  };
  for (const [date, detail] of Object.entries(noticeChecks)) assert((await page.locator(`td[data-date="${date}"][data-who="grade1"]`).innerText()).includes(detail), `${date} 日期通知缺少：${detail}`);
  assert((await page.locator('td[data-date="2026-09-22"][data-who="grade1"]').innerText()).includes('明天考試：國語第四課'), '9/22 缺少國語第四課考試提醒');
  assert((await page.locator('td[data-date="2026-09-23"][data-who="grade1"]').innerText()).includes('國語第四課'), '9/23 缺少國語第四課考試');

  page.once('dialog', dialog => dialog.accept('鋼琴課改期'));
  await heading.getByRole('button', { name: '編輯代辦：鋼琴課' }).click();
  assert(await heading.getByText('鋼琴課改期', { exact: true }).count() === 1, '編輯後文字未更新');
  assert(await heading.locator('input[type="checkbox"]').first().isChecked(), '編輯後勾選狀態未保留');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#month-select').selectOption('8');
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

  await page.locator('#month-select').selectOption('9');
  const unit2Checks = {
    '2026-10-01': ['Sing TB P72', 'Unit 2 video worksheet', 'Memorize TB P73 vocabulary words', 'LA 原始進度表'],
    '2026-10-08': ['Read TB P80–P95', 'Memorize highlighted words', 'Scholastic Reading'],
    '2026-10-14': ['Review TB P104–P105'],
    '2026-10-19': ['Review TB P108', 'Research animals and shared features for writing project'],
    '2026-10-23': ['TB P128–P130', 'Read PB P2.14、P2.18'],
    '2026-10-30': ['Review for midterm']
  };
  for (const [date, details] of Object.entries(unit2Checks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `哥哥 Unit 2 ${date} 缺少：${detail}`);
  }
  assert(await page.locator('td[data-date="2026-10-01"][data-who="grade2"] a[href*="1_DeBZHFStWQu96p69LvrDm2roi2e_MyC"]').count() === 1, '哥哥 Unit 2 原始 PDF 連結遺失');
  const oct14Text = await page.locator('td[data-date="2026-10-14"][data-who="grade2"]').innerText();
  assert(oct14Text.includes('明天考試：LA Spelling Quiz：TB P73、P75 與標示單字'), '10/14 缺少隔日拼字考提醒');
  assert(!oct14Text.includes('Review for 10/15 spelling quiz'), '10/14 重複顯示拼字考資訊');
  assert((await page.locator('td[data-date="2026-10-15"][data-who="grade2"]').innerText()).includes('LA Spelling Quiz：TB P73、P75 與標示單字'), '10/15 缺少拼字考');
  const oct28Text = await page.locator('td[data-date="2026-10-28"][data-who="grade2"]').innerText();
  assert(oct28Text.includes('明天考試：LA Spelling Quiz：TB P107、P109 與標示單字'), '10/28 缺少隔日拼字考提醒');
  assert(!oct28Text.includes('Review for 10/29 spelling quiz'), '10/28 重複顯示拼字考資訊');

  await page.locator('#month-select').selectOption('10');
  const steamScheduleChecks = {
    '2026-11-10': ['How Do Heating and Cooling Change Matter?', 'Melt It', 'Cool It Down', 'STEAM 原始進度表'],
    '2026-11-17': ['How Does Matter Change?', 'Reversible Changes', 'Irreversible Changes'],
    '2026-11-24': ['Heating and Cooling：Lesson Check', 'Matter Changes：Lesson Check']
  };
  for (const [date, details] of Object.entries(steamScheduleChecks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `哥哥 STEAM ${date} 缺少：${detail}`);
  }
  assert(await page.locator('td[data-date="2026-11-10"][data-who="grade2"] a[href*="1hdixlNFe6zdd6F7T5mFNA5ddvvn5K5zk"]').count() === 1, '哥哥 STEAM 第 11–21 週原始 PDF 連結遺失');

  const unit3NovemberChecks = {
    '2026-11-06': ['TB P142–P143', 'Complete video worksheet', 'Scholastic Reader', 'LA 原始進度表'],
    '2026-11-10': ['TB P146–P147', 'Complete problem-solution chart worksheet'],
    '2026-11-13': ['TB P152–P167', 'Reading worksheet', 'Scholastic Reader'],
    '2026-11-17': ['TB P170–P173', '3 pairs of multiple-meaning words'],
    '2026-11-27': ['TB P184–P197', 'Would a PlayPump work at Wego?', 'Scholastic Reader']
  };
  for (const [date, details] of Object.entries(unit3NovemberChecks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `哥哥 Unit 3 ${date} 缺少：${detail}`);
  }
  assert(await page.locator('td[data-date="2026-11-06"][data-who="grade2"] a[href*="1MCNr55F7JZ-GenqHUaIojEHScn3D6CSP"]').count() === 1, '哥哥 Unit 3 原始 PDF 連結遺失');
  const nov18Text = await page.locator('td[data-date="2026-11-18"][data-who="grade2"]').innerText();
  assert(nov18Text.includes('明天考試：LA Spelling Quiz：TB P145、P147 與標示單字'), '11/18 缺少隔日拼字考提醒');
  assert(!nov18Text.includes('Review for spelling quiz'), '11/18 重複顯示拼字考資訊');
  assert((await page.locator('td[data-date="2026-11-19"][data-who="grade2"]').innerText()).includes('LA Spelling Quiz：TB P145、P147 與標示單字'), '11/19 缺少拼字考');

  const grade1Unit3NovemberChecks = {
    '2026-11-05': ['Review p.140-141, and preview vocabulary.', 'Unit 3（11/5–12/8）'],
    '2026-11-06': ['Read the sentences and practice the words on p.142-143.', 'Scholastic online.'],
    '2026-11-13': ['Review the reading and p.164-165.', 'Reading Homework.', 'Scholastic online.'],
    '2026-11-17': ['Review p.166.', '明天考試：LA Vocabulary Quiz：P143、P145'],
    '2026-11-27': ['Review p.200-201 and vocabulary p.173, 175.', 'Reading homework.', 'Scholastic online.']
  };
  for (const [date, details] of Object.entries(grade1Unit3NovemberChecks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade1"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `弟弟 Unit 3 ${date} 缺少：${detail}`);
  }
  assert(await page.locator('td[data-date="2026-11-05"][data-who="grade1"] a[href$="g1-unit3-homework-chart.pdf"]').count() === 1, '弟弟 Unit 3 原始 PDF 連結遺失');
  assert(!((await page.locator('td[data-date="2026-11-17"][data-who="grade1"]').innerText()).includes('Vocabulary quiz tomorrow')), '11/17 重複顯示考試資訊');
  const nov30Grade1 = await page.locator('td[data-date="2026-11-30"][data-who="grade1"]').innerText();
  assert(nov30Grade1.includes('Review p.202.'), '弟弟 11/30 缺少作業');
  assert(nov30Grade1.includes('明天考試：LA Vocabulary Quiz'), '弟弟 11/30 缺少隔日考試提醒');
  assert(!nov30Grade1.includes('Vocabulary quiz tomorrow'), '弟弟 11/30 重複顯示考試資訊');

  await page.locator('#month-select').selectOption('11');
  for (const [date, detail] of Object.entries({
    '2026-12-01': 'Matter：Unit Review',
    '2026-12-08': 'Final Project Introduction — No homework',
    '2026-12-15': 'WBC — No class',
    '2026-12-22': 'Group project（use class materials）',
    '2026-12-29': 'Finish project and do testing'
  })) assert((await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText()).includes(detail), `哥哥 STEAM ${date} 缺少：${detail}`);

  const unit3DecemberChecks = {
    '2026-12-01': ['TB P200–P203', '2 words with a "y" suffix', '2 with an "ion" suffix'],
    '2026-12-03': ['Think and share：2 ways you can save water', 'LA Spelling Quiz：TB P177、P179 與標示單字'],
    '2026-12-04': ['Scholastic Reader'],
    '2026-12-07': ['Preview Unit 4 vocabulary', 'LA Unit 3 Quiz']
  };
  for (const [date, details] of Object.entries(unit3DecemberChecks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `哥哥 Unit 3 ${date} 缺少：${detail}`);
  }
  const dec2Text = await page.locator('td[data-date="2026-12-02"][data-who="grade2"]').innerText();
  assert(dec2Text.includes('明天考試：LA Spelling Quiz：TB P177、P179 與標示單字'), '12/2 缺少隔日拼字考提醒');
  assert(!dec2Text.includes('Review for spelling quiz'), '12/2 重複顯示拼字考資訊');
  const dec4Text = await page.locator('td[data-date="2026-12-04"][data-who="grade2"]').innerText();
  assert(!dec4Text.includes('Review for Unit 3 quiz'), '12/4 重複顯示 Unit 3 考試資訊');
  assert((await page.locator('td[data-date="2026-12-06"][data-who="grade2"]').innerText()).includes('明天考試：LA Unit 3 Quiz'), '12/6 缺少 Unit 3 考試提醒');

  const grade1Unit3DecemberChecks = {
    '2026-12-01': ['Read p.203-205.', 'LA Vocabulary Quiz'],
    '2026-12-04': ['Review unit 3.', 'Scholastic online.'],
    '2026-12-08': ['Preview unit 4 vocabulary.', 'LA Unit 3 Quiz']
  };
  for (const [date, details] of Object.entries(grade1Unit3DecemberChecks)) {
    const text = await page.locator(`td[data-date="${date}"][data-who="grade1"]`).innerText();
    for (const detail of details) assert(text.includes(detail), `弟弟 Unit 3 ${date} 缺少：${detail}`);
  }
  const dec7Grade1 = await page.locator('td[data-date="2026-12-07"][data-who="grade1"]').innerText();
  assert(dec7Grade1.includes('明天考試：LA Unit 3 Quiz'), '弟弟 12/7 缺少 Unit 3 考試提醒');
  assert(!dec7Grade1.includes('Review for Unit 3 Quiz tomorrow'), '弟弟 12/7 重複顯示 Unit 3 考試資訊');

  await page.locator('#month-select').selectOption('12');
  for (const [date, detail] of Object.entries({
    '2027-01-05': 'What Do Plants Need?：Lesson Check',
    '2027-01-12': 'Final test — No class',
    '2027-01-19': 'Singing contest — No class'
  })) assert((await page.locator(`td[data-date="${date}"][data-who="grade2"]`).innerText()).includes(detail), `哥哥 STEAM ${date} 缺少：${detail}`);

  await page.locator('[data-act="reading-reports"]').click();
  const readingReports = page.locator('.reading-reports');
  await readingReports.waitFor({ state: 'visible' });
  const reportText = await readingReports.innerText();
  for (const detail of ['English Recital Vol. 3', '每週五 08:00–08:15', '一週最多繳交兩本', '每週一交給老師', 'Bronze 銅牌獎']) assert(reportText.includes(detail), `英文閱讀報告摘要缺少：${detail}`);
  assert(await readingReports.locator('a[href^="https://drive.google.com"]').count() === 0, '英文閱讀報告仍含需要登入的 Google Drive 連結');
  assert(await readingReports.locator('a[href="reading-reports.html#recital"]').count() === 1, '蘇菲亞獎站內教材入口遺失');
  assert(await readingReports.locator('a[href="reading-reports.html#book-report"]').count() === 1, '英文讀書心得站內原檔入口遺失');
  assert(reportText.includes('不需要登入 Google 帳號'), '英文閱讀報告缺少免登入說明');

  const gallery = await browser.newPage();
  await gallery.goto('file:///C:/Users/User/Desktop/IP_Calender/publish/reading-reports.html');
  assert(await gallery.locator('#recital .file').count() === 20, '蘇菲亞獎教材數量不正確');
  assert(await gallery.locator('#book-report .file').count() === 4, '英文讀書心得原檔數量不正確');
  assert(await gallery.locator('a[href$=".HEIC"]').count() === 18, 'HEIC 原始檔下載入口數量不正確');
  assert(await gallery.locator('img[src$=".jpg"], img[src$=".JPG"]').count() === 20, '可直接瀏覽的教材圖片數量不正確');
  await gallery.waitForFunction(() => [...document.images].every(image => image.complete));
  assert(await gallery.locator('img').evaluateAll(images => images.every(image => image.naturalWidth > 0)), '英文閱讀教材含無法載入的圖片');
  await gallery.setViewportSize({ width: 390, height: 844 });
  assert(!(await gallery.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '英文閱讀原檔頁面在手機上發生水平溢位');

  await page.locator('[data-act="book-award"]').click();
  const bookAward = page.locator('.book-award');
  await bookAward.waitFor({ state: 'visible' });
  const awardText = await bookAward.innerText();
  for (const detail of ['二年級下學期', '每學期只能申請一個獎項', '書香獎', '10 篇', '學士獎', '碩士獎', '博士獎', '諾貝爾獎', '日期至少間隔兩天']) assert(awardText.includes(detail), `書香獎專區缺少：${detail}`);
  assert(await bookAward.locator('a[href$=".pdf"]').count() === 8, '書香獎 PDF 連結數量不正確');
  assert(await bookAward.locator('tbody tr').count() === 5, '書香獎級別表格數量不正確');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '書香獎專區在手機上發生頁面水平溢位');

  await page.locator('[data-act="learning"]').click();
  const learning = page.locator('.learning');
  await learning.waitFor({ state: 'visible' });
  const learningLinks = [
    ['ICRT News for Kids', 'https://www.icrt.com.tw/news_lunchbox.php?&mlevel1=7'],
    ['國語生字練習', 'https://leyleyaiink.github.io/kids-chinese/?v'],
    ['注音小達人', 'https://jinshuanyu.github.io/bopomofo-game/'],
    ['空中英語教室', 'https://coocplus.tp.edu.tw/learning/dist/#/course/zGl3Gxld'],
    ['大家說英語', 'https://coocplus.tp.edu.tw/learning/dist/#/course/ykXDEaK8']
  ];
  for (const [title, url] of learningLinks) {
    const link = learning.locator('a').filter({ hasText: title });
    assert(await link.count() === 1, `學習專區缺少：${title}`);
    assert(await link.getAttribute('href') === url, `${title} 連結不正確`);
    assert(await link.getAttribute('target') === '_blank', `${title} 應在新分頁開啟`);
    assert((await link.getAttribute('rel') || '').includes('noopener'), `${title} 缺少安全連結屬性`);
  }
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '學習專區在手機上發生頁面水平溢位');

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
