const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_DIR = path.join(__dirname, 'data', 'users');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.htm': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=UTF-8'
};

const BASE_DIR = __dirname;
let preferredPort = parseInt(process.env.PORT || '5500', 10);

// Helper to read JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// User file paths
function getUserFilePath(username) {
  const safeName = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return path.join(DATA_DIR, `${safeName}.json`);
}

// AI Smart Categorization Rules & Classifier
function smartCategorize(title, amount) {
  const t = (title || '').toLowerCase();
  
  if (t.includes('swiggy') || t.includes('zomato') || t.includes('domino') || t.includes('mcdonald') || 
      t.includes('pizza') || t.includes('burger') || t.includes('restaurant') || t.includes('cafe') || 
      t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('food') || 
      t.includes('starbucks') || t.includes('subway') || t.includes('kfc')) {
    return {
      category: 'Food & Dining',
      subcategory: t.includes('swiggy') || t.includes('zomato') ? 'Delivery' : 'Restaurant',
      merchant: t.includes('domino') ? "Domino's" : t.includes('swiggy') ? 'Swiggy' : t.includes('zomato') ? 'Zomato' : t.includes('starbucks') ? 'Starbucks' : 'Restaurant',
      type: 'expense'
    };
  }

  if (t.includes('uber') || t.includes('ola') || t.includes('metro') || t.includes('bus') || 
      t.includes('train') || t.includes('irctc') || t.includes('fuel') || t.includes('petrol') || 
      t.includes('diesel') || t.includes('auto') || t.includes('cab') || t.includes('flight') || t.includes('indigo')) {
    return {
      category: 'Transportation',
      subcategory: t.includes('petrol') || t.includes('fuel') ? 'Fuel' : t.includes('flight') ? 'Flights' : 'Cab / Transit',
      merchant: t.includes('uber') ? 'Uber' : t.includes('ola') ? 'Ola' : t.includes('irctc') ? 'IRCTC' : 'Transport',
      type: 'expense'
    };
  }

  if (t.includes('amazon') || t.includes('flipkart') || t.includes('myntra') || t.includes('zara') || 
      t.includes('h&m') || t.includes('clothing') || t.includes('shopping') || t.includes('shoes') || t.includes('mall')) {
    return {
      category: 'Shopping',
      subcategory: 'Online Shopping',
      merchant: t.includes('amazon') ? 'Amazon' : t.includes('flipkart') ? 'Flipkart' : t.includes('myntra') ? 'Myntra' : 'Retail Store',
      type: 'expense'
    };
  }

  if (t.includes('netflix') || t.includes('spotify') || t.includes('prime') || t.includes('hotstar') || 
      t.includes('youtube') || t.includes('movie') || t.includes('cinema') || t.includes('pvr') || t.includes('game') || t.includes('steam')) {
    return {
      category: 'Entertainment',
      subcategory: t.includes('movie') || t.includes('pvr') ? 'Movies' : 'Subscriptions',
      merchant: t.includes('netflix') ? 'Netflix' : t.includes('spotify') ? 'Spotify' : t.includes('pvr') ? 'PVR' : 'Entertainment',
      type: 'expense'
    };
  }

  if (t.includes('electricity') || t.includes('water bill') || t.includes('broadband') || t.includes('wifi') || 
      t.includes('airtel') || t.includes('jio') || t.includes('recharge') || t.includes('gas') || t.includes('utility')) {
    return {
      category: 'Bills & Utilities',
      subcategory: t.includes('recharge') || t.includes('jio') || t.includes('airtel') ? 'Mobile Recharge' : 'Utility Bill',
      merchant: t.includes('jio') ? 'Jio' : t.includes('airtel') ? 'Airtel' : 'Utility Provider',
      type: 'expense'
    };
  }

  if (t.includes('rent') || t.includes('maintenance') || t.includes('society')) {
    return {
      category: 'Rent & Housing',
      subcategory: 'Housing',
      merchant: 'Landlord / Society',
      type: 'expense'
    };
  }

  if (t.includes('salary') || t.includes('freelance') || t.includes('stipend') || t.includes('dividend') || 
      t.includes('interest') || t.includes('bonus') || t.includes('income') || t.includes('client payment')) {
    return {
      category: t.includes('salary') ? 'Salary' : t.includes('freelance') ? 'Freelancing' : 'Other Income',
      subcategory: 'Earnings',
      merchant: 'Employer / Client',
      type: 'income'
    };
  }

  if (t.includes('doctor') || t.includes('medicine') || t.includes('pharmacy') || t.includes('apollo') || 
      t.includes('hospital') || t.includes('clinic') || t.includes('1mg')) {
    return {
      category: 'Health & Medical',
      subcategory: 'Medical & Pharmacy',
      merchant: t.includes('apollo') ? 'Apollo' : 'Pharmacy',
      type: 'expense'
    };
  }

  if (t.includes('blinkit') || t.includes('instamart') || t.includes('zepto') || t.includes('bigbasket') || 
      t.includes('grocery') || t.includes('supermarket') || t.includes('veggies')) {
    return {
      category: 'Groceries',
      subcategory: 'Quick Commerce',
      merchant: t.includes('blinkit') ? 'Blinkit' : t.includes('zepto') ? 'Zepto' : t.includes('instamart') ? 'Swiggy Instamart' : 'Grocery Store',
      type: 'expense'
    };
  }

  return {
    category: 'Other',
    subcategory: 'General',
    merchant: '',
    type: 'expense'
  };
}

