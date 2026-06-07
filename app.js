// ==========================================================================
// Daily Expense Tracker State & Logic
// ==========================================================================

// Category configuration
const CATEGORIES = {
  food: { name: 'Food', icon: '🍔', color: '#f97316' },
  transport: { name: 'Transport', icon: '🚗', color: '#0ea5e9' },
  shopping: { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  bills: { name: 'Bills', icon: '💳', color: '#10b981' },
  entertainment: { name: 'Leisure', icon: '🎬', color: '#8b5cf6' },
  other: { name: 'Other', icon: '📦', color: '#64748b' }
};

// Application State
let state = {
  expenses: [],
  dailyBudget: 50.00,
  selectedCategory: 'food',
  currentFilter: 'all',
  searchQuery: ''
};

// DOM Elements
const currentDateEl = document.getElementById('current-date');
const todaySpendEl = document.getElementById('today-spend');
const dailyBudgetValEl = document.getElementById('daily-budget-val');
const budgetProgressEl = document.getElementById('budget-progress');
const budgetStatusEl = document.getElementById('budget-status');
const monthlySpendEl = document.getElementById('monthly-spend');
const budgetCard = document.querySelector('.stat-card.budget');

const expenseForm = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const descriptionInput = document.getElementById('description');
const categorySelector = document.getElementById('category-selector');
const expenseDateInput = document.getElementById('expense-date');
const toggleDateBtn = document.getElementById('toggle-date-btn');

const searchInput = document.getElementById('search-input');
const filterBar = document.querySelector('.filter-bar');
const expensesList = document.getElementById('expenses-list');
const emptyState = document.getElementById('empty-state');

const budgetModal = document.getElementById('budget-modal');
const editBudgetBtn = document.getElementById('edit-budget-btn');
const budgetInput = document.getElementById('budget-input');
const budgetSaveBtn = document.getElementById('budget-save');
const budgetCancelBtn = document.getElementById('budget-cancel');

// ==========================================================================
// Initialization & Startup
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDateDisplay();
  loadLocalStorage();
  setupEventListeners();
  setDefaultDate();
  render();
});

// Initialize header date display
function initDateDisplay() {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  const todayStr = new Date().toLocaleDateString('en-US', options);
  currentDateEl.textContent = todayStr;
}

// Set default value for the date input to today (local time)
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  expenseDateInput.value = `${yyyy}-${mm}-${dd}`;
}

// Load data from LocalStorage
function loadLocalStorage() {
  const storedExpenses = localStorage.getItem('spendid_expenses');
  const storedBudget = localStorage.getItem('spendid_daily_budget');
  
  if (storedExpenses) {
    try {
      state.expenses = JSON.parse(storedExpenses);
    } catch (e) {
      console.error('Error parsing expenses from localStorage', e);
      state.expenses = [];
    }
  }
  
  if (storedBudget) {
    state.dailyBudget = parseFloat(storedBudget) || 50.00;
  }
}

// Save data to LocalStorage
function saveExpenses() {
  localStorage.setItem('spendid_expenses', JSON.stringify(state.expenses));
}

function saveBudget() {
  localStorage.setItem('spendid_daily_budget', state.dailyBudget.toString());
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Category Pill Selection
  categorySelector.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;
    
    // Deactivate current
    categorySelector.querySelector('.category-pill.active')?.classList.remove('active');
    
    // Activate new
    pill.classList.add('active');
    state.selectedCategory = pill.dataset.category;
  });

  // Quick Amount Buttons (+5, +10, etc.)
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.val);
      const currentVal = parseFloat(amountInput.value) || 0;
      amountInput.value = (currentVal + val).toFixed(2);
      amountInput.focus();
    });
  });

  // Toggle Custom Date Visibility
  toggleDateBtn.addEventListener('click', () => {
    if (expenseDateInput.classList.contains('hidden')) {
      expenseDateInput.classList.remove('hidden');
      toggleDateBtn.textContent = 'Use Today';
    } else {
      expenseDateInput.classList.add('hidden');
      toggleDateBtn.textContent = 'Change Date';
      setDefaultDate();
    }
  });

  // Expense Form Submit
  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddExpense();
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderList();
  });

  // History Filter pills
  filterBar.addEventListener('click', (e) => {
    const button = e.target.closest('.filter-pill');
    if (!button) return;
    
    filterBar.querySelector('.filter-pill.active')?.classList.remove('active');
    button.classList.add('active');
    state.currentFilter = button.dataset.filter;
    renderList();
  });

  // List Item Actions (Delete via event delegation)
  expensesList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    
    const itemId = deleteBtn.dataset.id;
    handleDeleteExpense(itemId);
  });

  // Budget Modal triggers
  editBudgetBtn.addEventListener('click', () => {
    budgetInput.value = state.dailyBudget.toFixed(0);
    budgetModal.classList.remove('hidden');
    budgetInput.focus();
  });

  budgetCancelBtn.addEventListener('click', () => {
    budgetModal.classList.add('hidden');
  });

  budgetSaveBtn.addEventListener('click', () => {
    const newBudget = parseFloat(budgetInput.value);
    if (!isNaN(newBudget) && newBudget > 0) {
      state.dailyBudget = newBudget;
      saveBudget();
      renderStats();
      budgetModal.classList.add('hidden');
    }
  });

  // Close modal when clicking outside
  budgetModal.addEventListener('click', (e) => {
    if (e.target === budgetModal) {
      budgetModal.classList.add('hidden');
    }
  });
}

// ==========================================================================
// Operations / State Mutations
// ==========================================================================

