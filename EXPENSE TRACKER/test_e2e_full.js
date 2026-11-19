const http = require('http');
const assert = require('assert');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runFullE2e() {
  console.log("=== RUNNING FULL E2E DEPLOYMENT READINESS TEST ===");

  // 1. Test Health Endpoint
  console.log("1. Probing /api/health...");
  const healthRes = await makeRequest({ hostname: 'localhost', port: 5500, path: '/api/health', method: 'GET' });
  assert.strictEqual(healthRes.status, 200, "Health check must return 200");
  const healthJson = JSON.parse(healthRes.body);
  assert.strictEqual(healthJson.status, 'healthy');
  assert.strictEqual(healthJson.platform, 'Budget Buddy', "Platform brand must be Budget Buddy");
  console.log("   [PASS] Server is healthy, responsive, and branded Budget Buddy.");

  // 2. Test AI Categorization
  console.log("2. Testing AI Smart Categorization (/api/ai/categorize)...");
  const catRes = await makeRequest({
    hostname: 'localhost', port: 5500, path: '/api/ai/categorize', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { title: "Starbucks Coffee", amount: 350 });
  assert.strictEqual(catRes.status, 200);
  const catJson = JSON.parse(catRes.body);
  assert.strictEqual(catJson.suggestion.category, 'Food & Dining');
  console.log("   [PASS] AI Categorization accurately tagged 'Starbucks Coffee' as 'Food & Dining'.");

  // 3. Test AI Conversational Assistant
  console.log("3. Testing AI Assistant (/api/ai/assistant)...");
  const aiRes = await makeRequest({
    hostname: 'localhost', port: 5500, path: '/api/ai/assistant', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    userState: { settings: { currency: "₹", budget: 30000 }, accounts: [{ balance: 60000 }], transactions: [] },
    prompt: "How much did I spend this month?"
  });
  assert.strictEqual(aiRes.status, 200);
  const aiJson = JSON.parse(aiRes.body);
  assert.ok(aiJson.result && aiJson.result.reply);
  console.log("   [PASS] AI Assistant parsed prompt and computed response.");

  // 4. Test User State Sync & Persistence
  console.log("4. Testing User State Sync (/api/user/sync)...");
  const syncRes = await makeRequest({
    hostname: 'localhost', port: 5500, path: '/api/user/sync', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: "e2e_test_user",
    userData: {
      password: "test_password",
      accounts: [{ id: "acc-1", name: "Bank", balance: 50000 }],
      transactions: [{ id: "tx-1", title: "Freelance Client", amount: 25000, type: "income" }]
    }
  });
  assert.strictEqual(syncRes.status, 200);

  // 5. Test User Data Retrieval
  console.log("5. Testing User State Retrieval (/api/user/data)...");
  const dataRes = await makeRequest({
    hostname: 'localhost', port: 5500, path: '/api/user/data?username=e2e_test_user', method: 'GET'
  });
  assert.strictEqual(dataRes.status, 200);
  const retrievedJson = JSON.parse(dataRes.body);
  assert.strictEqual(retrievedJson.userData.accounts[0].balance, 50000);
  assert.strictEqual(retrievedJson.userData.transactions[0].amount, 25000);
  console.log("   [PASS] User state persisted to disk and retrieved intact.");

  // 6. Test SPA Fallback & Static Assets
  console.log("6. Testing SPA Route Fallback & Static Assets...");
  const spaRes = await makeRequest({ hostname: 'localhost', port: 5500, path: '/dashboard', method: 'GET' });
  assert.strictEqual(spaRes.status, 200);
  assert.ok(spaRes.headers['content-type'].includes('text/html'));
  assert.ok(spaRes.headers['x-content-type-options'] === 'nosniff');
  console.log("   [PASS] SPA Fallback routing and security headers verified.");

  console.log("\n=== ALL E2E DEPLOYMENT TESTS PASSED WITH 100% SUCCESS! ===");
}

runFullE2e().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});