// Conversational AI Financial Query Engine
function processAiFinancialQuery(userState, prompt) {
  const p = (prompt || '').trim().toLowerCase();
  const currency = (userState.settings && userState.settings.currency) || '₹';
  const expenses = userState.expenses || userState.transactions?.filter(t => t.type === 'expense') || [];
  const incomeList = userState.transactions?.filter(t => t.type === 'income') || [];
  
  const now = new Date();
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const currentMonthIncome = incomeList.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const mSpent = currentMonthExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const mEarned = currentMonthIncome.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const mSavings = mEarned - mSpent;
  const budget = parseFloat(userState.settings?.budget || 0);

  // Category totals for this month
  const catTotals = {};
  currentMonthExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (parseFloat(e.amount) || 0);
  });
  let topCat = 'None', topCatAmount = 0;
  for (const [cat, amt] of Object.entries(catTotals)) {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      topCat = cat;
    }
  }

  // Question: How much did I spend this month?
  if (p.includes('spend') && (p.includes('this month') || p.includes('current month') || p.includes('so far'))) {
    return {
      reply: `You have spent **${currency}${mSpent.toLocaleString('en-IN', {minimumFractionDigits: 2})}** so far this month across ${currentMonthExpenses.length} transactions.\n\n` +
             (budget > 0 ? `Your monthly budget is **${currency}${budget.toLocaleString('en-IN')}**, leaving **${currency}${(budget - mSpent).toLocaleString('en-IN', {minimumFractionDigits: 2})}** remaining (${((mSpent/budget)*100).toFixed(1)}% utilized).` : `You haven't set a monthly budget yet. You can set one in the Budgets section.`),
      dataPoints: { spent: mSpent, budget, remaining: budget - mSpent, transactionCount: currentMonthExpenses.length },
      actions: ['View Transactions', 'Check Budget']
    };
  }

  // Question: Where am I spending the most? / Top category
  if (p.includes('where') || p.includes('most') || p.includes('top category') || p.includes('highest')) {
    if (topCatAmount > 0) {
      const pct = mSpent > 0 ? ((topCatAmount / mSpent) * 100).toFixed(1) : 0;
      return {
        reply: `Your highest spending category this month is **${topCat}**, totaling **${currency}${topCatAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}** (${pct}% of your total monthly outflow).\n\n` +
               `💡 *Recommendation:* Consider setting a category-specific budget for ${topCat} to keep spending under control.`,
        dataPoints: { topCategory: topCat, amount: topCatAmount, percentage: pct },
        actions: ['Set Category Budget', 'View Breakdown']
      };
    } else {
      return {
        reply: `You haven't recorded any expenses for the current month yet. Add your transactions to view your spending breakdown!`,
        actions: ['Add Expense']
      };
    }
  }

  // Question: Can I afford a purchase? (e.g. "can I afford 5000", "can I afford a 10000 laptop")
  const affordMatch = p.match(/afford.*?(\d+[\d,]*)/);
  if (affordMatch || p.includes('afford')) {
    const testAmount = affordMatch ? parseFloat(affordMatch[1].replace(/,/g, '')) : 5000;
    const availableBalance = userState.accounts ? 
      userState.accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) : 
      (mEarned - mSpent);

    const budgetRemaining = budget > 0 ? (budget - mSpent) : availableBalance;
    const isAffordable = availableBalance >= testAmount && (budget <= 0 || budgetRemaining >= testAmount);

    let verdict = '';
    if (availableBalance < testAmount) {
      verdict = `⚠️ **High Impact Warning**: This purchase of **${currency}${testAmount.toLocaleString('en-IN')}** exceeds your current total available balance (**${currency}${availableBalance.toLocaleString('en-IN')}**). It is not recommended right now.`;
    } else if (budget > 0 && budgetRemaining < testAmount) {
      verdict = `⚠️ **Budget Alert**: You have enough account balance, but this purchase of **${currency}${testAmount.toLocaleString('en-IN')}** will exceed your remaining monthly budget (**${currency}${budgetRemaining.toLocaleString('en-IN')}**) by **${currency}${(testAmount - budgetRemaining).toLocaleString('en-IN')}**. Consider postponing until next month.`;
    } else {
      const remainingAfter = availableBalance - testAmount;
      verdict = `✅ **Comfortably Affordable**: You have **${currency}${availableBalance.toLocaleString('en-IN')}** in available funds and **${currency}${budgetRemaining.toLocaleString('en-IN')}** remaining in your budget. After this purchase, you'll still have **${currency}${remainingAfter.toLocaleString('en-IN')}** available.`;
    }

    return {
      reply: verdict,
      dataPoints: { purchaseAmount: testAmount, currentBalance: availableBalance, remainingBudget: budgetRemaining },
      actions: ['Purchase Assistant', 'What-If Simulator']
    };
  }

  // Question: How much did I save? / Savings rate
  if (p.includes('save') || p.includes('savings')) {
    const rate = mEarned > 0 ? ((mSavings / mEarned) * 100).toFixed(1) : 0;
    return {
      reply: `For this month:\n- **Total Income:** ${currency}${mEarned.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n- **Total Outflow:** ${currency}${mSpent.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n- **Net Savings:** ${currency}${mSavings.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n- **Savings Rate:** **${rate}%** of your income.\n\n` +
             (mSavings > 0 ? `🎯 Outstanding job! Maintain this trajectory to reach your financial goals faster.` : `⚠️ Your spending matches or exceeds your income this month. Check the Emergency & Budget sections to optimize discretionary expenses.`),
      dataPoints: { income: mEarned, expenses: mSpent, savings: mSavings, rate },
      actions: ['Add to Goals', 'View Health Score']
    };
  }

  // General Financial Status
  return {
    reply: `Here is a summary of your financial pulse for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}:\n\n` +
           `• **Monthly Income:** ${currency}${mEarned.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n` +
           `• **Monthly Spending:** ${currency}${mSpent.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n` +
           `• **Top Spending Category:** ${topCat} (${currency}${topCatAmount.toLocaleString('en-IN')})\n` +
           `• **Budget Status:** ${budget > 0 ? `${((mSpent/budget)*100).toFixed(0)}% used of ${currency}${budget.toLocaleString('en-IN')}` : 'No budget configured'}\n\n` +
           `You can ask me questions like:\n` +
           `👉 *"Can I afford a ₹10,000 purchase?"*\n` +
           `👉 *"Where am I spending the most?"*\n` +
           `👉 *"How much did I save this month?"*\n` +
           `👉 *"Give me tips to reduce food expenses"*`,
    dataPoints: { spent: mSpent, earned: mEarned, topCategory: topCat },
    actions: ['Check Dashboard', 'Ask Affordability', 'View Analytics']
  };
}

