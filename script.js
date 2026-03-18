// ==========================
// ZEP SWIPE MODULAR SCRIPT
// ==========================

// ==========================
// GLOBALS & SESSION
// ==========================
let users = JSON.parse(localStorage.getItem("users")) || {};
let currentUserId = localStorage.getItem("currentUserId");
if (!currentUserId || !users[currentUserId]) location.href = "login.html";
let currentUser = users[currentUserId];

// Initialize wallet balances if undefined
currentUser.walletBalance = currentUser.walletBalance || 0;
currentUser.zacBalance = currentUser.zacBalance || 0;
currentUser.completedTasks = currentUser.completedTasks || []; // track task ids
currentUser.zacHistory = currentUser.zacHistory || []; // daily reward log

// Sample tasks (replace with backend fetch)
let tasks = [
  { id: 1, name: "Complete Day 1–7 Course", zacReward: 25, unlockDay: 1 },
  { id: 2, name: "Complete Day 8–14 Course", zacReward: 25, unlockDay: 8 },
  { id: 3, name: "Complete Day 15–21 Course", zacReward: 25, unlockDay: 15 }
];

// Student deals (unlock after 3 tasks)
let studentDeals = [
  { id: 1, name: "Amazon Discount", unlocked: false },
  { id: 2, name: "Spotify Premium", unlocked: false }
];

// ==========================
// DOM ELEMENTS
// ==========================
const usdBalanceEl = document.getElementById("usdBalance");
const zacBalanceEl = document.getElementById("zacBalance");
const notificationsList = document.getElementById("notificationsList");
const withdrawModal = document.getElementById("withdrawModal");
const withdrawInfo = document.getElementById("withdrawInfo");
const withdrawAmount = document.getElementById("withdrawAmount");
const withdrawMethod = document.getElementById("withdrawMethod");
const ctx = document.getElementById("zacChart")?.getContext("2d");

// ==========================
// RENDER FUNCTIONS
// ==========================
function renderWallet() {
  usdBalanceEl.innerText = `$${currentUser.walletBalance.toFixed(2)}`;
  zacBalanceEl.innerText = `${currentUser.zacBalance} ZAC`;
}

function renderNotifications() {
  let notifications = JSON.parse(localStorage.getItem("notifications")) || [];
  notificationsList.innerHTML = "";
  notifications.forEach(n => {
    const div = document.createElement("div");
    div.className = `notification ${n.type}`;
    div.innerHTML = `<span>${n.text}</span>`;
    if (n.link) div.onclick = () => { window.location.href = n.link; };
    notificationsList.appendChild(div);
  });
}

function addNotification(type, text, link = null) {
  let notifications = JSON.parse(localStorage.getItem("notifications")) || [];
  notifications.push({ type, text, link });
  localStorage.setItem("notifications", JSON.stringify(notifications));
  renderNotifications();
}

// ==========================
// TASK LOGIC
// ==========================
function completeTask(taskId) {
  if (currentUser.completedTasks.includes(taskId)) {
    alert("Task already completed!");
    return;
  }

  let task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Add ZAC reward
  currentUser.zacBalance += task.zacReward;
  currentUser.completedTasks.push(taskId);

  // Log to ZAC history (for chart)
  let dayLabel = `Task ${task.id}`;
  currentUser.zacHistory.push({ day: dayLabel, zac: task.zacReward });

  // Add audit log
  let auditLogs = JSON.parse(localStorage.getItem("auditLogs")) || [];
  auditLogs.push({
    userId: currentUserId,
    action: "task_completed",
    details: `Completed task: ${task.name} | Reward: ${task.zacReward} ZAC`,
    createdAt: new Date()
  });
  localStorage.setItem("auditLogs", JSON.stringify(auditLogs));

  // Unlock student deals if 3 tasks completed
  if (currentUser.completedTasks.length >= 3) {
    studentDeals.forEach(d => d.unlocked = true);
  }

  // Save user data
  users[currentUserId] = currentUser;
  localStorage.setItem("users", JSON.stringify(users));

  renderWallet();
  updateChart();
  addNotification("submitted", `Task "${task.name}" completed! +${task.zacReward} ZAC`);
}

// ==========================
// CHART LOGIC
// ==========================
let zacChart;
if (ctx) {
  zacChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: currentUser.zacHistory.map(e => e.day),
      datasets: [{
        label: "ZAC Rewards",
        data: currentUser.zacHistory.map(e => e.zac),
        backgroundColor: "rgba(0,255,148,0.2)",
        borderColor: "#00ff94",
        borderWidth: 2,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

function updateChart() {
  if (!zacChart) return;
  zacChart.data.labels = currentUser.zacHistory.map(e => e.day);
  zacChart.data.datasets[0].data = currentUser.zacHistory.map(e => e.zac);
  zacChart.update();
}

// ==========================
// WITHDRAWAL LOGIC
// ==========================
function openWithdrawModal() {
  withdrawModal.style.display = "flex";
  withdrawInfo.innerText = `Your USD balance: $${currentUser.walletBalance.toFixed(2)} | Minimum withdrawal: $100`;

  withdrawMethod.innerHTML = '<option value="">Select withdrawal method</option>';
  const momoCountries = ["Ghana", "Zambia", "Namibia", "Malawi"];
  if (momoCountries.includes(currentUser.country)) {
    withdrawMethod.innerHTML += '<option value="momo">Mobile Money</option>';
  }
  withdrawMethod.innerHTML += '<option value="bank">Bank Transfer</option>';
}

function closeWithdrawModal() {
  withdrawModal.style.display = "none";
  withdrawAmount.value = "";
  withdrawMethod.value = "";
}

function confirmWithdraw() {
  const amt = parseFloat(withdrawAmount.value);
  const method = withdrawMethod.value;
  if (isNaN(amt) || amt < 100) { alert("Minimum withdrawal is $100."); return; }
  if (!method) { alert("Please select a withdrawal method."); return; }
  if (amt > currentUser.walletBalance) { alert("Insufficient balance."); return; }

  currentUser.walletBalance -= amt;

  // Audit log
  let auditLogs = JSON.parse(localStorage.getItem("auditLogs")) || [];
  auditLogs.push({
    userId: currentUserId,
    action: "withdraw_request",
    details: `Requested $${amt} via ${method.toUpperCase()}`,
    createdAt: new Date()
  });
  localStorage.setItem("auditLogs", JSON.stringify(auditLogs));

  users[currentUserId] = currentUser;
  localStorage.setItem("users", JSON.stringify(users));
  renderWallet();
  addNotification("pending", `Withdrawal of $${amt} via ${method.toUpperCase()} requested.`);
  closeWithdrawModal();
  alert("Withdrawal request submitted.");
}

// ==========================
// NAVIGATION HELPERS
// ==========================
function goToLearnEarn() { window.location.href = "learn-earn.html"; }
function goToDeals() { window.location.href = "student-deals.html"; }
function goToFreelance() { window.location.href = "freelance.html"; }

// ==========================
// INITIAL RENDER
// ==========================
renderWallet();
renderNotifications();
updateChart();