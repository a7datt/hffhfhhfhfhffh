import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const axiosA = require('axios');
const axiosB = require('axios');
console.log('Same instance?', axiosA === axiosB);