// Add a new expense item
function handleAddExpense() {
  const amount = parseFloat(amountInput.value);
  const description = descriptionInput.value.trim();
  const dateStr = expenseDateInput.value; // YYYY-MM-DD
  const category = state.selectedCategory;

  if (isNaN(amount) || amount <= 0) return;
  if (!description) return;

  const newExpense = {
    id: Date.now().toString(),
    amount: amount,
    description: description,
    category: category,
    date: dateStr,
    createdAt: new Date().toISOString()
  };

  // Prepend to list state
  state.expenses.unshift(newExpense);
  saveExpenses();
  
  // Clean inputs
  amountInput.value = '';
  descriptionInput.value = '';
  
  // Keep category and date active for rapid entry, but close date if toggle was standard
  // Update stats and redraw list
  render();
}

// Delete an expense item (with nice slide-out animation)
function handleDeleteExpense(id) {
  const itemEl = document.querySelector(`.expense-item[data-id="${id}"]`);
  if (itemEl) {
    // Add fade-out transition
    itemEl.classList.add('fade-out');
    
    // Wait for animation to finish
    setTimeout(() => {
      state.expenses = state.expenses.filter(item => item.id !== id);
      saveExpenses();
      render();
    }, 250);
  }
}

// Utility: Format currency numbers
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

// Utility: Format date keys for comparison
// Input: 'YYYY-MM-DD'
function getRelativeDateLabel(dateStr) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  
  if (dateStr === todayKey) {
    return 'Today';
  } else if (dateStr === yesterdayKey) {
    return 'Yesterday';
  } else {
    // Return formated string: e.g. "Sunday, Jun 7" or similar
    const dateParts = dateStr.split('-');
    const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    return parsedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: parsedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
}

function getLocalDateKey(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ==========================================================================
// Rendering Views
// ==========================================================================

function render() {
  renderStats();
  renderList();
}

// Calculate and render statistics summary
function renderStats() {
  const todayKey = getLocalDateKey(new Date());
  
  // Calculate Today's spend
  const todaySpend = state.expenses
    .filter(item => item.date === todayKey)
    .reduce((sum, item) => sum + item.amount, 0);

  // Calculate Monthly spend (current month and year)
  const today = new Date();
  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthlySpend = state.expenses
    .filter(item => item.date.startsWith(currentMonthPrefix))
    .reduce((sum, item) => sum + item.amount, 0);

  // Update UI values
  todaySpendEl.textContent = formatCurrency(todaySpend);
  dailyBudgetValEl.textContent = formatCurrency(state.dailyBudget);
  monthlySpendEl.textContent = formatCurrency(monthlySpend);

  // Budget progress logic
  const budgetRatio = Math.min(todaySpend / state.dailyBudget, 1.0);
  const progressPercent = budgetRatio * 100;
  budgetProgressEl.style.width = `${progressPercent}%`;

  if (todaySpend > state.dailyBudget) {
    budgetCard.classList.add('over-budget');
    const overage = todaySpend - state.dailyBudget;
    budgetStatusEl.textContent = `${formatCurrency(overage)} over budget limit`;
    budgetStatusEl.style.color = 'var(--danger)';
  } else {
    budgetCard.classList.remove('over-budget');
    const remaining = state.dailyBudget - todaySpend;
    budgetStatusEl.textContent = `${formatCurrency(remaining)} remaining today`;
    budgetStatusEl.style.color = 'var(--text-muted)';
  }
}

// Render dynamic transactions list
function renderList() {
  // Clear the list container
  expensesList.innerHTML = '';

  // Apply search query and category filters
  let filtered = state.expenses.filter(item => {
    const matchesCategory = state.currentFilter === 'all' || item.category === state.currentFilter;
    const matchesSearch = item.description.toLowerCase().includes(state.searchQuery);
    return matchesCategory && matchesSearch;
  });

  // If list is empty, show empty state helper
  if (filtered.length === 0) {
    expensesList.appendChild(emptyState);
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  // Sort by date (descending) then by ID (descending)
  filtered.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.id.localeCompare(a.id);
  });

  // Group items by date key
  const groups = {};
  filtered.forEach(item => {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }
    groups[item.date].push(item);
  });

  // Append elements group by group
  Object.keys(groups).forEach(dateKey => {
    // Create header label element
    const groupHeader = document.createElement('div');
    groupHeader.className = 'date-group-header';
    groupHeader.textContent = getRelativeDateLabel(dateKey);
    
    // Create items wrapper element
    const itemsWrapper = document.createElement('div');
    itemsWrapper.className = 'date-group-items';

    // Populate wrapper with item nodes
    groups[dateKey].forEach(item => {
      const catInfo = CATEGORIES[item.category] || CATEGORIES.other;
      
      const itemNode = document.createElement('div');
      itemNode.className = 'expense-item';
      itemNode.dataset.id = item.id;
      // Inject transparency version of category color for beautiful glows
      itemNode.style.setProperty('--cat-color-alpha', `${catInfo.color}33`); 

      itemNode.innerHTML = `
        <div class="item-left">
          <div class="item-cat-icon" style="background-color: ${catInfo.color}15; color: ${catInfo.color};">
            ${catInfo.icon}
          </div>
          <div class="item-details">
            <span class="item-desc">${escapeHTML(item.description)}</span>
            <span class="item-meta">${catInfo.name}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="item-price">${formatCurrency(item.amount)}</span>
          <button class="delete-btn" data-id="${item.id}" title="Delete Expense">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      `;
      itemsWrapper.appendChild(itemNode);
    });

    expensesList.appendChild(groupHeader);
    expensesList.appendChild(itemsWrapper);
  });
}

// Helper: Escape HTML strings to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
