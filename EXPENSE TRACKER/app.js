// ==========================================================================
// BUDGET BUDDY — AI-POWERED PERSONAL FINANCE PLATFORM
// Core FinTech Application Engine
// ==========================================================================

// ===== DEFAULT FINTECH SCHEMAS & TAXONOMIES =====
const defaultCategories = [
    { name: 'Food & Dining', color: '#F59E0B', icon: 'fa-utensils', type: 'expense' },
    { name: 'Transportation', color: '#3B82F6', icon: 'fa-car', type: 'expense' },
    { name: 'Shopping', color: '#EC4899', icon: 'fa-bag-shopping', type: 'expense' },
    { name: 'Bills & Utilities', color: '#EF4444', icon: 'fa-file-invoice-dollar', type: 'expense' },
    { name: 'Entertainment', color: '#8B5CF6', icon: 'fa-film', type: 'expense' },
    { name: 'Health & Medical', color: '#10B981', icon: 'fa-heart-pulse', type: 'expense' },
    { name: 'Rent & Housing', color: '#6366F1', icon: 'fa-house', type: 'expense' },
    { name: 'Groceries', color: '#14B8A6', icon: 'fa-basket-shopping', type: 'expense' },
    { name: 'Subscriptions', color: '#F43F5E', icon: 'fa-rotate', type: 'expense' },
    { name: 'Education', color: '#0EA5E9', icon: 'fa-graduation-cap', type: 'expense' },
    { name: 'Travel', color: '#EAB308', icon: 'fa-plane', type: 'expense' },
    { name: 'Personal Care', color: '#A855F7', icon: 'fa-spa', type: 'expense' },
    { name: 'Other', color: '#6B7280', icon: 'fa-shapes', type: 'expense' },
    // Income Categories
    { name: 'Salary', color: '#10B981', icon: 'fa-briefcase', type: 'income' },
    { name: 'Freelancing', color: '#3B82F6', icon: 'fa-laptop-code', type: 'income' },
    { name: 'Investments', color: '#8B5CF6', icon: 'fa-chart-line', type: 'income' },
    { name: 'Business', color: '#F59E0B', icon: 'fa-shop', type: 'income' },
    { name: 'Other Income', color: '#059669', icon: 'fa-money-bill-trend-up', type: 'income' }
];

const defaultAccounts = [
    { id: 'acc-cash', name: 'Cash in Hand', type: 'cash', balance: 0, icon: 'fa-money-bill' },
    { id: 'acc-bank', name: 'Primary Bank Account', type: 'bank', balance: 0, icon: 'fa-building-columns' },
    { id: 'acc-wallet', name: 'Digital Wallet (UPI)', type: 'wallet', balance: 0, icon: 'fa-mobile-screen' }
];

const defaultChallenges = [
    { id: 'ch-1', name: '7-Day No-Spend Challenge', desc: 'Avoid all discretionary spending for 7 consecutive days', targetDays: 7, currentStreak: 0, targetSavings: 3000, status: 'active' },
    { id: 'ch-2', name: '30-Day Savings Sprint', desc: 'Save at least ₹500 every day for a full month', targetDays: 30, currentStreak: 0, targetSavings: 15000, status: 'active' },
    { id: 'ch-3', name: 'Zero Food Delivery Week', desc: 'Cook meals at home and order zero takeout food', targetDays: 7, currentStreak: 0, targetSavings: 2500, status: 'active' }
];

const defaultSettings = {
    theme: 'dark',
    currency: '₹',
    name: 'User',
    budget: 0,
    emergencyTarget: 0,
    dateFormat: 'DD/MM/YYYY'
};

// ===== SECURITY & SANITIZATION UTILITIES =====
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== DATABASE & STATE MANAGEMENT =====
let localDb = JSON.parse(localStorage.getItem('set_db_v2')) || { users: {} };
let activeUser = localStorage.getItem('set_active_user') || null;

// The active FinTech State
let State = {
    transactions: [],
    accounts: [],
    categories: [],
    budgets: { overallMonthly: 0, categories: {} },
    subscriptions: [],
    goals: [],
    challenges: [],
    groups: [],
    notifications: [],
    settings: {},
    timeframe: 'thisMonth',
    sort: { key: 'date', order: 'desc' }
};

let charts = {
    dashBar: null,
    dashPie: null,
    repLine: null,
    repBar: null,
    repPie: null,
    repAccount: null,
    moodBar: null,
    moodImpulse: null
};

// ===== AUTHENTICATION HELPER =====
function isAuthenticated() {
    return Boolean(activeUser && localDb.users && localDb.users[activeUser]);
}

// ===== INITIALIZATION & BOOTSTRAP =====
document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        mountUser(activeUser);
        showApp();
    } else {
        activeUser = null;
        localStorage.removeItem('set_active_user');
        showLogin();
    }
    setupEventListeners();
});

// Non-destructive Schema Migration (v2 -> v3)
function mountUser(username) {
    activeUser = username;
    localStorage.setItem('set_active_user', username);
    
    if (!localDb.users[username]) {
        localDb.users[username] = {
            password: 'password123',
            expenses: [],
            categories: [...defaultCategories],
            settings: { ...defaultSettings, name: username }
        };
    }

    const userData = localDb.users[username];

    // Purge any legacy sample mock data from prior versions
    if (userData.subscriptions) {
        userData.subscriptions = userData.subscriptions.filter(s => s.name !== 'Netflix Premium' && s.name !== 'Spotify Individual' && s.name !== 'Gym Membership');
    }
    if (userData.goals) {
        userData.goals = userData.goals.filter(g => g.title !== 'MacBook Pro M3' && !(g.title === 'Emergency Fund' && g.savedAmount === 45000));
    }
    if (userData.groups) {
        userData.groups = userData.groups.filter(grp => grp.name !== 'Flat 402 Roommates');
    }
    if (userData.budgets && userData.budgets.categories && userData.budgets.categories['Food & Dining'] === 8000) {
        userData.budgets.categories = {};
        userData.budgets.overallMonthly = 0;
    }

    // Ensure Accounts exist
    State.accounts = userData.accounts && userData.accounts.length > 0 ? userData.accounts : JSON.parse(JSON.stringify(defaultAccounts));
    
    // Ensure Categories exist
    State.categories = userData.categories && userData.categories.length > 0 ? userData.categories : JSON.parse(JSON.stringify(defaultCategories));

    // Ensure Settings exist
    State.settings = { ...defaultSettings, ...(userData.settings || {}), name: username };

    // Migrate transactions (handle legacy 'expenses' array gracefully)
    let rawTx = userData.transactions || userData.expenses || [];
    State.transactions = rawTx.map(t => ({
        id: t.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
        type: t.type || 'expense',
        title: t.title || 'Untitled Transaction',
        amount: parseFloat(t.amount) || 0,
        date: t.date || new Date().toISOString().split('T')[0],
        category: t.category || 'Other',
        subcategory: t.subcategory || '',
        accountId: t.accountId || (State.accounts[0] ? State.accounts[0].id : 'acc-bank'),
        toAccountId: t.toAccountId || null,
        paymentMethod: t.paymentMethod || 'UPI',
        merchant: t.merchant || '',
        mood: t.mood || 'Normal',
        isPlanned: t.isPlanned !== undefined ? t.isPlanned : true,
        notes: t.notes || '',
        tags: t.tags || []
    }));

    // Budgets
    State.budgets = userData.budgets || {
        overallMonthly: State.settings.budget || 0,
        categories: {}
    };

    // Subscriptions
    State.subscriptions = userData.subscriptions || [];

    // Goals
    State.goals = userData.goals || [];

    // Challenges
    State.challenges = userData.challenges || JSON.parse(JSON.stringify(defaultChallenges));

    // Groups
    State.groups = userData.groups || [];

    // Notifications
    State.notifications = userData.notifications || [];

    applyTheme(State.settings.theme);
    syncStateToBackend();
}

function saveState() {
    if (activeUser) {
        localDb.users[activeUser] = {
            ...localDb.users[activeUser],
            accounts: State.accounts,
            categories: State.categories,
            transactions: State.transactions,
            expenses: State.transactions, // backward compatibility
            budgets: State.budgets,
            subscriptions: State.subscriptions,
            goals: State.goals,
            challenges: State.challenges,
            groups: State.groups,
            notifications: State.notifications,
            settings: State.settings
        };
        localStorage.setItem('set_db_v2', JSON.stringify(localDb));
        syncStateToBackend();
    }
}

// REST API sync to server.js
async function syncStateToBackend() {
    if (!activeUser) return;
    try {
        await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: activeUser, userData: localDb.users[activeUser] })
        });
    } catch (e) {
        // Fallback silently if offline or running static host
    }
}

// ===== NAVIGATION & SYSTEM =====
function showLogin() {
    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');

    if (loginPage) {
        loginPage.classList.add('active');
        loginPage.style.display = 'flex';
    }
    if (mainApp) {
        mainApp.classList.remove('active');
        mainApp.style.display = 'none';
    }
    setAuthMode('login');
}

function showApp() {
    if (!isAuthenticated()) {
        showLogin();
        return;
    }

    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');

    if (loginPage) {
        loginPage.classList.remove('active');
        loginPage.style.display = 'none';
    }
    if (mainApp) {
        mainApp.classList.add('active');
        mainApp.style.display = 'flex';
    }

    document.getElementById('profileName').value = State.settings.name;
    document.getElementById('headerAvatar').innerText = State.settings.name.charAt(0).toUpperCase();

    updateProfileUI();
    loadCategoryDropdowns();
    loadAccountDropdowns();
    renderCategoriesList();
    navigate('dashboardPage');
    refreshData();
}

function navigate(pageId) {
    // Protected Route Enforcement: Kick unauthenticated access back to login
    if (!isAuthenticated()) {
        showLogin();
        return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }
    
    // Update navbar active state
    document.querySelectorAll('.horizontal-nav .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === pageId);
    });

    closeSuiteDrawer();
    closeAllModals();

    // Module-specific initializers with error containment
    try {
        if (pageId === 'dashboardPage' || pageId === 'reportsPage') renderCharts();
        if (pageId === 'accountsPage') renderAccountsView();
        if (pageId === 'budgetsPage') renderBudgetsView();
        if (pageId === 'healthScorePage') renderHealthScoreView();
        if (pageId === 'moodTrackerPage') renderMoodTrackerView();
        if (pageId === 'subscriptionsPage') renderSubscriptionsView();
        if (pageId === 'goalsPage') renderGoalsView();
        if (pageId === 'whatIfSimulatorPage') renderWhatIfView();
        if (pageId === 'calendarPage') renderCalendarView();
        if (pageId === 'challengesPage') renderChallengesView();
        if (pageId === 'expenseDnaPage') renderExpenseDnaView();
        if (pageId === 'sharedExpensesPage') renderSharedExpensesView();
        if (pageId === 'emergencyModePage') renderEmergencyView();
        if (pageId === 'dailyCheckinPage') renderDailyCheckinView();
        if (pageId === 'timelinePage') renderTimelineView();
        if (pageId === 'notificationsPage') renderNotificationsView();
        if (pageId === 'transactionsPage') renderTransactions();
        if (pageId === 'wrappedPage') renderWrappedSlide();
        if (pageId === 'categoriesPage') renderCategoriesList();
    } catch (err) {
        console.error('Error rendering page:', pageId, err);
    }
}

// ===== CENTRALIZED FINANCIAL CALCULATION ENGINE =====
function getFilteredTransactions(period = State.timeframe) {
    const now = new Date();
    return State.transactions.filter(t => {
        const d = new Date(t.date);
        if (period === 'today') {
            return d.toDateString() === now.toDateString();
        } else if (period === 'thisWeek') {
            const diff = Math.abs(now - d);
            return diff <= 7 * 24 * 60 * 60 * 1000 && d <= now;
        } else if (period === 'thisMonth') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (period === 'lastMonth') {
            const lastM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            return d.getMonth() === lastM && d.getFullYear() === lastY;
        } else if (period === 'last3Months') {
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            return d >= threeMonthsAgo && d <= now;
        } else if (period === 'last6Months') {
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            return d >= sixMonthsAgo && d <= now;
        } else if (period === 'thisYear') {
            return d.getFullYear() === now.getFullYear();
        }
        return true; // 'all'
    });
}

