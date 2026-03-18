let users = []
let tasks = []
let completions = []
let wallets = []
let auditLogs = []

async function loadData() {
  users = await fetch('data/users.json').then(res => res.json())
  tasks = await fetch('data/tasks.json').then(res => res.json())
  completions = await fetch('data/task_completions.json').then(res => res.json())
  wallets = await fetch('data/wallets.json').then(res => res.json())
  auditLogs = await fetch('data/audit_logs.json').then(res => res.json())
}

await loadData()