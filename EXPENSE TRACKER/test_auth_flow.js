const assert = require('assert');

console.log("=== RUNNING AUTHENTICATION & ROUTE PROTECTION FLOW TEST ===");

// Mock Browser Environment
const localStorageData = {};
const mockLocalStorage = {
    getItem: (key) => localStorageData[key] || null,
    setItem: (key, val) => { localStorageData[key] = String(val); },
    removeItem: (key) => { delete localStorageData[key]; }
};

const domElements = {
    loginPage: { classes: ['page', 'login-wrapper'], style: { display: 'none' } },
    mainApp: { classes: ['page', 'main-layout'], style: { display: 'none' } }
};

let activeUser = null;
const localDb = {
    users: {
        "john_doe": {
            password: "password123",
            transactions: [],
            accounts: [],
            settings: { name: "john_doe" }
        }
    }
};

function isAuthenticated() {
    return Boolean(activeUser && localDb.users && localDb.users[activeUser]);
}

function showLogin() {
    domElements.loginPage.classes = ['page', 'active', 'login-wrapper'];
    domElements.loginPage.style.display = 'flex';
    domElements.mainApp.classes = ['page', 'main-layout'];
    domElements.mainApp.style.display = 'none';
}

function showApp() {
    if (!isAuthenticated()) {
        showLogin();
        return;
    }
    domElements.loginPage.classes = ['page', 'login-wrapper'];
    domElements.loginPage.style.display = 'none';
    domElements.mainApp.classes = ['page', 'active', 'main-layout'];
    domElements.mainApp.style.display = 'flex';
}

let activeView = null;
function navigate(pageId) {
    if (!isAuthenticated()) {
        showLogin();
        return;
    }
    activeView = pageId;
}

// TEST 1: Unauthenticated Initial State
console.log("-> TEST 1: Unauthenticated Initial State...");
activeUser = mockLocalStorage.getItem('set_active_user');
if (isAuthenticated()) {
    showApp();
} else {
    showLogin();
}
assert.strictEqual(isAuthenticated(), false);
assert.strictEqual(domElements.loginPage.style.display, 'flex');
assert.strictEqual(domElements.mainApp.style.display, 'none');
assert.ok(domElements.loginPage.classes.includes('active'));
assert.ok(!domElements.mainApp.classes.includes('active'));
console.log("   [PASS] Only Login Page is displayed on unauthenticated boot.");

// TEST 2: Route Protection on Unauthenticated Navigation Attempt
console.log("-> TEST 2: Route Protection Check...");
navigate('dashboardPage');
assert.strictEqual(activeView, null, "Should block navigation to dashboardPage");
assert.strictEqual(domElements.loginPage.style.display, 'flex');
assert.strictEqual(domElements.mainApp.style.display, 'none');
console.log("   [PASS] Unauthenticated navigation blocked; user kept on Login Page.");

// TEST 3: Successful Authentication
console.log("-> TEST 3: Successful Login & Redirection...");
const usernameInput = "john_doe";
const passwordInput = "password123";

assert.ok(localDb.users[usernameInput]);
assert.strictEqual(localDb.users[usernameInput].password, passwordInput);

activeUser = usernameInput;
mockLocalStorage.setItem('set_active_user', usernameInput);
showApp();
navigate('dashboardPage');

assert.strictEqual(isAuthenticated(), true);
assert.strictEqual(domElements.loginPage.style.display, 'none');
assert.strictEqual(domElements.mainApp.style.display, 'flex');
assert.ok(domElements.mainApp.classes.includes('active'));
assert.ok(!domElements.loginPage.classes.includes('active'));
assert.strictEqual(activeView, 'dashboardPage');
console.log("   [PASS] Login successful: Login page hidden, Dashboard accessible.");

// TEST 4: Page Refresh Session Persistence
console.log("-> TEST 4: Page Refresh Session Persistence...");
const refreshedUser = mockLocalStorage.getItem('set_active_user');
activeUser = refreshedUser;
if (isAuthenticated()) {
    showApp();
    navigate('dashboardPage');
} else {
    showLogin();
}
assert.strictEqual(isAuthenticated(), true);
assert.strictEqual(domElements.loginPage.style.display, 'none');
assert.strictEqual(domElements.mainApp.style.display, 'flex');
assert.strictEqual(activeView, 'dashboardPage');
console.log("   [PASS] Session persists across refresh; user stays in Dashboard.");

// TEST 5: Logout Flow
console.log("-> TEST 5: Logout Action...");
activeUser = null;
mockLocalStorage.removeItem('set_active_user');
activeView = null;
showLogin();

assert.strictEqual(isAuthenticated(), false);
assert.strictEqual(domElements.loginPage.style.display, 'flex');
assert.strictEqual(domElements.mainApp.style.display, 'none');
assert.ok(!domElements.mainApp.classes.includes('active'));
console.log("   [PASS] Logout immediately conceals main app and returns to Login Page.");

console.log("\n=== ALL AUTHENTICATION FLOW TESTS PASSED! ===");

