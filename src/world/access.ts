import {PAYMENTS_ENABLED} from '../product';
import {getAuth} from '../shared/storage/authStorage';
import {getActiveSubscription} from '../shared/storage/subscriptionStorage';
export const accessConfig={freePersonalTrainingDemos:1,freeTopics:['mate','pin','fork'],freeArenaLevel:2,freePolygonLevel:1,mistyLandsRequiredTopics:3,dailyTrainingPoints:1,trainingSize:5,trainingMix:[.5,.3,.2],masteryWindow:10,minMasterySamples:5};
export function userAccess(){const auth=getAuth(),sub=getActiveSubscription();return {accessLevel:sub.isActive?'premium':auth.isLoggedIn?'free':'guest',premiumSource:sub.isActive?(sub.source||'legacy'):null} as const;}
export function hasPremiumAccess(){return userAccess().accessLevel==='premium';}
export function canAccess(feature:string,level=1){if(!PAYMENTS_ENABLED||hasPremiumAccess())return true;if(feature==='arena')return level<=accessConfig.freeArenaLevel;if(feature==='polygon')return level<=accessConfig.freePolygonLevel;return accessConfig.freeTopics.includes(feature);}

export function trainingDemoAvailable(save:import("./types").WorldSave){return PAYMENTS_ENABLED&&!hasPremiumAccess()&&(save.personalDemosCompleted||0)<accessConfig.freePersonalTrainingDemos;}
