import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const axiosCJS = require('axios');
const shamyClient = require('@jhad-dev/shamy/src/Client');

axiosCJS.defaults.timeout = 12345;

const client = new shamyClient();
// We'll peek into how client uses axios
console.log('timeout seen by client/axios?', axiosCJS.defaults.timeout);