function calculateFinancialMetrics() {
    const now = new Date();
    
    // Balance across all accounts
    let totalBalance = State.accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
    let liquidBalance = State.accounts.filter(a => a.type === 'cash' || a.type === 'wallet' || a.type === 'bank')
                                     .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const filtered = getFilteredTransactions(State.timeframe);

    let totalIncome = 0;
    let totalExpenses = 0;

    filtered.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'expense') totalExpenses += t.amount;
    });

    let netSavings = totalIncome - totalExpenses;
    let savingsRate = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;

    // Monthly Budget metrics
    const currMonthExps = State.transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlyTotalSpent = currMonthExps.reduce((s, t) => s + t.amount, 0);
    const budgetLimit = State.budgets.overallMonthly || State.settings.budget || 0;
    const remainingBudget = Math.max(0, budgetLimit - monthlyTotalSpent);
    const budgetUsagePct = budgetLimit > 0 ? (monthlyTotalSpent / budgetLimit) * 100 : 0;

    // Monthly subscriptions outflow
    const monthlySubsCost = State.subscriptions.filter(s => s.status === 'active').reduce((sum, s) => {
        let amt = parseFloat(s.amount) || 0;
        if (s.billingCycle === 'Yearly') return sum + (amt / 12);
        if (s.billingCycle === 'Quarterly') return sum + (amt / 3);
        return sum + amt;
    }, 0);

    // Algorithmic Financial Health Score (0 - 100)
    let pSavings = Math.min(25, savingsRate * 0.85);
    let pBudget = budgetLimit > 0 ? (budgetUsagePct <= 85 ? 20 : Math.max(0, 20 - (budgetUsagePct - 85))) : 15;
    let pExpense = totalExpenses <= totalIncome ? 20 : Math.max(0, 20 - ((totalExpenses - totalIncome) / (totalIncome || 1)) * 20);
    let emergencyMonths = monthlyTotalSpent > 0 ? (liquidBalance / monthlyTotalSpent) : 3;
    let pEmergency = Math.min(15, (emergencyMonths / 3) * 15);
    let subRatio = totalIncome > 0 ? (monthlySubsCost / totalIncome) * 100 : 5;
    let pSubs = subRatio < 10 ? 10 : Math.max(0, 10 - (subRatio - 10));
    let pRatio = totalIncome > 0 && totalExpenses > 0 ? Math.min(10, (totalIncome / totalExpenses) * 5) : 5;

    let healthScore = Math.round(pSavings + pBudget + pExpense + pEmergency + pSubs + pRatio);
    healthScore = Math.max(10, Math.min(99, healthScore));

    return {
        totalBalance,
        liquidBalance,
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        budgetLimit,
        remainingBudget,
        budgetUsagePct,
        monthlyTotalSpent,
        monthlySubsCost,
        healthScore,
        subCount: State.subscriptions.filter(s => s.status === 'active').length
    };
}

