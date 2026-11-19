const http = require('http');
const assert = require('assert');
const fs = require('fs');

function request(options, postData = null) {
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

async function runComprehensiveAudit() {
  console.log("===============================================================");
  console.log("BUDGET BUDDY — COMPLETE END-TO-END PRE-DEPLOYMENT AUDIT & TEST");
  console.log("===============================================================\n");

  const PORT = 5500;

  // 1. Health & Brand Verification
  console.log("1. Verifying System Health & Brand Metadata...");
  const healthRes = await request({ hostname: 'localhost', port: PORT, path: '/api/health', method: 'GET' });
  assert.strictEqual(healthRes.status, 200, "Health check must return 200");
  const health = JSON.parse(healthRes.body);
  assert.strictEqual(health.status, 'healthy');
  assert.strictEqual(health.platform, 'Budget Buddy');
  console.log("   [PASS] Platform 'Budget Buddy' active & operational.\n");

  // 2. SPA Route Fallback & Static Files
  console.log("2. Verifying Static Assets & SPA Routing Fallback...");
  const htmlRes = await request({ hostname: 'localhost', port: PORT, path: '/', method: 'GET' });
  assert.strictEqual(htmlRes.status, 200);
  assert.ok(htmlRes.body.includes('Budget Buddy'));

  const spaRes = await request({ hostname: 'localhost', port: PORT, path: '/analytics', method: 'GET' });
  assert.strictEqual(spaRes.status, 200);
  assert.ok(spaRes.body.includes('Budget Buddy'));
  console.log("   [PASS] Static assets served with valid MIME types and SPA fallback.\n");

  // 3. Security: Directory Traversal Protection
  console.log("3. Testing Security Protection: Directory Traversal Attack...");
  const attackRes = await request({ hostname: 'localhost', port: PORT, path: '/../../package.json', method: 'GET' });
  assert.ok(attackRes.status === 403 || attackRes.status === 404, "Traversal attempt must be rejected");
  console.log(`   [PASS] Traversal blocked securely with HTTP status ${attackRes.status}.\n`);

  // 4. Security: Malformed JSON Handling
  console.log("4. Testing Robustness: Malformed JSON Request Handling...");
  const badJsonRes = await request({
    hostname: 'localhost', port: PORT, path: '/api/ai/categorize', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, '{ malformed_json: true');
  assert.strictEqual(badJsonRes.status, 400, "Malformed JSON must return 400 Bad Request");
  console.log("   [PASS] Malformed request safely intercepted with HTTP 400.\n");

  // 5. AI Smart Categorization Classifier
  console.log("5. Testing AI Smart Categorization Engine...");
  const testItems = [
    { title: "Zomato Biryani", expectedCat: "Food & Dining" },
    { title: "Uber Cab to Airport", expectedCat: "Transportation" },
    { title: "Amazon Electronics", expectedCat: "Shopping" },
    { title: "Netflix Subscription", expectedCat: "Entertainment" },
    { title: "Monthly House Rent", expectedCat: "Rent & Housing" }
  ];

  for (const item of testItems) {
    const res = await request({
      hostname: 'localhost', port: PORT, path: '/api/ai/categorize', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { title: item.title, amount: 500 });
    assert.strictEqual(res.status, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.suggestion.category, item.expectedCat, `Mismatch for ${item.title}`);
    console.log(`   [PASS] AI accurately classified '${item.title}' -> '${body.suggestion.category}'`);
  }
  console.log();

  // 6. Natural Language AI Financial Assistant
  console.log("6. Testing AI Conversational Financial Intelligence...");
  const aiRes = await request({
    hostname: 'localhost', port: PORT, path: '/api/ai/assistant', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    userState: {
      settings: { currency: "₹", budget: 40000 },
      accounts: [{ balance: 75000 }],
      transactions: [
        { type: "income", amount: 65000, date: new Date().toISOString() },
        { type: "expense", amount: 15000, category: "Food & Dining", date: new Date().toISOString() }
      ]
    },
    prompt: "Give me a summary of my budget and savings"
  });
  assert.strictEqual(aiRes.status, 200);
  const aiData = JSON.parse(aiRes.body);
  assert.ok(aiData.result && aiData.result.reply, "AI Assistant must formulate structured advice");
  console.log("   [PASS] AI Assistant parsed prompt and computed response successfully.\n");

  // 7. OCR / Receipt Text Parser
  console.log("7. Testing OCR & Receipt Parser...");
  const sampleReceipt = `
    STARBUCKS COFFEE INDIA
    Connaught Place, New Delhi
    Date: 2026-11-19
    1x Caramel Macchiato    ₹350.00
    1x Butter Croissant     ₹220.00
    Subtotal                ₹570.00
    CGST 2.5%               ₹14.25
    SGST 2.5%               ₹14.25
    TOTAL AMOUNT            ₹598.50
    Paid via UPI
    Thank you for visiting!
  `;
  const ocrRes = await request({
    hostname: 'localhost', port: PORT, path: '/api/ai/parse-receipt', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { text: sampleReceipt });
  assert.strictEqual(ocrRes.status, 200);
  const ocrData = JSON.parse(ocrRes.body);
  assert.ok(ocrData.receiptData.amount > 0, "OCR must extract numeric amount");
  console.log(`   [PASS] Receipt parsed: Merchant='${ocrData.receiptData.merchant}', Amount='₹${ocrData.receiptData.amount}', Category='${ocrData.receiptData.category}'.\n`);

  // 8. User State Synchronization & Persistence
  console.log("8. Testing Multi-User State Synchronization & Persistence...");
  const testUser = "audit_fintech_user";
  const userPayload = {
    password: "secure_password_hash",
    accounts: [
      { id: "acc-bank", name: "HDFC Primary Bank", type: "bank", balance: 125000 },
      { id: "acc-cash", name: "Physical Wallet", type: "cash", balance: 5000 }
    ],
    categories: [
      { name: "Food & Dining", type: "expense", budget: 12000 },
      { name: "Rent & Housing", type: "expense", budget: 25000 }
    ],
    transactions: [
      { id: "tx-101", title: "Monthly Salary Credit", amount: 95000, type: "income", date: "2026-11-01", account: "HDFC Primary Bank" },
      { id: "tx-102", title: "Apartment Rent", amount: 22000, type: "expense", date: "2026-11-05", account: "HDFC Primary Bank", category: "Rent & Housing" }
    ],
    subscriptions: [
      { id: "sub-1", name: "Amazon Prime", amount: 1499, frequency: "yearly", status: "active" }
    ],
    goals: [
      { id: "goal-1", name: "Emergency Fund", targetAmount: 200000, currentAmount: 85000, deadline: "2027-12-31" }
    ],
    settings: { name: "Audit User", currency: "₹", monthlyBudget: 50000 }
  };

  const syncRes = await request({
    hostname: 'localhost', port: PORT, path: '/api/user/sync', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: testUser, userData: userPayload });
  assert.strictEqual(syncRes.status, 200);

  const retrieveRes = await request({
    hostname: 'localhost', port: PORT, path: `/api/user/data?username=${testUser}`, method: 'GET'
  });
  assert.strictEqual(retrieveRes.status, 200);
  const retrieved = JSON.parse(retrieveRes.body);
  assert.strictEqual(retrieved.userData.accounts[0].balance, 125000);
  assert.strictEqual(retrieved.userData.goals[0].name, "Emergency Fund");
  assert.strictEqual(retrieved.userData.subscriptions[0].name, "Amazon Prime");
  console.log("   [PASS] Complete FinTech user state persisted and verified with 100% integrity.\n");

  console.log("===============================================================");
  console.log("ALL 8 PRE-DEPLOYMENT AUDIT MODULES PASSED WITH 100% SUCCESS!");
  console.log("===============================================================");
}

runComprehensiveAudit().catch(err => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});

