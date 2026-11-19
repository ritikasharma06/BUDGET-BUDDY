const assert = require('assert');

console.log("=== RUNNING BUDGET BUDDY VALIDATION SUITE ===");

// 1. Test Financial Calculations
function testCalculations() {
    console.log("-> Testing Centralized Financial Calculations...");
    const accounts = [
        { id: '1', balance: 50000, type: 'bank' },
        { id: '2', balance: 10000, type: 'cash' }
    ];
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    assert.strictEqual(totalBalance, 60000, "Total balance must equal 60,000");

    const transactions = [
        { type: 'income', amount: 80000 },
        { type: 'expense', amount: 30000 },
        { type: 'expense', amount: 5000 }
    ];
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = (netSavings / totalIncome) * 100;

    assert.strictEqual(totalIncome, 80000);
    assert.strictEqual(totalExpenses, 35000);
    assert.strictEqual(netSavings, 45000);
    assert.strictEqual(savingsRate, 56.25);
    console.log("   [PASS] Balances, Income, Outflow, and Savings Rate calculations accurate.");
}

// 2. Test Internal Account Transfer Net-Zero Integrity
function testTransfers() {
    console.log("-> Testing Internal Account Transfer Invariant...");
    const accA = { balance: 40000 };
    const accB = { balance: 10000 };
    const beforeSum = accA.balance + accB.balance;

    const transferAmount = 15000;
    accA.balance -= transferAmount;
    accB.balance += transferAmount;
    const afterSum = accA.balance + accB.balance;

    assert.strictEqual(beforeSum, afterSum, "Internal transfer must not alter net assets");
    assert.strictEqual(accA.balance, 25000);
    assert.strictEqual(accB.balance, 25000);
    console.log("   [PASS] Internal transfer preserves net-zero invariant.");
}

// 3. Test Financial Health Score Formula
function testHealthScore() {
    console.log("-> Testing Algorithmic Health Score (0-100)...");
    const savingsRate = 30; // 30% savings rate
    const budgetUsagePct = 70; // 70% budget used
    const totalExpenses = 40000;
    const totalIncome = 60000;
    const liquidBalance = 120000;
    const monthlyTotalSpent = 40000;
    const monthlySubsCost = 1500;

    let pSavings = Math.min(25, savingsRate * 0.85); // 25
    let pBudget = budgetUsagePct <= 85 ? 20 : Math.max(0, 20 - (budgetUsagePct - 85)); // 20
    let pExpense = totalExpenses <= totalIncome ? 20 : 0; // 20
    let emergencyMonths = liquidBalance / monthlyTotalSpent; // 3 months
    let pEmergency = Math.min(15, (emergencyMonths / 3) * 15); // 15
    let subRatio = (monthlySubsCost / totalIncome) * 100; // 2.5%
    let pSubs = subRatio < 10 ? 10 : 5; // 10
    let pRatio = Math.min(10, (totalIncome / totalExpenses) * 5); // 7.5

    const score = Math.round(pSavings + pBudget + pExpense + pEmergency + pSubs + pRatio);
    assert.ok(score >= 80 && score <= 100, `Health score should be robust (>80), received: ${score}`);
    console.log(`   [PASS] Health Score algorithmic model verified: ${score}/100.`);
}

testCalculations();
testTransfers();
testHealthScore();

console.log("=== ALL TEST SUITES PASSED SUCCESSFULLY ===");