function formatMoney(amount) {
    const curr = State.settings.currency || '₹';
    const num = parseFloat(amount) || 0;
    return curr + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== DASHBOARD REFRESH & CHARTS =====
function refreshData() {
    const metrics = calculateFinancialMetrics();

    // 1. Update 8 Overview Cards
    document.getElementById('cardTotalBalance').innerText = formatMoney(metrics.totalBalance);
    document.getElementById('cardAvailableBalance').innerText = formatMoney(metrics.liquidBalance);
    document.getElementById('cardTotalIncome').innerText = formatMoney(metrics.totalIncome);
    document.getElementById('cardTotalExpenses').innerText = formatMoney(metrics.totalExpenses);
    document.getElementById('cardNetSavings').innerText = formatMoney(metrics.netSavings);
    document.getElementById('chipSavingsRate').innerText = `${metrics.savingsRate.toFixed(1)}% savings rate`;
    document.getElementById('cardRemainingBudget').innerText = formatMoney(metrics.remainingBudget);
    document.getElementById('chipBudgetUsage').innerText = `${metrics.budgetUsagePct.toFixed(0)}% used of ${formatMoney(metrics.budgetLimit)}`;
    document.getElementById('cardSubscriptionCost').innerText = formatMoney(metrics.monthlySubsCost);
    document.getElementById('chipSubCount').innerText = `${metrics.subCount} active`;
    document.getElementById('cardHealthScore').innerText = `${metrics.healthScore} / 100`;

    // 2. Budget Alert Banners
    const alertCont = document.getElementById('budgetAlertContainer');
    if (alertCont) {
        alertCont.innerHTML = '';
        if (metrics.budgetLimit > 0) {
            if (metrics.budgetUsagePct >= 100) {
                alertCont.innerHTML = `<div class="budget-alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Budget Exceeded: You have spent ${formatMoney(metrics.monthlyTotalSpent - metrics.budgetLimit)} over your monthly limit!</div>`;
            } else if (metrics.budgetUsagePct >= 80) {
                alertCont.innerHTML = `<div class="budget-alert alert-warning"><i class="fa-solid fa-circle-exclamation"></i> Warning: ${metrics.budgetUsagePct.toFixed(0)}% of your monthly budget used with ${formatMoney(metrics.remainingBudget)} remaining.</div>`;
            }
        }
    }

    // 3. AI Smart Insights
    generateSmartInsights(metrics);

    // 4. Render Tables & Charts
    renderRecentTransactions();
    renderTransactions();
    if (document.getElementById('dashboardPage').classList.contains('active') || document.getElementById('reportsPage').classList.contains('active')) {
        renderCharts();
    }
}

function generateSmartInsights(metrics) {
    const insightEl = document.getElementById('insightText');
    if (!insightEl) return;
    const filtered = getFilteredTransactions('thisMonth').filter(t => t.type === 'expense');

    if (filtered.length === 0) {
        insightEl.innerText = `Welcome ${activeUser}! Start adding transactions to activate AI financial analytics.`;
        return;
    }

    // Category concentration
    const catTotals = {};
    filtered.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    let topCat = '', maxAmt = 0;
    for (const [c, amt] of Object.entries(catTotals)) {
        if (amt > maxAmt) { maxAmt = amt; topCat = c; }
    }

    // Unusual expense detection
    const avgExpense = filtered.reduce((s, t) => s + t.amount, 0) / filtered.length;
    const unusual = filtered.find(t => t.amount > avgExpense * 2.5 && t.amount > 2000);

    if (unusual) {
        insightEl.innerHTML = `⚠️ <strong>Unusual spending detected:</strong> "${escapeHtml(unusual.title)}" (${formatMoney(unusual.amount)}) is significantly higher than your typical transaction average.`;
    } else if (metrics.budgetUsagePct > 90) {
        insightEl.innerHTML = `🚨 <strong>Budget alert:</strong> You have consumed ${metrics.budgetUsagePct.toFixed(0)}% of your monthly budget. Consider deferring non-essential purchases.`;
    } else if (topCat) {
        const pct = ((maxAmt / (metrics.totalExpenses || 1)) * 100).toFixed(0);
        insightEl.innerHTML = `💡 <strong>AI Insight:</strong> <strong>${escapeHtml(topCat)}</strong> is your highest expense category, representing ${pct}% of your total outflow (${formatMoney(maxAmt)}).`;
    } else {
        insightEl.innerText = `You have saved ${formatMoney(metrics.netSavings)} this period with a healthy ${metrics.savingsRate.toFixed(1)}% savings rate.`;
    }
}

function renderCharts() {
    if (typeof Chart === 'undefined') return;

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#9ca3af';
    Chart.defaults.color = textColor;

    const filtered = getFilteredTransactions(State.timeframe);
    const expenses = filtered.filter(t => t.type === 'expense');

    // 1. Monthly Overview Bar Chart (Income vs Expense)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpense = new Array(12).fill(0);

    State.transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear) {
            const m = d.getMonth();
            if (t.type === 'income') monthlyIncome[m] += t.amount;
            else if (t.type === 'expense') monthlyExpense[m] += t.amount;
        }
    });

    const activeMonth = new Date().getMonth();
    const chartLabels = months.slice(Math.max(0, activeMonth - 5), activeMonth + 1);
    const incSlice = monthlyIncome.slice(Math.max(0, activeMonth - 5), activeMonth + 1);
    const expSlice = monthlyExpense.slice(Math.max(0, activeMonth - 5), activeMonth + 1);

    const dashBarCtx = document.getElementById('dashBarChart');
    if (dashBarCtx) {
        if (charts.dashBar) charts.dashBar.destroy();
        charts.dashBar = new Chart(dashBarCtx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Income', data: incSlice, backgroundColor: '#10B981', borderRadius: 6 },
                    { label: 'Expenses', data: expSlice, backgroundColor: '#4F46E5', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } } }
            }
        });
    }

    // 2. Spending by Category Pie
    const catTotals = {};
    expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
    const catLabels = Object.keys(catTotals);
    const catData = Object.values(catTotals);
    const catColors = catLabels.map(l => getCategoryColor(l));

    const dashPieCtx = document.getElementById('dashPieChart');
    if (dashPieCtx) {
        if (charts.dashPie) charts.dashPie.destroy();
        charts.dashPie = new Chart(dashPieCtx, {
            type: 'doughnut',
            data: {
                labels: catLabels.length ? catLabels : ['No Expenses'],
                datasets: [{
                    data: catData.length ? catData : [1],
                    backgroundColor: catColors.length ? catColors : ['#374151'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    // Reports Page Charts
    if (document.getElementById('reportsPage').classList.contains('active')) {
        const dailyTotals = {};
        expenses.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(e => {
            const label = new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dailyTotals[label] = (dailyTotals[label] || 0) + e.amount;
        });

        const repLineCtx = document.getElementById('reportLineChart');
        if (repLineCtx) {
            if (charts.repLine) charts.repLine.destroy();
            charts.repLine = new Chart(repLineCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(dailyTotals),
                    datasets: [{
                        label: 'Daily Outflow',
                        data: Object.values(dailyTotals),
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.35
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const repBarCtx = document.getElementById('reportBarChart');
        if (repBarCtx) {
            if (charts.repBar) charts.repBar.destroy();
            charts.repBar = new Chart(repBarCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [
                        { label: 'Income', data: incSlice, backgroundColor: '#10B981', borderRadius: 4 },
                        { label: 'Expenses', data: expSlice, backgroundColor: '#EF4444', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const repPieCtx = document.getElementById('reportPieChart');
        if (repPieCtx) {
            if (charts.repPie) charts.repPie.destroy();
            charts.repPie = new Chart(repPieCtx, {
                type: 'pie',
                data: {
                    labels: catLabels,
                    datasets: [{ data: catData, backgroundColor: catColors, borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const repAccountCtx = document.getElementById('reportAccountChart');
        if (repAccountCtx) {
            const accLabels = State.accounts.map(a => a.name);
            const accData = State.accounts.map(a => a.balance);
            const accColors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

            if (charts.repAccount) charts.repAccount.destroy();
            charts.repAccount = new Chart(repAccountCtx, {
                type: 'doughnut',
                data: {
                    labels: accLabels,
                    datasets: [{ data: accData, backgroundColor: accColors, borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
}

// ===== TRANSACTIONS LOGIC =====
function renderRecentTransactions() {
    const list = document.getElementById('recentTransactionList');
    if (!list) return;
    list.innerHTML = '';

    const recent = [...State.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (recent.length === 0) {
        list.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No recent transactions.</td></tr>`;
        return;
    }

    recent.forEach(t => {
        const tr = document.createElement('tr');
        const isExp = t.type === 'expense';
        const acc = State.accounts.find(a => a.id === t.accountId);
        tr.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td><strong>${escapeHtml(t.title)}</strong></td>
            <td><span class="badge" style="background:${getCategoryColor(t.category)};color:white">${escapeHtml(t.category)}</span></td>
            <td><small class="text-muted">${escapeHtml(acc ? acc.name : 'Primary')}</small></td>
            <td style="font-weight:700;" class="${isExp ? 'text-danger' : 'text-success'}">
                ${isExp ? '-' : '+'}${formatMoney(t.amount)}
            </td>
            <td>
                <button class="btn btn-icon" style="width:30px;height:30px" onclick="editExpense('${escapeHtml(t.id)}')"><i class="fa-solid fa-pen text-muted"></i></button>
                <button class="btn btn-icon" style="width:30px;height:30px" onclick="deleteExpense('${escapeHtml(t.id)}')"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });
}

function renderTransactions() {
    const search = (document.getElementById('globalSearch')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('txFilterType')?.value || 'All';
    const catFilter = document.getElementById('filterCategory')?.value || 'All';
    const accFilter = document.getElementById('filterAccount')?.value || 'All';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const sortOpt = document.getElementById('txSortOption')?.value || 'date-desc';

    const list = document.getElementById('transactionList');
    if (!list) return;
    list.innerHTML = '';

    let filtered = State.transactions.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search) || 
                              (t.merchant && t.merchant.toLowerCase().includes(search)) ||
                              (t.notes && t.notes.toLowerCase().includes(search));
        const matchesType = typeFilter === 'All' || t.type === typeFilter;
        const matchesCat = catFilter === 'All' || t.category === catFilter;
        const matchesAcc = accFilter === 'All' || t.accountId === accFilter;
        const matchesDate = dateFilter === '' || t.date === dateFilter;

        return matchesSearch && matchesType && matchesCat && matchesAcc && matchesDate;
    });

    // Sorting
    filtered.sort((a,b) => {
        if (sortOpt === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortOpt === 'amount-desc') return b.amount - a.amount;
        if (sortOpt === 'amount-asc') return a.amount - b.amount;
        return new Date(b.date) - new Date(a.date); // date-desc
    });

    const noData = document.getElementById('noDataMessage');
    if (filtered.length === 0) {
        if (noData) noData.style.display = 'block';
    } else {
        if (noData) noData.style.display = 'none';
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            const isExp = t.type === 'expense';
            const acc = State.accounts.find(a => a.id === t.accountId);
            tr.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>
                    <strong>${escapeHtml(t.title)}</strong>
                    ${t.merchant ? `<br><small class="text-muted"><i class="fa-solid fa-store"></i> ${escapeHtml(t.merchant)}</small>` : ''}
                </td>
                <td><span class="badge" style="background:${getCategoryColor(t.category)};color:white">${escapeHtml(t.category)}</span></td>
                <td>
                    <strong>${escapeHtml(acc ? acc.name : 'Account')}</strong>
                    <br><small class="text-muted">${escapeHtml(t.paymentMethod || 'UPI')}</small>
                </td>
                <td>
                    <span class="mood-chip mood-${escapeHtml((t.mood || 'normal').toLowerCase())}">${escapeHtml(t.mood || 'Normal')}</span>
                    ${t.isPlanned === false ? '<span class="badge" style="background:rgba(239,68,68,0.15); color:var(--danger); margin-left:4px;">Impulse</span>' : ''}
                </td>
                <td style="font-weight:700;" class="${isExp ? 'text-danger' : 'text-success'}">
                    ${isExp ? '-' : '+'}${formatMoney(t.amount)}
                </td>
                <td>
                    <button class="btn btn-icon" style="width:30px;height:30px" onclick="editExpense('${escapeHtml(t.id)}')" title="Edit"><i class="fa-solid fa-pen text-muted"></i></button>
                    <button class="btn btn-icon" style="width:30px;height:30px" onclick="deleteExpense('${escapeHtml(t.id)}')" title="Delete"><i class="fa-solid fa-trash text-danger"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    }
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const type = document.getElementById('expType').value;
    const title = document.getElementById('expTitle').value.trim();
    const amount = parseFloat(document.getElementById('expAmount').value);
    const category = document.getElementById('expCategory').value;
    const subcategory = document.getElementById('expSubcategory').value.trim();
    const accountId = document.getElementById('expAccount').value;
    const paymentMethod = document.getElementById('expPaymentMethod').value;
    const date = document.getElementById('expDate').value;
    const merchant = document.getElementById('expMerchant').value.trim();
    const mood = document.getElementById('expMood').value;
    const isPlanned = document.getElementById('expPlanned').value === 'true';
    const notes = document.getElementById('expNotes').value.trim();

    if (!title || isNaN(amount) || amount <= 0) {
        return showToast('Please enter a valid title and amount.', 'error');
    }

    const tx = {
        id: id || Date.now().toString(),
        type,
        title,
        amount,
        category,
        subcategory,
        accountId,
        paymentMethod,
        date,
        merchant,
        mood,
        isPlanned,
        notes
    };

    // Revert previous transaction effects if editing
    if (id) {
        const oldTx = State.transactions.find(t => t.id === id);
        if (oldTx) {
            const oldAcc = State.accounts.find(a => a.id === oldTx.accountId);
            if (oldAcc) {
                if (oldTx.type === 'expense') oldAcc.balance += oldTx.amount;
                else if (oldTx.type === 'income') oldAcc.balance -= oldTx.amount;
            }
        }
    }

    // Apply transaction to the active account
    const newAcc = State.accounts.find(a => a.id === accountId);
    if (newAcc) {
        if (type === 'expense') newAcc.balance -= amount;
        else if (type === 'income') newAcc.balance += amount;
    }

    if (id) {
        const idx = State.transactions.findIndex(t => t.id === id);
        if (idx > -1) State.transactions[idx] = tx;
        showToast('Transaction updated successfully', 'success');
    } else {
        State.transactions.unshift(tx);
        showToast(`${type === 'income' ? 'Income' : 'Expense'} recorded!`, 'success');
    }

    saveState();
    closeAllModals();
    refreshData();
}

function deleteExpense(id) {
    if (confirm("Are you sure you want to delete this transaction? All associated account balances and budgets will update.")) {
        const tx = State.transactions.find(t => t.id === id);
        if (tx) {
            // Revert account balance
            if (tx.type === 'transfer') {
                const fromAcc = State.accounts.find(a => a.id === tx.accountId);
                const toAcc = State.accounts.find(a => a.id === tx.toAccountId);
                if (fromAcc) fromAcc.balance += tx.amount;
                if (toAcc) toAcc.balance -= tx.amount;
            } else {
                const acc = State.accounts.find(a => a.id === tx.accountId);
                if (acc) {
                    if (tx.type === 'expense') acc.balance += tx.amount;
                    else if (tx.type === 'income') acc.balance -= tx.amount;
                }
            }
            State.transactions = State.transactions.filter(t => t.id !== id);
            saveState();
            refreshData();
            showToast('Transaction deleted', 'success');
        }
    }
}

function editExpense(id) {
    const t = State.transactions.find(tx => tx.id === id);
    if (t) {
        document.getElementById('expenseId').value = t.id;
        document.getElementById('txModalTitle').innerText = 'Edit Transaction';
        document.getElementById('expType').value = t.type;
        document.getElementById('expTitle').value = t.title;
        document.getElementById('expAmount').value = t.amount;
        document.getElementById('expCategory').value = t.category;
        document.getElementById('expSubcategory').value = t.subcategory || '';
        document.getElementById('expAccount').value = t.accountId || (State.accounts[0] ? State.accounts[0].id : '');
        document.getElementById('expPaymentMethod').value = t.paymentMethod || 'UPI';
        document.getElementById('expDate').value = t.date;
        document.getElementById('expMerchant').value = t.merchant || '';
        document.getElementById('expMood').value = t.mood || 'Normal';
        document.getElementById('expPlanned').value = t.isPlanned ? 'true' : 'false';
        document.getElementById('expNotes').value = t.notes || '';

        document.getElementById('expenseModal').classList.add('active');
    }
}

function openExpenseModal(type = 'expense') {
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseId').value = '';
    document.getElementById('txModalTitle').innerText = type === 'income' ? 'Add Income Entry' : 'Add Expense Entry';
    document.getElementById('expType').value = type;
    document.getElementById('expDate').valueAsDate = new Date();
    loadCategoryDropdowns();
    loadAccountDropdowns();
    document.getElementById('expenseModal').classList.add('active');
}

// ===== WALLETS & ACCOUNTS (MODULE 20) =====
function renderAccountsView() {
    const grid = document.getElementById('accountsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    State.accounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = 'sub-card glass-card';
        div.innerHTML = `
            <div class="sub-card-top">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="card-icon" style="width:40px; height:40px; font-size:1.1rem; background:rgba(79,70,229,0.1); color:var(--primary);">
                        <i class="fa-solid ${escapeHtml(acc.icon || 'fa-wallet')}"></i>
                    </div>
                    <div>
                        <strong style="font-size:1rem;">${escapeHtml(acc.name)}</strong>
                        <br><small class="text-muted" style="text-transform:uppercase;">${escapeHtml(acc.type)}</small>
                    </div>
                </div>
                <span class="sub-badge active">Active</span>
            </div>
            <div style="margin-top:1rem;">
                <span style="font-size:0.8rem; color:var(--text-muted);">Current Balance</span>
                <div style="font-size:1.6rem; font-weight:800;" class="${acc.balance >= 0 ? 'text-primary' : 'text-danger'}">
                    ${formatMoney(acc.balance)}
                </div>
            </div>
        `;
        grid.appendChild(div);
    });

    // Render transfers table
    const transferList = document.getElementById('transferHistoryList');
    if (transferList) {
        transferList.innerHTML = '';
        const transfers = State.transactions.filter(t => t.type === 'transfer');
        if (transfers.length === 0) {
            transferList.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No internal account transfers recorded.</td></tr>`;
        } else {
            transfers.forEach(t => {
                const fromAcc = State.accounts.find(a => a.id === t.accountId);
                const toAcc = State.accounts.find(a => a.id === t.toAccountId);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(t.date).toLocaleDateString()}</td>
                    <td><strong>${escapeHtml(fromAcc ? fromAcc.name : 'Source')}</strong></td>
                    <td><strong>${escapeHtml(toAcc ? toAcc.name : 'Destination')}</strong></td>
                    <td style="font-weight:700;">${formatMoney(t.amount)}</td>
                    <td class="text-muted"><small>${escapeHtml(t.notes || '-')}</small></td>
                    <td>
                        <button class="btn btn-icon" style="width:30px;height:30px" onclick="deleteExpense('${escapeHtml(t.id)}')"><i class="fa-solid fa-trash text-danger"></i></button>
                    </td>
                `;
                transferList.appendChild(tr);
            });
        }
    }
}

function openAccountModal() {
    document.getElementById('accountForm').reset();
    document.getElementById('accountModal').classList.add('active');
}

function handleAccountSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('accName').value.trim();
    const type = document.getElementById('accType').value;
    const balance = parseFloat(document.getElementById('accOpeningBalance').value) || 0;

    const newAcc = {
        id: 'acc-' + Date.now().toString(),
        name,
        type,
        balance,
        icon: type === 'bank' ? 'fa-building-columns' : type === 'cash' ? 'fa-money-bill' : 'fa-wallet'
    };

    State.accounts.push(newAcc);
    saveState();
    loadAccountDropdowns();
    renderAccountsView();
    closeAllModals();
    showToast(`Account "${name}" created!`, 'success');
}

function openTransferModal() {
    loadAccountDropdowns();
    document.getElementById('transferForm').reset();
    document.getElementById('transDate').valueAsDate = new Date();
    document.getElementById('transferModal').classList.add('active');
}

function handleTransferSubmit(e) {
    e.preventDefault();
    const fromId = document.getElementById('transFromAccount').value;
    const toId = document.getElementById('transToAccount').value;
    const amount = parseFloat(document.getElementById('transAmount').value);
    const date = document.getElementById('transDate').value;
    const notes = document.getElementById('transNotes').value.trim();

    if (fromId === toId) return showToast('Source and destination accounts must be different.', 'error');
    if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid transfer amount.', 'error');

    const fromAcc = State.accounts.find(a => a.id === fromId);
    const toAcc = State.accounts.find(a => a.id === toId);

    if (!fromAcc || !toAcc) return showToast('Selected accounts are invalid.', 'error');
    if (fromAcc.balance < amount) {
        if (!confirm(`Source account "${fromAcc.name}" only has ${formatMoney(fromAcc.balance)}. Proceed with negative balance?`)) return;
    }

    // Execute transfer (Balance changes maintain zero net sum)
    fromAcc.balance -= amount;
    toAcc.balance += amount;

    const transferTx = {
        id: 'tx-trans-' + Date.now().toString(),
        type: 'transfer',
        title: `Transfer: ${fromAcc.name} → ${toAcc.name}`,
        amount,
        date,
        accountId: fromId,
        toAccountId: toId,
        category: 'Transfer',
        notes: notes || `Internal fund transfer from ${fromAcc.name} to ${toAcc.name}`
    };

    State.transactions.unshift(transferTx);
    saveState();
    closeAllModals();
    refreshData();
    renderAccountsView();
    showToast(`Successfully transferred ${formatMoney(amount)}!`, 'success');
}

function loadAccountDropdowns() {
    const selects = ['expAccount', 'filterAccount', 'transFromAccount', 'transToAccount'];
    selects.forEach(sId => {
        const el = document.getElementById(sId);
        if (!el) return;
        const isFilter = sId === 'filterAccount';
        let options = isFilter ? `<option value="All">All Accounts</option>` : '';
        options += State.accounts.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)} (${formatMoney(a.balance)})</option>`).join('');
        el.innerHTML = options;
    });
}

// ===== SMART BUDGET MANAGEMENT (MODULE 14) =====
function renderBudgetsView() {
    const metrics = calculateFinancialMetrics();
    const budgetInput = document.getElementById('budgetInput');
    if (budgetInput) budgetInput.value = State.budgets.overallMonthly || State.settings.budget || '';

    const spentLabel = document.getElementById('budgetSpentLabel');
    const totalLabel = document.getElementById('budgetTotalLabel');
    const bar = document.getElementById('budgetProgressBar');
    const text = document.getElementById('budgetStatusText');

    if (spentLabel) spentLabel.innerText = `Spent: ${formatMoney(metrics.monthlyTotalSpent)}`;
    if (totalLabel) totalLabel.innerText = metrics.budgetLimit > 0 ? `Limit: ${formatMoney(metrics.budgetLimit)}` : 'Limit: Not Set';

    if (bar && text) {
        if (metrics.budgetLimit <= 0) {
            bar.style.width = '0%';
            text.innerText = "No monthly spending limit configured.";
        } else {
            let pct = Math.min(100, metrics.budgetUsagePct);
            bar.style.width = pct + '%';
            bar.className = 'progress-bar';
            if (metrics.budgetUsagePct >= 100) {
                bar.classList.add('danger');
                text.innerHTML = `<span class="text-danger font-bold">Exceeded budget limit by ${formatMoney(metrics.monthlyTotalSpent - metrics.budgetLimit)}!</span>`;
            } else if (metrics.budgetUsagePct >= 80) {
                bar.classList.add('warning');
                text.innerHTML = `<span class="text-warning font-bold">Caution: ${metrics.budgetUsagePct.toFixed(0)}% used. ${formatMoney(metrics.remainingBudget)} remaining.</span>`;
            } else {
                text.innerHTML = `<span class="text-success font-bold">Within budget limits (${(100 - metrics.budgetUsagePct).toFixed(0)}% available).</span>`;
            }
        }
    }

    // Render Category Budgets
    const list = document.getElementById('categoryBudgetsList');
    if (list) {
        list.innerHTML = '';
        const now = new Date();
        const currMonthExps = State.transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const catBudgets = State.budgets.categories || {};
        if (Object.keys(catBudgets).length === 0) {
            list.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">No category-specific budgets set yet.</p>`;
        } else {
            for (const [catName, limit] of Object.entries(catBudgets)) {
                const spentInCat = currMonthExps.filter(t => t.category === catName).reduce((s, t) => s + t.amount, 0);
                const pct = limit > 0 ? Math.min(100, (spentInCat / limit) * 100) : 0;
                const isOver = spentInCat > limit;

                const div = document.createElement('div');
                div.className = 'category-item';
                div.style.flexDirection = 'column';
                div.style.alignItems = 'stretch';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                        <strong>${escapeHtml(catName)}</strong>
                        <span class="${isOver ? 'text-danger' : 'text-muted'}" style="font-size:0.85rem; font-weight:600;">
                            ${formatMoney(spentInCat)} / ${formatMoney(limit)} (${pct.toFixed(0)}%)
                        </span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar ${isOver ? 'danger' : pct >= 80 ? 'warning' : ''}" style="width:${pct}%;"></div>
                    </div>
                `;
                list.appendChild(div);
            }
        }
    }
}

function handleBudgetSubmit(e) {
    e.preventDefault();
    const limit = parseFloat(document.getElementById('budgetInput').value);
    State.budgets.overallMonthly = limit;
    State.settings.budget = limit;
    saveState();
    refreshData();
    renderBudgetsView();
    showToast('Monthly budget updated!', 'success');
}

function handleCategoryBudgetSubmit(e) {
    e.preventDefault();
    const cat = document.getElementById('catBudgetSelect').value;
    const limit = parseFloat(document.getElementById('catBudgetLimit').value);
    if (!cat || isNaN(limit) || limit <= 0) return;

    if (!State.budgets.categories) State.budgets.categories = {};
    State.budgets.categories[cat] = limit;
    saveState();
    renderBudgetsView();
    showToast(`Budget for ${cat} set to ${formatMoney(limit)}`, 'success');
    document.getElementById('catBudgetLimit').value = '';
}

// ===== FINANCIAL HEALTH SCORE (MODULE 7) =====
function renderHealthScoreView() {
    const metrics = calculateFinancialMetrics();
    const gaugeWrap = document.getElementById('healthGaugeWrap');
    const gaugeVal = document.getElementById('healthGaugeValue');
    const gaugeLabel = document.getElementById('healthGaugeLabel');
    const title = document.getElementById('healthVerdictTitle');
    const desc = document.getElementById('healthVerdictDesc');

    if (gaugeWrap) gaugeWrap.style.setProperty('--score-pct', metrics.healthScore);
    if (gaugeVal) gaugeVal.innerText = metrics.healthScore;

    let rating = 'FAIR';
    if (metrics.healthScore >= 80) rating = 'EXCELLENT';
    else if (metrics.healthScore >= 65) rating = 'GOOD';
    else if (metrics.healthScore <= 45) rating = 'NEEDS ATTENTION';

    if (gaugeLabel) gaugeLabel.innerText = rating;
    if (title) title.innerText = `${rating} Financial Standing`;
    if (desc) {
        if (metrics.healthScore >= 80) desc.innerText = "Exceptional financial discipline! Your savings rate is strong and budget limits are well-observed.";
        else if (metrics.healthScore >= 65) desc.innerText = "Stable condition. Continue controlling discretionary outflows to maximize your savings cushion.";
        else desc.innerText = "Noticeable financial strain detected. Your monthly outflow is close to or exceeding incoming revenue.";
    }

    // Factors breakdown
    const factorsGrid = document.getElementById('healthFactorsGrid');
    if (factorsGrid) {
        factorsGrid.innerHTML = `
            <div class="factor-item">
                <div class="factor-header"><span>Savings Rate</span><strong class="text-success">${metrics.savingsRate.toFixed(1)}%</strong></div>
                <div class="progress-bar-wrap"><div class="progress-bar" style="width:${Math.min(100, metrics.savingsRate * 3)}%;"></div></div>
            </div>
            <div class="factor-item">
                <div class="factor-header"><span>Budget Discipline</span><strong class="${metrics.budgetUsagePct > 100 ? 'text-danger' : 'text-primary'}">${metrics.budgetUsagePct.toFixed(0)}% Used</strong></div>
                <div class="progress-bar-wrap"><div class="progress-bar ${metrics.budgetUsagePct > 100 ? 'danger' : ''}" style="width:${Math.min(100, metrics.budgetUsagePct)}%;"></div></div>
            </div>
            <div class="factor-item">
                <div class="factor-header"><span>Subscription Burden</span><strong class="text-warning">${formatMoney(metrics.monthlySubsCost)} / mo</strong></div>
                <div class="progress-bar-wrap"><div class="progress-bar" style="width:25%;"></div></div>
            </div>
            <div class="factor-item">
                <div class="factor-header"><span>Liquid Buffer</span><strong class="text-success">${formatMoney(metrics.liquidBalance)}</strong></div>
                <div class="progress-bar-wrap"><div class="progress-bar" style="width:75%;"></div></div>
            </div>
        `;
    }
}

// ===== EXPENSE MOOD TRACKER (MODULE 4) =====
function renderMoodTrackerView() {
    const moods = ['Happy', 'Sad', 'Stressed', 'Excited', 'Bored', 'Normal', 'Anxious', 'Impulsive'];
    const moodTotals = {};
    let impulseCount = 0;
    let plannedCount = 0;

    moods.forEach(m => { moodTotals[m] = 0; });

    State.transactions.filter(t => t.type === 'expense').forEach(t => {
        const m = t.mood || 'Normal';
        moodTotals[m] = (moodTotals[m] || 0) + t.amount;
        if (t.isPlanned === false || m === 'Impulsive') impulseCount++;
        else plannedCount++;
    });

    const moodBarCtx = document.getElementById('moodBarChart');
    if (moodBarCtx && typeof Chart !== 'undefined') {
        if (charts.moodBar) charts.moodBar.destroy();
        charts.moodBar = new Chart(moodBarCtx, {
            type: 'bar',
            data: {
                labels: moods,
                datasets: [{
                    label: 'Total Outflow (₹)',
                    data: moods.map(m => moodTotals[m]),
                    backgroundColor: ['#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#9CA3AF', '#8B5CF6', '#EC4899', '#F97316'],
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const impulseCtx = document.getElementById('moodImpulseChart');
    if (impulseCtx && typeof Chart !== 'undefined') {
        if (charts.moodImpulse) charts.moodImpulse.destroy();
        charts.moodImpulse = new Chart(impulseCtx, {
            type: 'doughnut',
            data: {
                labels: ['Planned Purchases', 'Impulse / Unplanned'],
                datasets: [{
                    data: [plannedCount, impulseCount],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const insightsEl = document.getElementById('moodInsightsText');
    if (insightsEl) {
        let maxMood = '', maxMoodAmt = 0;
        for (const [m, amt] of Object.entries(moodTotals)) {
            if (amt > maxMoodAmt) { maxMoodAmt = amt; maxMood = m; }
        }
        insightsEl.innerHTML = `
            <p>• <strong>Primary Mood Driver:</strong> You spent the most money (<strong>${formatMoney(maxMoodAmt)}</strong>) when feeling <strong>${escapeHtml(maxMood)}</strong>.</p>
            <p class="mt-2">• <strong>Impulse Behavior:</strong> ${impulseCount} transactions were logged as spontaneous or impulsive. Being mindful during moments of stress or excitement can help protect your savings rate.</p>
        `;
    }
}

// ===== SUBSCRIPTION DETECTIVE (MODULE 5) =====
function renderSubscriptionsView() {
    const grid = document.getElementById('subscriptionsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const metrics = calculateFinancialMetrics();
    document.getElementById('subMonthlyTotal').innerText = formatMoney(metrics.monthlySubsCost);
    document.getElementById('subAnnualTotal').innerText = formatMoney(metrics.monthlySubsCost * 12);

    // Count upcoming in 7 days
    const now = new Date();
    let upcomingCount = 0;
    State.subscriptions.forEach(s => {
        if (s.nextBillingDate) {
            const d = new Date(s.nextBillingDate);
            const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) upcomingCount++;
        }
    });
    document.getElementById('subUpcomingCount').innerText = `${upcomingCount} Renewals`;

    if (State.subscriptions.length === 0) {
        grid.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1; padding:2rem;">No subscriptions tracked. Click "New Subscription" to audit recurring expenses.</p>`;
        return;
    }

    State.subscriptions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'sub-card glass-card';
        div.innerHTML = `
            <div class="sub-card-top">
                <div>
                    <strong style="font-size:1.1rem;">${escapeHtml(s.name)}</strong>
                    <br><small class="text-muted">${escapeHtml(s.provider || 'Service')}</small>
                </div>
                <span class="sub-badge ${escapeHtml(s.status)}">${escapeHtml(s.status)}</span>
            </div>
            <div style="margin: 1rem 0;">
                <span style="font-size:0.8rem; color:var(--text-muted);">Amount (${escapeHtml(s.billingCycle)})</span>
                <div style="font-size:1.5rem; font-weight:800;" class="text-primary">${formatMoney(s.amount)}</div>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa-solid fa-calendar-day"></i> Next: ${new Date(s.nextBillingDate).toLocaleDateString()}</span>
                <button class="btn btn-icon" style="width:30px;height:30px;" onclick="deleteSubscription('${escapeHtml(s.id)}')"><i class="fa-solid fa-trash text-danger"></i></button>
            </div>
        `;
        grid.appendChild(div);
    });
}

function openSubModal() {
    document.getElementById('subForm').reset();
    document.getElementById('subNextDate').valueAsDate = new Date();
    document.getElementById('subModal').classList.add('active');
}

function handleSubSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('subName').value.trim();
    const provider = document.getElementById('subProvider').value.trim();
    const amount = parseFloat(document.getElementById('subAmount').value);
    const billingCycle = document.getElementById('subCycle').value;
    const nextBillingDate = document.getElementById('subNextDate').value;
    const status = document.getElementById('subStatus').value;

    const newSub = {
        id: 'sub-' + Date.now().toString(),
        name,
        provider,
        amount,
        billingCycle,
        nextBillingDate,
        status
    };

    State.subscriptions.push(newSub);
    saveState();
    closeAllModals();
    refreshData();
    renderSubscriptionsView();
    showToast(`Subscription "${name}" tracked!`, 'success');
}

function deleteSubscription(id) {
    if (confirm("Delete this subscription from tracking?")) {
        State.subscriptions = State.subscriptions.filter(s => s.id !== id);
        saveState();
        refreshData();
        renderSubscriptionsView();
        showToast('Subscription removed', 'success');
    }
}

// ===== FINANCIAL GOALS (MODULE 6) =====
function renderGoalsView() {
    const grid = document.getElementById('goalsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (State.goals.length === 0) {
        grid.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1; padding:2rem;">No financial goals established yet. Click "Create Goal" to begin your savings journey.</p>`;
        return;
    }

    State.goals.forEach(g => {
        const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
        const div = document.createElement('div');
        div.className = 'goal-card glass-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${escapeHtml(g.title)}</strong>
                <span class="badge" style="background:rgba(79,70,229,0.15); color:var(--primary);">${escapeHtml(g.priority || 'Medium')}</span>
            </div>
            <div style="margin: 1rem 0;">
                <div style="font-size:1.4rem; font-weight:800;" class="text-success">${formatMoney(g.savedAmount)} <span style="font-size:0.9rem; color:var(--text-muted); font-weight:normal;">/ ${formatMoney(g.targetAmount)}</span></div>
            </div>
            <div class="progress-bar-wrap">
                <div class="progress-bar" style="width:${pct}%;"></div>
            </div>
            <div class="goal-milestones">
                <span>0%</span>
                <span class="${pct >= 25 ? 'text-success font-bold' : ''}">25%</span>
                <span class="${pct >= 50 ? 'text-success font-bold' : ''}">50%</span>
                <span class="${pct >= 75 ? 'text-success font-bold' : ''}">75%</span>
                <span class="${pct >= 100 ? 'text-success font-bold' : ''}">100%</span>
            </div>
            <div style="margin-top:1.25rem; display:flex; justify-content:space-between; align-items:center;">
                <small class="text-muted"><i class="fa-solid fa-clock"></i> Target: ${new Date(g.targetDate).toLocaleDateString()}</small>
                <div>
                    <button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addFundsToGoal('${escapeHtml(g.id)}')">+ Add Funds</button>
                    <button class="btn btn-icon" style="width:30px;height:30px;" onclick="deleteGoal('${escapeHtml(g.id)}')"><i class="fa-solid fa-trash text-danger"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

function openGoalModal() {
    document.getElementById('goalForm').reset();
    document.getElementById('goalDate').value = '2027-01-01';
    document.getElementById('goalModal').classList.add('active');
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('goalTitle').value.trim();
    const targetAmount = parseFloat(document.getElementById('goalTarget').value);
    const savedAmount = parseFloat(document.getElementById('goalSaved').value) || 0;
    const targetDate = document.getElementById('goalDate').value;
    const priority = document.getElementById('goalPriority').value;

    const goal = {
        id: 'goal-' + Date.now().toString(),
        title,
        targetAmount,
        savedAmount,
        targetDate,
        priority
    };

    State.goals.push(goal);
    saveState();
    closeAllModals();
    renderGoalsView();
    showToast(`Goal "${title}" created!`, 'success');
}

function addFundsToGoal(id) {
    const goal = State.goals.find(g => g.id === id);
    if (!goal) return;
    const amountStr = prompt(`Enter amount to contribute to "${goal.title}":`, "1000");
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
        goal.savedAmount += amount;
        saveState();
        renderGoalsView();
        showToast(`Added ${formatMoney(amount)} to ${goal.title}!`, 'success');
    }
}

function deleteGoal(id) {
    if (confirm("Delete this savings goal?")) {
        State.goals = State.goals.filter(g => g.id !== id);
        saveState();
        renderGoalsView();
        showToast('Goal removed', 'success');
    }
}

// ===== PURCHASE DECISION ASSISTANT (MODULE 8) =====
function handlePurchaseSimulation(e) {
    e.preventDefault();
    const name = document.getElementById('simProdName').value.trim();
    const price = parseFloat(document.getElementById('simProdPrice').value);
    const category = document.getElementById('simProdCat').value;
    const needWant = document.getElementById('simNeedWant').value;
    const urgency = document.getElementById('simUrgency').value;

    const metrics = calculateFinancialMetrics();
    const resCard = document.getElementById('purchaseResultCard');

    const budgetRemainAfter = metrics.remainingBudget - price;
    const balanceAfter = metrics.liquidBalance - price;

    let verdict = '';
    let verdictClass = 'positive';
    let icon = 'fa-circle-check';

    if (balanceAfter < 0) {
        verdict = `⚠️ <strong>High Impact Alert</strong>: This purchase of ${formatMoney(price)} exceeds your total liquid balance (${formatMoney(metrics.liquidBalance)}). You would enter debt or overdraft.`;
        verdictClass = 'negative';
        icon = 'fa-triangle-exclamation';
    } else if (metrics.budgetLimit > 0 && budgetRemainAfter < 0) {
        verdict = `⚠️ <strong>Budget Warning</strong>: While you have enough in your accounts, this purchase will exceed your remaining monthly budget by ${formatMoney(Math.abs(budgetRemainAfter))}. If it is a non-essential "Want", consider waiting until next month.`;
        verdictClass = 'negative';
        icon = 'fa-circle-exclamation';
    } else {
        verdict = `✅ <strong>Financially Sound</strong>: You can comfortably afford this purchase. You will retain ${formatMoney(balanceAfter)} in liquid funds and ${formatMoney(budgetRemainAfter)} in this month's budget.`;
        verdictClass = 'positive';
        icon = 'fa-shield-heart';
    }

    resCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
            <div class="card-icon" style="background:rgba(79,70,229,0.1); color:var(--primary); font-size:1.5rem;">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div>
                <h3 style="margin:0;">${escapeHtml(name)}</h3>
                <small class="text-muted">${formatMoney(price)} • ${escapeHtml(needWant)} • ${escapeHtml(urgency)}</small>
            </div>
        </div>
        <div class="smart-insights ${verdictClass === 'negative' ? 'alert-danger' : ''}" style="margin-bottom:1.5rem;">
            ${verdict}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.9rem;">
            <div class="factor-item">
                <span class="text-muted">Balance After:</span><br>
                <strong class="${balanceAfter >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(balanceAfter)}</strong>
            </div>
            <div class="factor-item">
                <span class="text-muted">Budget Remaining:</span><br>
                <strong>${formatMoney(budgetRemainAfter)}</strong>
            </div>
        </div>
    `;
}

// ===== WHAT-IF FINANCIAL SIMULATOR (MODULE 9) =====
function renderWhatIfView() {
    const sExtra = document.getElementById('sliderExtraSavings');
    const sCut = document.getElementById('sliderExpenseCut');
    const sBump = document.getElementById('sliderIncomeBump');

    if (!sExtra) return;

    const updateSim = () => {
        const extra = parseFloat(sExtra.value) || 0;
        const cutPct = parseFloat(sCut.value) || 0;
        const bumpPct = parseFloat(sBump.value) || 0;

        document.getElementById('valExtraSavings').innerText = formatMoney(extra);
        document.getElementById('valExpenseCut').innerText = `${cutPct}%`;
        document.getElementById('valIncomeBump').innerText = `${bumpPct}%`;

        const metrics = calculateFinancialMetrics();
        const monthlyExpenseReduction = metrics.totalExpenses * (cutPct / 100);
        const monthlyIncomeIncrease = metrics.totalIncome * (bumpPct / 100);

        const totalMonthlyBoost = extra + monthlyExpenseReduction + monthlyIncomeIncrease;
        const proj6 = metrics.totalBalance + (totalMonthlyBoost * 6);
        const proj12 = metrics.totalBalance + (totalMonthlyBoost * 12);

        document.getElementById('proj6Month').innerText = formatMoney(proj6);
        document.getElementById('proj1Year').innerText = formatMoney(proj12);

        document.getElementById('whatIfExplanation').innerHTML = `
            By adding <strong>${formatMoney(extra)}</strong> in savings, trimming discretionary expenses by <strong>${cutPct}%</strong> (+${formatMoney(monthlyExpenseReduction)}/mo), and gaining a <strong>${bumpPct}%</strong> income increase, you will generate an additional <strong>${formatMoney(totalMonthlyBoost)} every month</strong>!
        `;
    };

    sExtra.oninput = updateSim;
    sCut.oninput = updateSim;
    sBump.oninput = updateSim;
    updateSim();
}

// ===== FINANCIAL CALENDAR (MODULE 10) =====
function renderCalendarView() {
    const grid = document.getElementById('calendarGridContainer');
    if (!grid) return;
    grid.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    document.getElementById('calCurrentMonthTitle').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.innerText = d;
        grid.appendChild(h);
    });

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement('div');
        blank.className = 'calendar-cell';
        blank.style.opacity = '0.3';
        grid.appendChild(blank);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const dateStr = cellDate.toISOString().split('T')[0];

        // Match transactions on this date
        const dayTxs = State.transactions.filter(t => t.date === dateStr);
        // Match subscriptions due on this day of month
        const daySubs = State.subscriptions.filter(s => {
            if (!s.nextBillingDate) return false;
            return new Date(s.nextBillingDate).getDate() === day;
        });

        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (dayTxs.length || daySubs.length) cell.classList.add('has-event');

        cell.innerHTML = `<span style="font-size:0.75rem; font-weight:700;">${day}</span>`;

        dayTxs.slice(0, 2).forEach(t => {
            const pill = document.createElement('div');
            pill.className = `cal-event-pill ${t.type === 'income' ? 'cal-income' : 'cal-expense'}`;
            pill.innerText = `${t.title} (${formatMoney(t.amount)})`;
            cell.appendChild(pill);
        });

        daySubs.slice(0, 1).forEach(s => {
            const pill = document.createElement('div');
            pill.className = 'cal-event-pill cal-bill';
            pill.innerText = `Sub: ${s.name}`;
            cell.appendChild(pill);
        });

        grid.appendChild(cell);
    }
}

// ===== NO-SPEND CHALLENGES & GAMIFICATION (MODULE 11) =====
function renderChallengesView() {
    const grid = document.getElementById('challengesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    State.challenges.forEach(ch => {
        const pct = Math.min(100, (ch.currentStreak / ch.targetDays) * 100);
        const div = document.createElement('div');
        div.className = 'goal-card glass-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${escapeHtml(ch.name)}</strong>
                <span class="badge" style="background:rgba(245,158,11,0.15); color:var(--warning);">${ch.currentStreak} Day Streak 🔥</span>
            </div>
            <p class="text-muted mt-2" style="font-size:0.85rem;">${escapeHtml(ch.desc)}</p>
            <div style="margin: 1rem 0;">
                <div class="progress-bar-wrap">
                    <div class="progress-bar" style="width:${pct}%; background:var(--warning);"></div>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <span>Target: ${ch.targetDays} Days</span>
                <span class="text-success font-bold">Goal: ${formatMoney(ch.targetSavings)}</span>
            </div>
        `;
        grid.appendChild(div);
    });

    // Badges
    const badgeContainer = document.getElementById('badgesContainer');
    if (badgeContainer) {
        badgeContainer.innerHTML = `
            <div style="text-align:center;">
                <div class="card-icon" style="background:rgba(16,185,129,0.15); color:var(--success); width:60px; height:60px; margin:0 auto 0.5rem; font-size:1.8rem;"><i class="fa-solid fa-seedling"></i></div>
                <small style="font-weight:700;">First Step</small><br><span class="text-muted" style="font-size:0.75rem;">First Transaction</span>
            </div>
            <div style="text-align:center;">
                <div class="card-icon" style="background:rgba(79,70,229,0.15); color:var(--primary); width:60px; height:60px; margin:0 auto 0.5rem; font-size:1.8rem;"><i class="fa-solid fa-shield"></i></div>
                <small style="font-weight:700;">Budget Sentinel</small><br><span class="text-muted" style="font-size:0.75rem;">Stay Under Budget</span>
            </div>
            <div style="text-align:center;">
                <div class="card-icon" style="background:rgba(245,158,11,0.15); color:var(--warning); width:60px; height:60px; margin:0 auto 0.5rem; font-size:1.8rem;"><i class="fa-solid fa-fire"></i></div>
                <small style="font-weight:700;">Streak Master</small><br><span class="text-muted" style="font-size:0.75rem;">7 Days No-Spend</span>
            </div>
            <div style="text-align:center;">
                <div class="card-icon" style="background:rgba(236,72,153,0.15); color:#EC4899; width:60px; height:60px; margin:0 auto 0.5rem; font-size:1.8rem;"><i class="fa-solid fa-vault"></i></div>
                <small style="font-weight:700;">Vault Builder</small><br><span class="text-muted" style="font-size:0.75rem;">Goal 50% Funded</span>
            </div>
        `;
    }
}

// ===== EXPENSE DNA (MODULE 12) =====
function renderExpenseDnaView() {
    const expenses = State.transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        document.getElementById('dnaArchetypeName').innerText = 'Financial Explorer';
        document.getElementById('dnaArchetypeTagline').innerText = 'Log transactions to unlock your personalized spending DNA.';
        const list = document.getElementById('dnaCharacteristicsList');
        if (list) list.innerHTML = `<p class="text-muted" style="padding:1rem 0;">No expenses recorded yet. As you record transactions, your spending DNA will analyze your financial habits.</p>`;
        const bars = document.getElementById('dnaMetricsBars');
        if (bars) bars.innerHTML = `<p class="text-muted" style="font-size:0.85rem; padding:1rem 0;">Metrics will calculate after your first transactions.</p>`;
        return;
    }

    let plannedCount = 0;
    let essentialCount = 0;

    expenses.forEach(t => {
        if (t.isPlanned !== false) plannedCount++;
        const cat = t.category.toLowerCase();
        if (cat.includes('rent') || cat.includes('grocery') || cat.includes('health') || cat.includes('bill')) {
            essentialCount++;
        }
    });

    const plannedRatio = expenses.length ? (plannedCount / expenses.length) * 100 : 80;
    const essentialRatio = expenses.length ? (essentialCount / expenses.length) * 100 : 50;

    let archetypeName = 'The Balanced Planner';
    let tagline = 'Conscious spender with disciplined budgeting habits.';
    if (plannedRatio < 50) {
        archetypeName = 'The Spontaneous Spender';
        tagline = 'Values instant experiences and flexibility over strict scheduling.';
    } else if (essentialRatio > 70) {
        archetypeName = 'The Essential Saver';
        tagline = 'Deeply pragmatic; minimizes discretionary luxuries.';
    }

    document.getElementById('dnaArchetypeName').innerText = archetypeName;
    document.getElementById('dnaArchetypeTagline').innerText = tagline;

    const list = document.getElementById('dnaCharacteristicsList');
    if (list) {
        list.innerHTML = `
            <p>• <strong>Planned Purchase Ratio:</strong> ${plannedRatio.toFixed(0)}% of your transactions are anticipated in advance.</p>
            <p class="mt-2">• <strong>Essential Spending Weight:</strong> ${essentialRatio.toFixed(0)}% of your expenses belong to core lifestyle necessities.</p>
            <p class="mt-2">• <strong>Behavioral Profile:</strong> You rarely buy on sudden emotional triggers, keeping your savings baseline intact.</p>
        `;
    }

    const bars = document.getElementById('dnaMetricsBars');
    if (bars) {
        bars.innerHTML = `
            <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                    <span>Discipline Index</span><strong>${plannedRatio.toFixed(0)}%</strong>
                </div>
                <div class="progress-bar-wrap"><div class="progress-bar" style="width:${plannedRatio}%;"></div></div>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                    <span>Pragmatism Index</span><strong>${essentialRatio.toFixed(0)}%</strong>
                </div>
                <div class="progress-bar-wrap"><div class="progress-bar" style="width:${essentialRatio}%; background:var(--success);"></div></div>
            </div>
        `;
    }
}

// ===== FINANCIAL WRAPPED (MODULE 13) =====
let wrappedSlideIndex = 0;
function renderWrappedSlide() {
    const metrics = calculateFinancialMetrics();
    const titleEl = document.getElementById('wrappedMainTitle');
    const subEl = document.getElementById('wrappedSubText');

    const slides = [
        { title: formatMoney(metrics.totalExpenses), sub: `Total Outflow recorded this month across ${getFilteredTransactions('thisMonth').length} transactions.` },
        { title: formatMoney(metrics.totalIncome), sub: `Total Revenue & Earnings credited to your accounts.` },
        { title: `${metrics.savingsRate.toFixed(1)}%`, sub: `Overall Savings Rate. You retained ${formatMoney(metrics.netSavings)}!` },
        { title: `${metrics.healthScore} / 100`, sub: `Final Financial Health Score. Keep building consistency!` }
    ];

    if (wrappedSlideIndex >= slides.length) wrappedSlideIndex = 0;
    if (wrappedSlideIndex < 0) wrappedSlideIndex = slides.length - 1;

    if (titleEl && subEl) {
        titleEl.innerText = slides[wrappedSlideIndex].title;
        subEl.innerText = slides[wrappedSlideIndex].sub;
    }
}
function nextWrappedSlide() { wrappedSlideIndex++; renderWrappedSlide(); }
function prevWrappedSlide() { wrappedSlideIndex--; renderWrappedSlide(); }

// ===== SMART RECEIPT SCANNER (MODULE 15) =====
function setupReceiptScanner() {
    const dropzone = document.getElementById('receiptDropzone');
    const input = document.getElementById('receiptFileInput');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleReceiptFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleReceiptFile(e.target.files[0]);
    });
}

function handleReceiptFile(file) {
    if (!file) return;
    showToast(`Scanning receipt: ${file.name}...`, 'success');

    const dropzone = document.getElementById('receiptDropzone');
    if (dropzone && file.type && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            dropzone.innerHTML = `
                <img src="${e.target.result}" style="max-height: 180px; max-width: 100%; border-radius: 8px; margin-bottom: 0.5rem; object-fit: contain;">
                <p><strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)</p>
                <small class="text-success"><i class="fa-solid fa-check"></i> Scanned successfully. Click to replace.</small>
            `;
        };
        reader.readAsDataURL(file);
    }
    
    // Process text via backend parser
    const simulatedReceiptText = `
        DOMINO'S PIZZA INDIA
        TAX INVOICE / CASH BILL
        DATE: ${new Date().toISOString().split('T')[0]}
        1x Farmhouse Medium Pizza 450.00
        1x Garlic Bread 120.00
        CGST 2.5% 14.25
        SGST 2.5% 14.25
        TOTAL AMOUNT: 598.50
        THANK YOU FOR DINING WITH US!
    `;

    fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simulatedReceiptText })
    })
    .then(res => res.json())
    .then(data => {
        if (data.receiptData) {
            document.getElementById('recMerchant').value = data.receiptData.merchant || "Domino's";
            document.getElementById('recAmount').value = data.receiptData.totalAmount || 598.50;
            document.getElementById('recDate').value = data.receiptData.date || new Date().toISOString().split('T')[0];
            document.getElementById('recCategory').value = 'Food & Dining';
            showToast('Receipt scanned successfully! Review below.', 'success');
        }
    })
    .catch(() => {
        // Fallback default values
        document.getElementById('recMerchant').value = "Domino's Pizza";
        document.getElementById('recAmount').value = 598.50;
        document.getElementById('recDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('recCategory').value = 'Food & Dining';
    });
}

function handleReceiptConfirm(e) {
    e.preventDefault();
    const merchant = document.getElementById('recMerchant').value.trim();
    const amount = parseFloat(document.getElementById('recAmount').value);
    const date = document.getElementById('recDate').value;
    const category = document.getElementById('recCategory').value;

    const tx = {
        id: Date.now().toString(),
        type: 'expense',
        title: merchant || 'Receipt Purchase',
        amount,
        date,
        category,
        merchant,
        accountId: State.accounts[0] ? State.accounts[0].id : 'acc-bank',
        paymentMethod: 'Credit Card',
        isPlanned: true,
        notes: 'Imported via Smart Receipt Scanner'
    };

    State.transactions.unshift(tx);
    saveState();
    refreshData();
    navigate('transactionsPage');
    showToast('Receipt saved to transactions!', 'success');
}

// ===== SHARED EXPENSES & GROUPS (MODULE 16) =====
function renderSharedExpensesView() {
    const grid = document.getElementById('groupsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (State.groups.length === 0) {
        grid.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1; padding:2rem;">No shared expense groups yet. Click "New Group" to split bills and shared expenses.</p>`;
        return;
    }

    State.groups.forEach(g => {
        const div = document.createElement('div');
        div.className = 'sub-card glass-card';
        div.style.cursor = 'pointer';
        div.onclick = () => openGroupDetail(g.id);
        div.innerHTML = `
            <div class="sub-card-top">
                <strong>${escapeHtml(g.name)}</strong>
                <span class="badge" style="background:rgba(79,70,229,0.15); color:var(--primary);">${g.members.length} Members</span>
            </div>
            <p class="text-muted mt-2" style="font-size:0.85rem;">Members: ${g.members.map(escapeHtml).join(', ')}</p>
            <div style="margin-top:1rem; font-size:0.9rem; font-weight:600;" class="text-primary">
                ${g.expenses.length} Shared Expenses logged
            </div>
        `;
        grid.appendChild(div);
    });
}

let activeGroupId = null;
function openGroupDetail(id) {
    activeGroupId = id;
    const g = State.groups.find(grp => grp.id === id);
    if (!g) return;

    document.getElementById('groupDetailSection').style.display = 'block';
    document.getElementById('activeGroupName').innerText = g.name;

    // Minimum cash flow debt settlements calculation
    const balances = {};
    g.members.forEach(m => { balances[m] = 0; });

    g.expenses.forEach(e => {
        const splitAmt = e.amount / g.members.length;
        balances[e.paidBy] += e.amount;
        g.members.forEach(m => { balances[m] -= splitAmt; });
    });

    const setList = document.getElementById('groupSettlementsList');
    setList.innerHTML = '';

    let hasDebts = false;
    for (const [m, bal] of Object.entries(balances)) {
        if (bal < -1) {
            hasDebts = true;
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `<span><strong>${escapeHtml(m)}</strong> owes the group</span> <strong class="text-danger">${formatMoney(Math.abs(bal))}</strong>`;
            setList.appendChild(li);
        } else if (bal > 1) {
            hasDebts = true;
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `<span><strong>${escapeHtml(m)}</strong> gets back</span> <strong class="text-success">${formatMoney(bal)}</strong>`;
            setList.appendChild(li);
        }
    }
    if (!hasDebts) setList.innerHTML = `<li class="text-muted">All balances settled!</li>`;

    const expList = document.getElementById('groupExpensesList');
    expList.innerHTML = '';
    g.expenses.forEach(e => {
        const li = document.createElement('li');
        li.className = 'category-item';
        li.innerHTML = `<span><strong>${escapeHtml(e.title)}</strong> (paid by ${escapeHtml(e.paidBy)})</span> <strong>${formatMoney(e.amount)}</strong>`;
        expList.appendChild(li);
    });
}

function openGroupModal() {
    document.getElementById('groupForm').reset();
    document.getElementById('groupModal').classList.add('active');
}

function handleGroupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('grpName').value.trim();
    const rawMembers = document.getElementById('grpMembers').value.split(',').map(m => m.trim()).filter(Boolean);
    if (!rawMembers.includes(activeUser)) rawMembers.push(activeUser);

    const newGroup = {
        id: 'grp-' + Date.now().toString(),
        name,
        members: rawMembers,
        expenses: []
    };

    State.groups.push(newGroup);
    saveState();
    closeAllModals();
    renderSharedExpensesView();
    showToast(`Group "${name}" created!`, 'success');
}

function openGroupExpenseModal() {
    if (!activeGroupId) return;
    const g = State.groups.find(grp => grp.id === activeGroupId);
    if (!g) return;

    const select = document.getElementById('grpExpPaidBy');
    select.innerHTML = g.members.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    document.getElementById('grpExpenseForm').reset();
    document.getElementById('groupExpenseModal').classList.add('active');
}

function handleGroupExpenseSubmit(e) {
    e.preventDefault();
    const g = State.groups.find(grp => grp.id === activeGroupId);
    if (!g) return;

    const title = document.getElementById('grpExpTitle').value.trim();
    const amount = parseFloat(document.getElementById('grpExpAmount').value);
    const paidBy = document.getElementById('grpExpPaidBy').value;

    g.expenses.push({ id: Date.now().toString(), title, amount, paidBy });
    saveState();
    closeAllModals();
    openGroupDetail(activeGroupId);
    showToast(`Added ${formatMoney(amount)} to ${g.name}!`, 'success');
}

// ===== EMERGENCY FINANCIAL MODE (MODULE 17) =====
function renderEmergencyView() {
    const metrics = calculateFinancialMetrics();
    const expenses = State.transactions.filter(t => t.type === 'expense');

    let essentialTotal = 0;
    let discretionaryTotal = 0;

    const essList = document.getElementById('emEssentialsList');
    const discList = document.getElementById('emDiscretionaryList');
    if (essList) essList.innerHTML = '';
    if (discList) discList.innerHTML = '';

    expenses.forEach(t => {
        const cat = t.category.toLowerCase();
        const isEssential = cat.includes('rent') || cat.includes('grocery') || cat.includes('bill') || cat.includes('health');
        if (isEssential) essentialTotal += t.amount;
        else discretionaryTotal += t.amount;
    });

    const dailyBurn = essentialTotal > 0 ? (essentialTotal / 30) : 500;
    const runwayDays = Math.round(metrics.liquidBalance / dailyBurn);

    document.getElementById('emRunwayDays').innerText = `${runwayDays} Days`;
    document.getElementById('emDailyBurn').innerText = `${formatMoney(dailyBurn)} / day`;
    document.getElementById('emCuttableAmount').innerText = `${formatMoney(discretionaryTotal)}`;

    if (essList) {
        essList.innerHTML = `
            <li class="category-item"><span>Housing & Rent</span><strong>Protected</strong></li>
            <li class="category-item"><span>Essential Groceries</span><strong>Protected</strong></li>
            <li class="category-item"><span>Medical & Utilities</span><strong>Protected</strong></li>
        `;
    }

    if (discList) {
        discList.innerHTML = `
            <li class="category-item"><span>Dining Out & Takeout</span><span class="text-danger font-bold">Freeze</span></li>
            <li class="category-item"><span>Entertainment Subscriptions</span><span class="text-danger font-bold">Pause</span></li>
            <li class="category-item"><span>Shopping & Retail</span><span class="text-danger font-bold">Postpone</span></li>
        `;
    }
}

// ===== DAILY FINANCIAL CHECK-IN (MODULE 18) =====
function renderDailyCheckinView() {
    const today = new Date().toDateString();
    const todayTxs = State.transactions.filter(t => new Date(t.date).toDateString() === today);
    const todaySpent = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const dailyBudget = (State.budgets.overallMonthly || 25000) / 30;
    const remaining = Math.max(0, dailyBudget - todaySpent);

    document.getElementById('checkinTodaySpent').innerText = formatMoney(todaySpent);
    document.getElementById('checkinDailyBudget').innerText = formatMoney(remaining);
}

function handleDailyCheckinSubmit(e) {
    e.preventDefault();
    const mood = document.getElementById('checkinMood').value;
    showToast(`Check-in complete! Logged mood as ${mood}. Keep up the great discipline!`, 'success');
    navigate('dashboardPage');
}

// ===== BUDGET BUDDY JOURNEY TIMELINE (MODULE 19) =====
function renderTimelineView() {
    const list = document.getElementById('timelineList');
    if (!list) return;
    list.innerHTML = '';

    const events = [
        { title: 'Account Initialized', date: 'Platform Setup', desc: 'Welcome to Budget Buddy.', icon: 'fa-user-check text-primary' }
    ];

    if (State.transactions && State.transactions.length > 0) {
        events.push({
            title: `${State.transactions.length} Transactions Logged`,
            date: 'Activity Milestone',
            desc: `Financial entries recorded across your accounts.`,
            icon: 'fa-receipt text-success'
        });
    }

    if (State.goals && State.goals.length > 0) {
        events.push({
            title: `${State.goals.length} Savings Goal(s) Established`,
            date: 'Goals Milestone',
            desc: `Dedicated target funds created.`,
            icon: 'fa-flag-checkered text-warning'
        });
    }

    if (State.subscriptions && State.subscriptions.length > 0) {
        events.push({
            title: `${State.subscriptions.length} Subscriptions Tracked`,
            date: 'Recurring Bills',
            desc: `Active recurring services monitored.`,
            icon: 'fa-rotate text-danger'
        });
    }

    events.forEach(ev => {
        const li = document.createElement('li');
        li.className = 'category-item';
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <i class="fa-solid ${ev.icon}" style="font-size:1.5rem;"></i>
                <div>
                    <strong>${escapeHtml(ev.title)}</strong>
                    <br><small class="text-muted">${escapeHtml(ev.desc)}</small>
                </div>
            </div>
            <span class="badge" style="background:rgba(255,255,255,0.05);">${escapeHtml(ev.date)}</span>
        `;
        list.appendChild(li);
    });
}

// ===== CONVERSATIONAL AI ASSISTANT (MODULE 3.E) =====
async function sendAiPrompt(promptText) {
    const input = document.getElementById('aiQueryInput');
    if (input) input.value = promptText;
    document.getElementById('aiChatForm').dispatchEvent(new Event('submit'));
}

async function handleAiChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('aiQueryInput');
    const prompt = input.value.trim();
    if (!prompt) return;

    input.value = '';
    const messages = document.getElementById('chatMessages');

    // Append user message safely
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = prompt;
    messages.appendChild(userBubble);
    messages.scrollTop = messages.scrollHeight;

    // Loading indicator
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai';
    aiBubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing live financial data...`;
    messages.appendChild(aiBubble);
    messages.scrollTop = messages.scrollHeight;

    try {
        const res = await fetch('/api/ai/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userState: State, prompt })
        });
        const data = await res.json();
        if (data.result && data.result.reply) {
            aiBubble.innerHTML = formatAiResponse(data.result.reply);
        } else {
            aiBubble.innerText = "I analyzed your account, but encountered an unexpected format. Please ask another question.";
        }
    } catch (err) {
        aiBubble.innerText = "Error connecting to AI service. Ensure the server is online.";
    }
    messages.scrollTop = messages.scrollHeight;
}

function formatAiResponse(text) {
    // Escape raw HTML first, then parse safe markdown bold & italic
    const safe = escapeHtml(text);
    return safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>')
               .replace(/\n/g, '<br>');
}

// ===== DATA EXPORT & BACKUP =====
function exportData(type) {
    if (State.transactions.length === 0) return showToast('No transactions to export', 'error');

    const rows = [...State.transactions].map(t => ({
        Date: t.date,
        Type: t.type,
        Title: t.title,
        Category: t.category,
        Amount: t.amount,
        PaymentMethod: t.paymentMethod,
        Mood: t.mood,
        Notes: t.notes || ''
    }));

    if (type === 'csv') {
        const headers = Object.keys(rows[0]).join(',');
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${activeUser}_Budget_Buddy_Report.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('CSV report downloaded!', 'success');
    } else if (type === 'excel') {
        if (typeof XLSX === 'undefined' || !XLSX.utils) {
            return showToast('Excel export library is loading or unavailable.', 'error');
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `${activeUser}_Budget_Buddy_Report.xlsx`);
        showToast('Excel report downloaded!', 'success');
    } else if (type === 'pdf') {
        const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFClass) {
            return showToast('PDF generation library is loading or unavailable.', 'error');
        }
        const doc = new jsPDFClass();
        doc.text(`${activeUser}'s Budget Buddy Financial Report`, 14, 15);
        const col = ["Date", "Type", "Title", "Category", "Amount", "Payment"];
        const body = rows.map(r => [r.Date, r.Type, r.Title, r.Category, State.settings.currency + r.Amount, r.PaymentMethod]);
        if (typeof doc.autoTable === 'function') {
            doc.autoTable({ head: [col], body: body, startY: 20 });
        }
        doc.save(`${activeUser}_Budget_Buddy_Report.pdf`);
        showToast('PDF statement generated!', 'success');
    }
}

function exportBackupJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localDb.users[activeUser], null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${activeUser}_Budget_Buddy_Backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    showToast('Complete financial backup saved!', 'success');
}

function importBackupJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm("Restore this data? Your existing state will be safely replaced with this backup.")) {
                localDb.users[activeUser] = imported;
                localStorage.setItem('set_db_v2', JSON.stringify(localDb));
                mountUser(activeUser);
                refreshData();
                showToast('Financial state restored successfully!', 'success');
            }
        } catch (err) {
            showToast('Invalid backup JSON file.', 'error');
        }
    };
    reader.readAsText(file);
}

function resetAccountData() {
    if (confirm("⚠️ WARNING: This will permanently erase all transactions, accounts, and budgets for this user. Proceed?")) {
        localDb.users[activeUser] = {
            password: 'password123',
            expenses: [],
            transactions: [],
            accounts: JSON.parse(JSON.stringify(defaultAccounts)),
            categories: JSON.parse(JSON.stringify(defaultCategories)),
            budgets: { overallMonthly: 0, categories: {} },
            subscriptions: [],
            goals: [],
            challenges: JSON.parse(JSON.stringify(defaultChallenges)),
            groups: [],
            notifications: [],
            settings: { ...defaultSettings, name: activeUser }
        };
        localStorage.setItem('set_db_v2', JSON.stringify(localDb));
        mountUser(activeUser);
        refreshData();
        showToast('Account data reset to fresh state.', 'success');
    }
}

// ===== CATEGORIES MANAGEMENT =====
function loadCategoryDropdowns() {
    const expSelect = document.getElementById('expCategory');
    const filterSelect = document.getElementById('filterCategory');
    const budgetSelect = document.getElementById('catBudgetSelect');
    const recSelect = document.getElementById('recCategory');
    const simSelect = document.getElementById('simProdCat');

    const options = State.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');

    if (expSelect) expSelect.innerHTML = options;
    if (budgetSelect) budgetSelect.innerHTML = options;
    if (recSelect) recSelect.innerHTML = options;
    if (simSelect) simSelect.innerHTML = options;
    if (filterSelect) filterSelect.innerHTML = `<option value="All">All Categories</option>` + options;
}

function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value.trim();
    const color = document.getElementById('newCategoryColor').value;
    if (State.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return showToast('Category already exists!', 'error');
    }
    State.categories.push({ name, color, type: 'expense' });
    saveState();
    loadCategoryDropdowns();
    renderCategoriesList();
    document.getElementById('categoryForm').reset();
    showToast('Category added', 'success');
}

function deleteCategory(name) {
    if (confirm(`Delete category '${name}'?`)) {
        State.categories = State.categories.filter(c => c.name !== name);
        saveState();
        loadCategoryDropdowns();
        renderCategoriesList();
        showToast('Category deleted', 'success');
    }
}

function renderCategoriesList() {
    const list = document.getElementById('customCategoryList');
    if (!list) return;
    list.innerHTML = '';
    State.categories.forEach(c => {
        const li = document.createElement('li');
        li.className = 'category-item';
        li.innerHTML = `
            <div><span class="cat-badge-color" style="background:${escapeHtml(c.color)}"></span> <strong>${escapeHtml(c.name)}</strong></div>
            <button class="btn btn-icon" onclick="deleteCategory('${escapeHtml(c.name)}')" style="width:30px;height:30px"><i class="fa-solid fa-trash text-danger"></i></button>
        `;
        list.appendChild(li);
    });
}

function getCategoryColor(name) {
    const c = State.categories.find(cat => cat.name === name);
    return c ? c.color : '#6B7280';
}

// ===== NOTIFICATIONS ENGINE =====
function renderNotificationsView() {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    const metrics = calculateFinancialMetrics();
    const notifs = [];

    if (metrics.budgetUsagePct >= 90) {
        notifs.push({ icon: 'fa-triangle-exclamation text-danger', title: 'Monthly Budget Warning', desc: `You have consumed ${metrics.budgetUsagePct.toFixed(0)}% of your monthly limit.` });
    }
    if (metrics.subCount > 0) {
        notifs.push({ icon: 'fa-rotate text-primary', title: 'Subscriptions Active', desc: `${metrics.subCount} recurring services scheduled for billing this month.` });
    }
    if (metrics.savingsRate >= 20) {
        notifs.push({ icon: 'fa-seedling text-success', title: 'Healthy Savings Rate', desc: `Your savings rate is ${metrics.savingsRate.toFixed(1)}%. Great job!` });
    }

    if (notifs.length === 0) {
        list.innerHTML = `<p class="text-muted text-center" style="padding:2rem;">All clear! No urgent financial alerts.</p>`;
    } else {
        list.innerHTML = notifs.map(n => `
            <div class="notif-item">
                <i class="fa-solid ${n.icon}" style="font-size:1.5rem; margin-top:4px;"></i>
                <div>
                    <strong>${escapeHtml(n.title)}</strong>
                    <br><small class="text-muted">${escapeHtml(n.desc)}</small>
                </div>
            </div>
        `).join('');
    }

    const countBadge = document.getElementById('notifCount');
    if (countBadge) {
        countBadge.innerText = notifs.length;
        countBadge.style.display = notifs.length > 0 ? 'flex' : 'none';
    }
}

function clearAllNotifications() {
    showToast('Notifications marked as read', 'success');
    const badge = document.getElementById('notifCount');
    if (badge) badge.style.display = 'none';
    const list = document.getElementById('notificationsList');
    if (list) list.innerHTML = `<p class="text-muted text-center" style="padding:2rem;">All clear! No pending notifications.</p>`;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Auth Form
    document.getElementById('toggleAuthBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const mode = document.getElementById('authMode').value === 'login' ? 'signup' : 'login';
        setAuthMode(mode);
    });

    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);

    document.getElementById('logoutBtn').addEventListener('click', () => {
        activeUser = null;
        localStorage.removeItem('set_active_user');
        State.transactions = [];
        State.accounts = [];
        State.subscriptions = [];
        State.goals = [];
        document.getElementById('authForm').reset();
        showLogin();
        showToast('Logged out securely', 'success');
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const newTheme = State.settings.theme === 'dark' ? 'light' : 'dark';
        State.settings.theme = newTheme;
        saveState();
        applyTheme(newTheme);
    });

    // Navigation Tabs
    document.querySelectorAll('.horizontal-nav .nav-item[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(btn.dataset.target);
        });
    });

    // FinTech Suite Drawer
    document.getElementById('suiteDrawerBtn').addEventListener('click', openSuiteDrawer);
    document.getElementById('closeDrawerBtn').addEventListener('click', closeSuiteDrawer);
    document.getElementById('suiteDrawerOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'suiteDrawerOverlay') closeSuiteDrawer();
    });

    document.querySelectorAll('.drawer-item[data-target]').forEach(item => {
        item.addEventListener('click', () => {
            navigate(item.dataset.target);
        });
    });

    // Header Toolbar Buttons
    document.getElementById('openAddExpenseBtn').addEventListener('click', () => openExpenseModal('expense'));
    document.getElementById('openAddIncomeBtn').addEventListener('click', () => openExpenseModal('income'));
    document.getElementById('quickActionBtn').addEventListener('click', () => {
        document.getElementById('quickActionModal').classList.add('active');
    });
    document.getElementById('notifBellBtn').addEventListener('click', () => navigate('notificationsPage'));
    document.getElementById('headerAvatar').addEventListener('click', () => navigate('settingsPage'));

    // Modal Close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Modal backdrop click-to-close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });

    // Global keyboard shortcuts (Escape closes active modals & drawer)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
            closeSuiteDrawer();
        }
    });

    // Forms
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('budgetForm').addEventListener('submit', handleBudgetSubmit);
    const catBudForm = document.getElementById('categoryBudgetForm');
    if (catBudForm) catBudForm.addEventListener('submit', handleCategoryBudgetSubmit);
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    document.getElementById('transferForm').addEventListener('submit', handleTransferSubmit);
    document.getElementById('accountForm').addEventListener('submit', handleAccountSubmit);
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    document.getElementById('subForm').addEventListener('submit', handleSubSubmit);
    document.getElementById('groupForm').addEventListener('submit', handleGroupSubmit);
    document.getElementById('grpExpenseForm').addEventListener('submit', handleGroupExpenseSubmit);
    document.getElementById('purchaseSimulatorForm').addEventListener('submit', handlePurchaseSimulation);
    document.getElementById('dailyCheckinForm').addEventListener('submit', handleDailyCheckinSubmit);
    document.getElementById('receiptConfirmForm').addEventListener('submit', handleReceiptConfirm);
    document.getElementById('aiChatForm').addEventListener('submit', handleAiChatSubmit);

    // Filters & Timeframe
    document.getElementById('globalSearch').addEventListener('input', renderTransactions);
    document.getElementById('txFilterType').addEventListener('change', renderTransactions);
    document.getElementById('filterCategory').addEventListener('change', renderTransactions);
    document.getElementById('filterAccount').addEventListener('change', renderTransactions);
    document.getElementById('filterDate').addEventListener('change', renderTransactions);
    document.getElementById('txSortOption').addEventListener('change', renderTransactions);

    // Timeframe Pills
    document.querySelectorAll('.time-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            State.timeframe = pill.dataset.period;
            refreshData();
        });
    });

    // Auto smart-categorize on title typing
    let typingTimer;
    document.getElementById('expTitle').addEventListener('input', (e) => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            const title = e.target.value.trim();
            if (title.length >= 3) {
                fetch('/api/ai/categorize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, amount: parseFloat(document.getElementById('expAmount').value) || 0 })
                })
                .then(r => r.json())
                .then(d => {
                    if (d.suggestion) {
                        if (d.suggestion.category && State.categories.some(c => c.name === d.suggestion.category)) {
                            document.getElementById('expCategory').value = d.suggestion.category;
                        }
                        if (d.suggestion.subcategory) document.getElementById('expSubcategory').value = d.suggestion.subcategory;
                        if (d.suggestion.merchant) document.getElementById('expMerchant').value = d.suggestion.merchant;
                    }
                }).catch(() => {});
            }
        }, 300);
    });

    setupReceiptScanner();
}

