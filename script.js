const STORAGE_KEY = 'expense-tracker-transactions';
const GOALS_KEY = 'expense-tracker-goals';
const CATEGORY_BUDGETS = {
  Food: 1200,
  Transport: 600,
  Shopping: 800,
  Entertainment: 700,
  Bills: 900,
  Health: 400,
  Education: 500,
  Salary: Infinity,
  'Other Income': Infinity,
  Other: 500
};

const CATEGORY_KEYWORDS = {
  Food: ['food', 'restaurant', 'grocery', 'cafe', 'coffee', 'dining', 'pizza', 'groceries', 'milk', 'market', 'lunch'],
  Transport: ['uber', 'taxi', 'metro', 'bus', 'fuel', 'parking', 'train', 'auto', 'ride'],
  Shopping: ['amazon', 'flipkart', 'shop', 'mall', 'clothes', 'store', 'marketplace'],
  Entertainment: ['netflix', 'spotify', 'youtube', 'movie', 'games', 'streaming', 'cinema', 'entertainment'],
  Bills: ['electric', 'bill', 'rent', 'wifi', 'internet', 'phone', 'water', 'insurance'],
  Health: ['pharmacy', 'hospital', 'doctor', 'fitness', 'medical', 'health'],
  Education: ['course', 'school', 'college', 'books', 'tuition', 'udemy', 'education']
};

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let goals = JSON.parse(localStorage.getItem(GOALS_KEY)) || [
  { id: 1, name: 'New Laptop', target: 80000, saved: 45000 },
  { id: 2, name: 'Vacation', target: 30000, saved: 12000 }
];

let chart;
let categoryChart;
let weeklyChart;
let trendChart;
let savingsChart;

