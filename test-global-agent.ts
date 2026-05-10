import { bootstrap } from 'global-agent';
bootstrap();

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const axiosA = require('axios');
import axiosB from 'axios';

global.GLOBAL_AGENT.HTTP_PROXY = 'http://193.43.159.200:80';

axiosA.get('https://api.shamcash.sy/v4/api/Session/check', { timeout: 5000 }).catch(e => {
  if (e.response) console.log('Axios A (CJS) Proxy Success! Response:', e.response.status);
  else console.log('Axios A Error:', e.message);
});

axiosB.get('https://api.shamcash.sy/v4/api/Session/check', { timeout: 5000 }).catch(e => {
  if (e.response) console.log('Axios B (ESM) Proxy Success! Response:', e.response.status);
  else console.log('Axios B Error:', e.message);
});
