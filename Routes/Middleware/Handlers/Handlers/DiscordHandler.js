// handlers/discordHandler.js
function processLog(data) {
  console.log('Processing Discord log data:', JSON.stringify(data, null, 2));
}

module.exports = { processLog };