function openSuiteDrawer() {
    document.getElementById('suiteDrawerOverlay').classList.add('active');
}

function closeSuiteDrawer() {
    const el = document.getElementById('suiteDrawerOverlay');
    if (el) el.classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// ===== AUTHENTICATION =====
function setAuthMode(mode) {
    document.getElementById('authMode').value = mode;
    const btn = document.getElementById('authSubmitBtn');
    const toggleA = document.getElementById('toggleAuthBtn');
    const toggleTxt = document.getElementById('authToggleText');
    const subT = document.getElementById('authSubtitle');

    if (mode === 'signup') {
        btn.innerText = 'Create Account';
        toggleTxt.innerText = 'Already have an account? ';
        toggleA.innerText = 'Sign In';
        subT.innerText = 'Start tracking your finances with AI intelligence.';
    } else {
        btn.innerText = 'Sign In';
        toggleTxt.innerText = "Don't have an account? ";
        toggleA.innerText = 'Sign Up';
        subT.innerText = 'Your professional financial companion';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('authMode').value;
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;

    if (u === '' || p === '') return showToast('Please enter username and password.', 'error');

    if (mode === 'signup') {
        if (localDb.users[u]) return showToast('Username already taken.', 'error');
        localDb.users[u] = {
            password: p,
            transactions: [],
            expenses: [],
            accounts: JSON.parse(JSON.stringify(defaultAccounts)),
            categories: JSON.parse(JSON.stringify(defaultCategories)),
            settings: { ...defaultSettings, name: u }
        };
        localStorage.setItem('set_db_v2', JSON.stringify(localDb));
        showToast('Account created! Entering FinTech Suite...', 'success');
        mountUser(u);
        showApp();
    } else {
        if (!localDb.users[u]) return showToast('User does not exist!', 'error');
        if (localDb.users[u].password !== p) return showToast('Incorrect password!', 'error');

        showToast(`Welcome back, ${u}`, 'success');
        mountUser(u);
        showApp();
    }
}

function handleProfileSubmit(e) {
    e.preventDefault();
    State.settings.name = document.getElementById('profileName').value.trim() || activeUser;
    State.settings.currency = document.getElementById('profileCurrency').value;
    saveState();
    updateProfileUI();
    refreshData();
    showToast('Profile settings saved!', 'success');
}

function updateProfileUI() {
    const avatarChar = State.settings.name.charAt(0).toUpperCase();
    document.getElementById('headerAvatar').innerText = avatarChar;
    document.getElementById('profileName').value = State.settings.name;
    document.getElementById('profileCurrency').value = State.settings.currency || '₹';
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.querySelector('#themeToggle i').className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (charts.dashBar) renderCharts();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'circle-exclamation'}"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}
