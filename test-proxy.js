const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

axios.get('https://api.shamcash.sy/v4/api/Session/check', {
  httpsAgent: new HttpsProxyAgent('http://193.43.159.200:80'),
  proxy: false,
  timeout: 5000
}).catch(e => {
  if (e.response) console.log('Response:', e.response.status);
  else console.log('Error:', e.message);
});