// Receipt text parser
function parseReceiptText(rawText) {
  const text = rawText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let detectedMerchant = '';
  let detectedDate = new Date().toISOString().split('T')[0];
  let detectedAmount = 0;
  let detectedTax = 0;
  let items = [];

  // Try finding merchant from first non-empty lines
  if (lines.length > 0) {
    detectedMerchant = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
  }

  // Date regex matching DD/MM/YYYY, YYYY-MM-DD, etc.
  const dateRegex = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    const rawDate = dateMatch[0];
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      detectedDate = parsed.toISOString().split('T')[0];
    }
  }

  // Amount regex looking for total / grand total / net amount / amount
  const totalRegex = /(?:total|grand\s*total|net\s*amount|amount|subtotal|balance\s*due)[\s:]*([₹$€£]?)\s*([\d,]+\.?\d*)/i;
  const match = text.match(totalRegex);
  if (match) {
    detectedAmount = parseFloat(match[2].replace(/,/g, '')) || 0;
  } else {
    // Look for largest decimal number
    const numbers = text.match(/\b\d+\.\d{2}\b/g);
    if (numbers) {
      const maxVal = Math.max(...numbers.map(n => parseFloat(n)));
      if (maxVal > 0) detectedAmount = maxVal;
    }
  }

  // Tax regex
  const taxMatch = text.match(/(?:tax|gst|vat|cgst|sgst)[\s:]*([₹$€£]?)\s*([\d,]+\.?\d*)/i);
  if (taxMatch) {
    detectedTax = parseFloat(taxMatch[2].replace(/,/g, '')) || 0;
  }

  return {
    merchant: detectedMerchant || 'Retail Merchant',
    date: detectedDate,
    amount: detectedAmount,
    totalAmount: detectedAmount,
    tax: detectedTax,
    category: smartCategorize(detectedMerchant || text, detectedAmount).category,
    rawTextLength: text.length
  };
}

