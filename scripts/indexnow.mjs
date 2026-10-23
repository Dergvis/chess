import {pages,origin} from './content.mjs';
const key=process.env.INDEXNOW_KEY;
if(process.env.VERCEL_ENV!=='production'||process.env.CONFIRM_PUBLISHED!=='true')throw Error('Only submit after the production deployment is published; set CONFIRM_PUBLISHED=true.');
if(!key||!/^[a-zA-Z0-9-]{8,128}$/.test(key))throw Error('Set a valid INDEXNOW_KEY before building and submitting.');
const keyLocation=origin+'/'+key+'.txt';const proof=await fetch(keyLocation);if(!proof.ok||(await proof.text()).trim()!==key)throw Error('The live key file does not match.');
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:'chezzies.app',key,keyLocation,urlList:['',...pages.map(p=>p.slug),'play'].map(s=>origin+'/'+(s?s+'/':''))})});
if(!response.ok)throw Error('IndexNow returned HTTP '+response.status);console.log('URLs submitted. Indexing is not guaranteed.');
