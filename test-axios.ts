import axiosESM from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const axiosCJS = require('axios');

axiosESM.defaults.timeout = 9999;
console.log('ESM timeout:', axiosESM.defaults.timeout);
console.log('CJS timeout:', axiosCJS.defaults.timeout);
console.log('Are they the same object?', axiosESM === axiosCJS);
