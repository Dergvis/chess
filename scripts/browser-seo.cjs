const {chromium}=require('C:/Users/Max/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.CHEZZIES_LOCAL_URL||'http://127.0.0.1:4174';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/chess-puzzles-for-kids/','/how-to-play-chess-for-kids/','/chess-games-for-kids/']){
   await page.goto(base+path,{waitUntil:'networkidle'});
   const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth,cta:!!document.querySelector('a.cta[href="/play/"]')}));
   console.log(width,path,result);
   if(result.scroll>result.view||!result.cta)throw Error(`Layout or CTA failed: ${width} ${path}`);
  }
 }
 await page.goto(base+'/chess-puzzles-for-kids/',{waitUntil:'networkidle'});
 const fork=page.locator('[data-puzzle-id="fork-1"]');
 await fork.locator('[data-square="e4"]').click();await fork.locator('[data-square="d6"]').click();
 const feedback=await fork.locator('.example-feedback').innerText();console.log('fork result:',feedback);
 if(!feedback.includes('Great move!'))throw Error('Real puzzle interaction failed');
 await page.goto(base+'/play/home/',{waitUntil:'domcontentloaded'});console.log('game route:',(await page.locator('body').innerText()).slice(0,180));
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