const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const transactionList = document.getElementById('transactionList');
const projectSpendingEl = document.getElementById('projectSpending');
const currentSpendingEl = document.getElementById('currentSpending');
const daysRemainingEl = document.getElementById('daysRemaining');
const smartCategorizationEl = document.getElementById('smartCategorization');
const alertsEl = document.getElementById('budgetAlerts');
const subscriptionListEl = document.getElementById('subscriptionList');
const goalListEl = document.getElementById('goalList');
const voiceStatusEl = document.getElementById('voiceStatus');
const receiptPreview = document.getElementById('receiptPreview');
const receiptResultEl = document.getElementById('receiptResult');

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveGoals() {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function formatCurrency(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function categorizeText(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  if (lower.includes('salary') || lower.includes('freelance') || lower.includes('refund') || lower.includes('bonus')) {
    return 'Salary';
  }
  return 'Other';
}

function getExpenseTotal() {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function getIncomeTotal() {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function addTransaction() {
  const descriptionInput = document.getElementById('description');
  const amountInput = document.getElementById('amount');
  const typeInput = document.getElementById('type');
  const categoryInput = document.getElementById('category');

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value || categorizeText(description);

  if (!description || amount <= 0) {
    alert('Please enter valid details');
    return;
  }

  transactions.unshift({
    id: Date.now(),
    description,
    amount,
    type,
    category,
    date: getDateString()
  });

  saveTransactions();
  updateUI();

  descriptionInput.value = '';
  amountInput.value = '';
  categoryInput.value = 'Other';
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  updateUI();
}

function updateSummary() {
  const income = getIncomeTotal();
  const expense = getExpenseTotal();
  const balance = income - expense;

  balanceEl.textContent = formatCurrency(balance);
  incomeEl.textContent = formatCurrency(income);
  expenseEl.textContent = formatCurrency(expense);
}

function updateTransactions() {
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    transactionList.innerHTML = '<p class="empty-state">No transactions yet.</p>';
    return;
  }

  transactions.forEach(transaction => {
    const div = document.createElement('div');
    div.className = `transaction ${transaction.type === 'income' ? 'income-item' : 'expense-item'}`;

    div.innerHTML = `
      <div>
        <strong>${transaction.description}</strong>
        <div class="transaction-meta">
          <span>${transaction.category || 'Other'}</span>
          <span>${transaction.date}</span>
        </div>
      </div>
      <div class="transaction-right">
        <span class="amount-text">${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}</span>
        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Delete</button>
      </div>
    `;

    transactionList.appendChild(div);
  });
}

function updateSmartCategorization() {
  const sorted = [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  smartCategorizationEl.innerHTML = '';
  sorted.forEach(item => {
    const category = categorizeText(item.description);
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
      <span>${item.description}</span>
      <span class="pill">${category}</span>
    `;
    smartCategorizationEl.appendChild(row);
  });
}

function updatePredictions() {
  const expenseTotal = getExpenseTotal();
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  const currentDay = daysPassed || 1;
  const projected = daysPassed > 0 ? Math.round((expenseTotal / currentDay) * daysInMonth) : expenseTotal;
  const daysRemaining = Math.max(daysInMonth - currentDay, 0);

  projectSpendingEl.textContent = formatCurrency(projected);
  currentSpendingEl.textContent = formatCurrency(expenseTotal);
  daysRemainingEl.textContent = daysRemaining;
}

function updateBudgetAlerts() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const alerts = [];

  expenses.forEach(item => {
    const budget = CATEGORY_BUDGETS[item.category] || CATEGORY_BUDGETS.Other;
    const spent = expenses
      .filter(t => t.category === item.category)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (budget !== Infinity && spent >= budget * 0.9) {
      alerts.push(`${item.category} budget ${Math.round((spent / budget) * 100)}% used`);
    }
  });

  if (alerts.length === 0) {
    alertsEl.innerHTML = '<p class="empty-state">No budget alerts right now.</p>';
    return;
  }

  alertsEl.innerHTML = '';
  alerts.forEach(message => {
    const item = document.createElement('div');
    item.className = 'alert-item';
    item.textContent = `⚠ ${message}`;
    alertsEl.appendChild(item);
  });
}

function updateSubscriptions() {
  const subscriptions = [
    { name: 'Netflix', cost: 199, nextPayment: '2026-07-05' },
    { name: 'Spotify', cost: 159, nextPayment: '2026-07-08' },
    { name: 'ChatGPT', cost: 499, nextPayment: '2026-07-10' },
    { name: 'YouTube Premium', cost: 129, nextPayment: '2026-07-12' }
  ];

  const monthly = subscriptions.reduce((sum, item) => sum + item.cost, 0);
  const annual = monthly * 12;

  document.getElementById('subscriptionTotal').textContent = formatCurrency(monthly);
  document.getElementById('subscriptionAnnual').textContent = formatCurrency(annual);

  subscriptionListEl.innerHTML = '';
  subscriptions.forEach(item => {
    const row = document.createElement('div');
    row.className = 'subscription-row';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <p>Next payment: ${item.nextPayment}</p>
      </div>
      <span>${formatCurrency(item.cost)}/mo</span>
    `;
    subscriptionListEl.appendChild(row);
  });
}

function updateGoals() {
  goalListEl.innerHTML = '';
  goals.forEach(goal => {
    const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <div>
          <h3>${goal.name}</h3>
          <p>Target: ${formatCurrency(goal.target)}</p>
        </div>
        <span>${progress}%</span>
      </div>
      <div class="progress-bar">
        <div style="width:${progress}%"></div>
      </div>
      <p class="goal-footer">Saved: ${formatCurrency(goal.saved)}</p>
    `;
    goalListEl.appendChild(card);
  });
}

function updateAnalytics() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');

  const categoryTotals = {};
  expenses.forEach(item => {
    categoryTotals[item.category || 'Other'] = (categoryTotals[item.category || 'Other'] || 0) + Number(item.amount);
  });

  const categoryLabels = Object.keys(categoryTotals);
  const categoryData = Object.values(categoryTotals);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'pie',
    data: {
      labels: categoryLabels.length ? categoryLabels : ['No data'],
      datasets: [{ data: categoryData.length ? categoryData : [1], backgroundColor: ['#b99a7f', '#d9a18b', '#a8c29a', '#8fb7c5', '#c9a5d9', '#f5c16c'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  const weeklyMap = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    weeklyMap[key] = 0;
  }
  expenses.forEach(item => {
    if (weeklyMap[item.date]) weeklyMap[item.date] += Number(item.amount);
  });
  const weeklyLabels = Object.keys(weeklyMap).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' }));
  const weeklyData = Object.values(weeklyMap);

  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(document.getElementById('weeklyChart'), {
    type: 'bar',
    data: {
      labels: weeklyLabels,
      datasets: [{ label: 'Weekly Spending', data: weeklyData, backgroundColor: '#d9a18b' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const monthlyData = [];
  const monthlyLabels = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter(item => item.date.startsWith(key)).reduce((sum, item) => sum + Number(item.amount), 0);
    monthlyLabels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    monthlyData.push(monthExpenses);
  }

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: monthlyLabels,
      datasets: [{
        label: 'Monthly Trend',
        data: monthlyData,
        borderColor: '#b99a7f',
        backgroundColor: 'rgba(185,154,127,0.15)',
        tension: 0.3,
        fill: true
      }]
    },
    options: { responsive: true }
  });

  const savingsData = goals.map(goal => Math.round((goal.saved / goal.target) * 100));
  const savingsLabels = goals.map(goal => goal.name);

  if (savingsChart) savingsChart.destroy();
  savingsChart = new Chart(document.getElementById('savingsChart'), {
    type: 'bar',
    data: {
      labels: savingsLabels,
      datasets: [{
        label: 'Goal Progress %',
        data: savingsData,
        backgroundColor: ['#a8c29a', '#8fb7c5']
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  document.getElementById('largestExpenses').innerHTML = '';
  expenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .forEach(item => {
      const row = document.createElement('div');
      row.className = 'expense-list-item';
      row.innerHTML = `<span>${item.description}</span><strong>${formatCurrency(item.amount)}</strong>`;
      document.getElementById('largestExpenses').appendChild(row);
    });

  document.getElementById('weeklyComparison').textContent = income.length && expenses.length
    ? `${formatCurrency(income.reduce((s, x) => s + x.amount, 0) - expenses.reduce((s, x) => s + x.amount, 0))}`
    : formatCurrency(0);
}

function addGoal(event) {
  event.preventDefault();
  const name = document.getElementById('goalName').value.trim();
  const target = Number(document.getElementById('goalTarget').value);
  const saved = Number(document.getElementById('goalSaved').value);

  if (!name || target <= 0) return;

  goals.push({ id: Date.now(), name, target, saved });
  saveGoals();
  updateGoals();
  document.getElementById('goalForm').reset();
}

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatusEl.textContent = 'Voice input is not supported in this browser.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onstart = () => {
    voiceStatusEl.textContent = 'Listening...';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    voiceStatusEl.textContent = `Recognized: "${transcript}"`;

    const amountMatch = transcript.match(/(?:spent|paid|bought)\s*(?:₹|rs\.?|inr\s*)?(\d+(?:\.\d{1,2})?)\s*(?:on|for)\s*([a-zA-Z\s]+)/i);
    if (amountMatch) {
      const [, amount, description] = amountMatch;
      const typed = {
        description: description.trim(),
        amount: Number(amount),
        type: 'expense',
        category: categorizeText(description)
      };
      transactions.unshift({
        id: Date.now(),
        ...typed,
        date: getDateString()
      });
      saveTransactions();
      updateUI();
    } else {
      voiceStatusEl.textContent = 'Could not understand the amount and item.';
    }
  };

  recognition.onerror = () => {
    voiceStatusEl.textContent = 'Voice recognition failed.';
  };

  document.getElementById('voiceBtn').addEventListener('click', () => recognition.start());
}

function extractReceiptData(text) {
  const amountRegex = /(?:total|amount|grand total|payable|balance)[^\d]*(₹|Rs\.?|INR\s*)?\s*(\d+(?:\.\d{1,2})?)/i;
  const storeRegex = /([A-Z][A-Za-z&.'-]+(?:\s+[A-Z][A-Za-z&.'-]+)*)/;
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;

  const amountMatch = text.match(amountRegex) || text.match(/(₹|Rs\.?|INR\s*)?\s*(\d+(?:\.\d{1,2})?)/);
  const dateMatch = text.match(dateRegex);
  const storeMatch = text.match(storeRegex);

  return {
    store: storeMatch ? storeMatch[1] : 'Unknown Store',
    date: dateMatch ? dateMatch[1] : getDateString(),
    amount: amountMatch ? Number(amountMatch[2] || amountMatch[1]) : 0,
    category: categorizeText(text)
  };
}

function handleReceiptUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    receiptPreview.src = e.target.result;
    receiptPreview.hidden = false;
    receiptResultEl.innerHTML = '<p>Scanning receipt...</p>';

    try {
      const { data: { text } } = await Tesseract.recognize(e.target.result, 'eng');
      const result = extractReceiptData(text);
      receiptResultEl.innerHTML = `
        <p><strong>Store:</strong> ${result.store}</p>
        <p><strong>Date:</strong> ${result.date}</p>
        <p><strong>Amount:</strong> ${formatCurrency(result.amount)}</p>
        <p><strong>Category:</strong> ${result.category}</p>
        <button id="applyReceiptBtn" class="receipt-btn">Add as Expense</button>
      `;

      document.getElementById('applyReceiptBtn').addEventListener('click', () => {
        transactions.unshift({
          id: Date.now(),
          description: result.store,
          amount: result.amount,
          type: 'expense',
          category: result.category,
          date: result.date || getDateString()
        });
        saveTransactions();
        updateUI();
      });
    } catch (error) {
      receiptResultEl.innerHTML = '<p>OCR failed. Please try another image.</p>';
    }
  };
  reader.readAsDataURL(file);
}

function updateUI() {
  updateSummary();
  updateTransactions();
  updateSmartCategorization();
  updatePredictions();
  updateBudgetAlerts();
  updateSubscriptions();
  updateGoals();
  updateAnalytics();
}

document.getElementById('goalForm').addEventListener('submit', addGoal);
document.getElementById('receiptInput').addEventListener('change', handleReceiptUpload);
setupVoiceRecognition();
updateUI();
