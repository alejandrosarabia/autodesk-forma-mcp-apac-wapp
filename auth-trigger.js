import { doAuthFlow } from './src/auth/threeLegged.js';

console.log('Starting 3LO auth flow...\n');
const token = await doAuthFlow();
console.log('\nToken acquired successfully!');
console.log('Token saved to .aps_3lo_token.json');
console.log('You can now run the MCP server with: node src/index.js');
process.exit(0);