function createServer(port) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    // ==========================================
    // BACKEND REST API ROUTES
    // ==========================================
    if (pathname.startsWith('/api/')) {
      try {
        // API: Health Check
        if (pathname === '/api/health' && req.method === 'GET') {
          return sendJson(res, 200, { status: 'healthy', version: '2.0.0', platform: 'Budget Buddy' });
        }

        // API: User Sync / Save
        if (pathname === '/api/user/sync' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const username = body.username;
          if (!username) return sendJson(res, 400, { error: 'Username is required' });

          const filePath = getUserFilePath(username);
          fs.writeFileSync(filePath, JSON.stringify(body.userData || {}, null, 2), 'utf8');
          return sendJson(res, 200, { success: true, message: 'User state saved securely to cloud/local disk', timestamp: new Date().toISOString() });
        }

        // API: User Data Retrieval
        if (pathname === '/api/user/data' && req.method === 'GET') {
          const username = parsedUrl.query.username;
          if (!username) return sendJson(res, 400, { error: 'Username query parameter is required' });

          const filePath = getUserFilePath(username);
          if (!fs.existsSync(filePath)) {
            return sendJson(res, 404, { error: 'User record not found on server' });
          }
          const content = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, 200, { success: true, userData: JSON.parse(content) });
        }

        // API: AI Smart Categorization
        if (pathname === '/api/ai/categorize' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const result = smartCategorize(body.title, body.amount);
          return sendJson(res, 200, { success: true, suggestion: result });
        }

        // API: AI Conversational Financial Assistant
        if (pathname === '/api/ai/assistant' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const result = processAiFinancialQuery(body.userState || {}, body.prompt || '');
          return sendJson(res, 200, { success: true, result });
        }

        // API: OCR / Receipt Text Parser
        if (pathname === '/api/ai/parse-receipt' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const parsed = parseReceiptText(body.text || '');
          return sendJson(res, 200, { success: true, receiptData: parsed });
        }

        // 404 for unmatched API routes
        return sendJson(res, 404, { error: 'API route not found' });
      } catch (err) {
        console.error('API Error:', err);
        const status = err.statusCode || 500;
        return sendJson(res, status, { error: err.message || 'Internal server error' });
      }
    }

    // ==========================================
    // STATIC FILE SERVER & SPA FALLBACK
    // ==========================================
    let cleanPath = pathname === '/' ? '/index.html' : pathname;
    let filePath = path.resolve(BASE_DIR, '.' + cleanPath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(path.resolve(BASE_DIR))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // SPA Fallback: If route has no file extension, fallback to index.html
        if (!path.extname(filePath)) {
          filePath = path.join(BASE_DIR, 'index.html');
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
          res.end('404 Not Found');
          return;
        }
      } else if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
          res.end('404 Not Found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        res.end(content);
      });
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      createServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`Budget Buddy Server is Live!`);
    console.log(`Localhost URL: http://localhost:${port}`);
    console.log(`REST APIs: http://localhost:${port}/api/health`);
    console.log(`======================================================\n`);
  });
}

createServer(preferredPort);
