// ==========================
// ZEP SWIPE SUPABASE SCRIPT
// ==========================

// ==========================
// SUPABASE CLIENT
// ==========================
const SUPABASE_URL = "https://kmntdmdyvbnzgewjlxcp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbnRkbWR5dmJuemdld2pseGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTQ3MjEsImV4cCI6MjA4OTA3MDcyMX0.BUMOfJpMmBx4RFUF8l5j8APYZBrGyVRUFluP5VKzTuo";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// GLOBALS & SESSION
// ==========================
let currentUser = null;
let tasks = [];
let studentDeals = [];
const currentUserId = localStorage.getItem("currentUserId");
if(!currentUserId) location.href = "login.html"; // redirect if not logged in

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
let zacChart = null;

// ==========================
// FETCH DATA FROM SUPABASE
// ==========================
async function fetchCurrentUser() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", currentUserId)
    .single();
  if(error) { console.error(error); alert("Error fetching user."); return; }
  currentUser = data;
}

async function fetchTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: true });
  if(error) { console.error(error); return; }
  tasks = data;
}

async function fetchStudentDeals() {
  const { data, error } = await supabase
    .from("student_deals")
    .select("*")
    .order("id", { ascending: true });
  if(error) { console.error(error); return; }
  studentDeals = data;
}

async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });
  if(error) { console.error(error); return []; }
  return data || [];
}

// ==========================
// RENDER FUNCTIONS
// ==========================
async function renderWallet() {
  usdBalanceEl.innerText = `$${currentUser.wallet_balance.toFixed(2)}`;
  zacBalanceEl.innerText = `${currentUser.zac_balance} ZAC`;
}

async function renderNotifications() {
  const notifications = await fetchNotifications();
  notificationsList.innerHTML = "";
  notifications.forEach(n => {
    const div = document.createElement("div");
    div.className = `notification ${n.type}`;
    div.innerHTML = `<span>${n.text}</span>`;
    if(n.link) div.onclick = () => window.location.href = n.link;
    notificationsList.appendChild(div);
  });
}

function initChart() {
  if(!ctx) return;
  if(!currentUser.zac_history) currentUser.zac_history = [];
  zacChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: currentUser.zac_history.map(e => e.day),
      datasets: [{
        label: "ZAC Rewards",
        data: currentUser.zac_history.map(e => e.zac),
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
  if(!zacChart) return;
  zacChart.data.labels = currentUser.zac_history.map(e => e.day);
  zacChart.data.datasets[0].data = currentUser.zac_history.map(e => e.zac);
  zacChart.update();
}

// ==========================
// TASK LOGIC
// ==========================
async function completeTask(taskId) {
  // Check if already completed
  const { data: completedTasks, error: checkError } = await supabase
    .from("task_completions")
    .select("*")
    .eq("user_id", currentUserId)
    .eq("task_id", taskId);
  if(checkError) { console.error(checkError); return; }
  if(completedTasks.length > 0) { alert("Task already completed!"); return; }

  const task = tasks.find(t => t.id === taskId);
  if(!task) return;

  // Add ZAC reward to user
  currentUser.zac_balance += task.zac_reward;
  await supabase
    .from("users")
    .update({ zac_balance: currentUser.zac_balance })
    .eq("id", currentUserId);

  // Log task completion
  await supabase.from("task_completions").insert([{ user_id: currentUserId, task_id: taskId }]);

  // Add to ZAC history
  currentUser.zac_history.push({ day: `Task ${task.id}`, zac: task.zac_reward });
  await supabase.from("users").update({ zac_history: currentUser.zac_history }).eq("id", currentUserId);

  // Audit log
  await supabase.from("audit_logs").insert([{ 
    user_id: currentUserId, 
    action: "task_completed", 
    details: `Completed task "${task.name}" +${task.zac_reward} ZAC`
  }]);

  // Unlock student deals if 3 tasks completed
  const { count } = await supabase
    .from("task_completions")
    .select("*", { count: "exact" })
    .eq("user_id", currentUserId);
  if(count >= 3) {
    for(let deal of studentDeals) {
      await supabase.from("student_deals").update({ unlocked: true }).eq("id", deal.id);
    }
  }

  await renderWallet();
  updateChart();
  await renderNotifications();
  alert(`Task "${task.name}" completed! +${task.zac_reward} ZAC`);
}

// ==========================
// WITHDRAWALS
// ==========================
async function openWithdrawModal() {
  withdrawModal.style.display = "flex";
  withdrawInfo.innerText = `Your