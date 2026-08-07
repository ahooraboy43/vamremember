const SUPABASE_URL = "https://yfgyauzuzznlhradsrbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A";
const TABLE_NAME = "expenses";
const TRANSACTION_TABLE = "transactions";
const MONTHS = [
  { key: "farvardin", name: "فروردین" },
  { key: "ordibehesht", name: "اردیبهشت" },
  { key: "khordad", name: "خرداد" },
  { key: "tir", name: "تیر" },
  { key: "mordad", name: "مرداد" },
  { key: "shahrivar", name: "شهریور" },
  { key: "mehr", name: "مهر" },
  { key: "aban", name: "آبان" },
  { key: "azar", name: "آذر" },
  { key: "dey", name: "دی" },
  { key: "bahman", name: "بهمن" },
  { key: "esfand", name: "اسفند" }
];
const DEBT_TABLE = "debts";
let allDebts = [];
let editingDebtId = null;

// =========================================================
// سیستم مدیریت داده مرکزی
// =========================================================

const DataManager = {
  KEYS: {
    BANKS: 'banks',
    BANK_CARDS: 'bankCardsV1',
    SETTINGS: 'appSettingsV1',
    SESSION: 'appUnlockedV1'
  },
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('❌ خطا در ذخیره:', e);
      return false;
    }
  },
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return defaultValue;
      return JSON.parse(data);
    } catch (e) {
      console.error('❌ خطا در خواندن:', e);
      return defaultValue;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('❌ خطا در حذف:', e);
      return false;
    }
  },
  getBanks() {
    return this.load(this.KEYS.BANKS, ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"]);
  },
  saveBanks(banks) {
    return this.save(this.KEYS.BANKS, banks);
  },
  addBank(name) {
    const banks = this.getBanks();
    if (!banks.includes(name)) {
      banks.push(name);
      this.saveBanks(banks);
      return true;
    }
    return false;
  },
  removeBank(name) {
    let banks = this.getBanks();
    banks = banks.filter(b => b !== name);
    this.saveBanks(banks);
    return banks;
  },
 getBankCards() {
  try {
    const data = this.load(this.KEYS.BANK_CARDS);
    // اطمینان از اینکه array هست و فیلتر کردن
    if (Array.isArray(data)) {
      return data.filter(c => c && c.bankName);
    }
    return [];
  } catch (e) {
    console.error("❌ خطا در خواندن کارت‌های بانکی:", e);
    return [];
  }
},
saveBankCards(cards) {
  try {
    // فیلتر کردن کارت‌های خالی
    const validCards = Array.isArray(cards) ? cards.filter(c => c && c.bankName) : [];
    return this.save(this.KEYS.BANK_CARDS, validCards);
  } catch (e) {
    console.error("❌ خطا در ذخیره کارت‌های بانکی:", e);
    return false;
  }
},
  addBankCard(card) {
    const cards = this.getBankCards();
    const index = cards.findIndex(c => c.bankName === card.bankName);
    if (index !== -1) {
      cards[index] = { ...cards[index], ...card };
    } else {
      cards.push(card);
    }
    this.saveBankCards(cards);
    return cards;
  },
  removeBankCard(id) {
    let cards = this.getBankCards();
    cards = cards.filter(c => c.id !== id);
    this.saveBankCards(cards);
    return cards;
  },
  getSettings() {
    return this.load(this.KEYS.SETTINGS, {});
  },
  saveSettings(settings) {
    return this.save(this.KEYS.SETTINGS, settings);
  },
  clearAll() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('❌ خطا در پاک کردن:', e);
      return false;
    }
  },
  backup() {
    try {
      const backup = {
        version: '1.0',
        date: new Date().toISOString(),
        data: {
          banks: this.getBanks(),
          bankCards: this.getBankCards(),
          settings: this.getSettings(),
          expenses: typeof allExpenses !== 'undefined' ? allExpenses : [],
          debts: typeof allDebts !== 'undefined' ? allDebts : []
        }
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ پشتیبان‌گیری انجام شد', 'success');
      return true;
    } catch (e) {
      console.error('❌ خطا در پشتیبان‌گیری:', e);
      showToast('❌ خطا در پشتیبان‌گیری', 'error');
      return false;
    }
  },
  restore(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup.version || !backup.data) {
            throw new Error('فایل پشتیبان معتبر نیست');
          }
          if (backup.data.banks) this.saveBanks(backup.data.banks);
          if (backup.data.bankCards) this.saveBankCards(backup.data.bankCards);
          if (backup.data.settings) this.saveSettings(backup.data.settings);
          if (backup.data.expenses && typeof allExpenses !== 'undefined') {
            allExpenses = backup.data.expenses;
          }
          if (backup.data.debts && typeof allDebts !== 'undefined') {
            allDebts = backup.data.debts;
          }
          showToast('✅ بازیابی انجام شد', 'success');
          resolve(true);
        } catch (err) {
          console.error('❌ خطا در بازیابی:', err);
          showToast('❌ خطا در بازیابی', 'error');
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};

function fillDebtDateSelects() {
  const daySel = document.getElementById("debtDueDay");
  const monthSel = document.getElementById("debtDueMonth");
  const yearSel = document.getElementById("debtDueYear");
  if (!daySel || !monthSel || !yearSel) {
    console.warn("❌ عناصر تاریخ قرض پیدا نشدند");
    return;
  }
  if (daySel.options.length === 0) {
    for (let d = 1; d <= 31; d++) {
      const op = document.createElement("option");
      op.value = d;
      op.textContent = d.toLocaleString("fa-IR");
      daySel.appendChild(op);
    }
  }
  if (monthSel.options.length === 0) {
    MONTHS.forEach(m => {
      const op = document.createElement("option");
      op.value = m.key;
      op.textContent = m.name;
      monthSel.appendChild(op);
    });
  }
  const p = getPersianDateParts();
  const monthIndex = p.month - 1;
  const selectedMonthKey = MONTHS[monthIndex]?.key || MONTHS[0].key;
  if (!document.getElementById("editExpenseId")?.value && !editingDebtId) {
    daySel.value = p.day;
    monthSel.value = selectedMonthKey;
    yearSel.value = p.year;
  }
}

const PAGE_SIZE = 10;
let allExpenses = [],
  visibleCount = PAGE_SIZE,
  activeFilter = "all",
  activeStatusFilter = "all",
  currentMonthKey = null,
  currentMonthIndex = 0;

const $ = id => document.getElementById(id);
const cards = $("cards"),
  statusBox = $("status"),
  refreshButton = null,
  todayElement = $("today");
let swRegistration = null;
let currentAppVersionText = "در حال بررسی نسخه…";

const pages = document.querySelectorAll(".page"),
  navButtons = document.querySelectorAll(".nav-button"),
  pageTitle = $("pageTitle");
const allCards = $("allCards"),
  allStatus = $("allStatus"),
  searchInput = $("searchInput"),
  loadMoreButton = $("loadMore");
const typeFilters = document.querySelectorAll(".type-filter"),
  statusFilters = document.querySelectorAll(".status-filter"),
  addExpenseButton = $("addExpenseButton");
const expenseModal = $("expenseModal");
const closeExpenseModal = $("closeExpenseModal");
const editExpenseId = $("editExpenseId"),
  expenseType = $("expenseType"),
  installmentTypeButton = $("installmentTypeButton"),
  expenseTypeButton = $("expenseTypeButton");
const expenseTitleLabel = $("expenseTitleLabel"),
  expenseTitle = $("expenseTitle"),
  expenseAmount = $("expenseAmount"),
  expenseTitleSelect = $("expenseTitleSelect"),
  expenseDueDay = $("expenseDueDay"),
  expenseInstallments = $("expenseInstallments"),
  installmentFields = $("installmentFields"),
  startMonthLabel = $("startMonthLabel"),
  expenseStartMonth = $("expenseStartMonth"),
  expenseNote = $("expenseNote"),
  monthsEditor = $("monthsEditor"),
  monthFields = $("monthFields"),
  saveExpenseButton = $("saveExpenseButton");
const reportMonthTotal = $("reportMonthTotal"),
  reportPaidTotal = $("reportPaidTotal"),
  reportRemainingTotal = $("reportRemainingTotal"),
  reportExpensesTotal = $("reportExpensesTotal"),
  reportAllTotal = $("reportAllTotal"),
  paidPercent = $("paidPercent"),
  remainingPercent = $("remainingPercent"),
  paidBar = $("paidBar"),
  remainingBar = $("remainingBar");
const reportIncomeTotal = $("reportIncomeTotal"),
  reportBalanceTotal = $("reportBalanceTotal"),
  incomePercent = $("incomePercent"),
  paymentPercent = $("paymentPercent"),
  incomeBar = $("incomeBar"),
  paymentBar = $("paymentBar");
const transferTypeButton = $("transferTypeButton");
const transferFrom = $("transferFrom");
const transferTo = $("transferTo");
const expenseFields = $("expenseFields");
const transferFields = $("transferFields");
const incomeTypeButton = $("incomeTypeButton");
let selectedIncomeBank = null;
const incomeFields = $("incomeFields");
const transferModal = $("transferModal");
const closeTransferModal = $("closeTransferModal");
const transferForm = $("transferForm");
const reportDetailsModal = $("reportDetailsModal"),
  reportDetailsTitle = $("reportDetailsTitle"),
  reportDetailsList = $("reportDetailsList"),
  closeReportDetails = $("closeReportDetails");
let _toastTimer;

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

function fillPaymentDateSelects() {
  const daySel = document.getElementById("paymentDay");
  const monthSel = document.getElementById("paymentMonth");
  const yearSel = document.getElementById("paymentYear");
  if (!daySel || !monthSel || !yearSel) {
    console.warn("❌ عناصر تاریخ پرداخت پیدا نشدند");
    return;
  }
  if (daySel.options.length === 0) {
    for (let d = 1; d <= 31; d++) {
      const op = document.createElement("option");
      op.value = d;
      op.textContent = d.toLocaleString("fa-IR");
      daySel.appendChild(op);
    }
  }
  if (monthSel.options.length === 0) {
    MONTHS.forEach(m => {
      const op = document.createElement("option");
      op.value = m.key;
      op.textContent = m.name;
      monthSel.appendChild(op);
    });
  }
  const p = getPersianDateParts();
  const monthIndex = p.month - 1;
  const selectedMonthKey = MONTHS[monthIndex]?.key || MONTHS[0].key;
  daySel.value = p.day;
  monthSel.value = selectedMonthKey;
  yearSel.value = p.year;
}

function closeModalEl(modalEl) {
  modalEl.classList.remove("open");
  document.body.style.overflow = "";
}

closeExpenseModal?.addEventListener("click", closeModal);
closeTransferModal?.addEventListener("click", () => {
  if (transferModal) {
    closeModalEl(transferModal);
  }
});
transferModal?.querySelector(".modal-backdrop")?.addEventListener("click", () => {
  closeModalEl(transferModal);
});
expenseModal?.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);

async function addTransaction(data) {
  return await supabaseRequest(TRANSACTION_TABLE, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
}

function getHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
}

async function supabaseRequest(path, options = {}) {
  const headers = { ...getHeaders(), ...(options.headers || {}) };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  return text ? JSON.parse(text) : null;
}


function toEnglishDigits(value) {
  return String(value).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function getPersianDateParts() {
  try {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }).formatToParts(new Date());
    const v = {};
    for (const p of parts) {
      if (["year", "month", "day"].includes(p.type)) {
        v[p.type] = Number(toEnglishDigits(p.value));
      }
    }
    return v;
  } catch (e) {
    console.warn("خطا در دریافت تاریخ شمسی، استفاده از تاریخ میلادی:", e);
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
}

function updatePersianDate() {
  try {
    todayElement.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date());
  } catch (e) {
    console.warn("خطا در نمایش تاریخ شمسی:", e);
    todayElement.textContent = new Date().toLocaleDateString("fa-IR");
  }
  const p = getPersianDateParts();
  if (p && p.month) {
    currentMonthIndex = p.month - 1;
    currentMonthKey = MONTHS[currentMonthIndex]?.key || MONTHS[0].key;
  }
}

function isInstallment(i) {
  return i.type === "installment" || Number(i.id) < 10000;
}

const DEFAULT_BANKS = ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
let banks;
try {
  const saved = localStorage.getItem("banks");
  banks = saved ? JSON.parse(saved) : [...DEFAULT_BANKS];
} catch {
  banks = [...DEFAULT_BANKS];
}

function handleError(error, context = 'عملیات') {
  console.error(`خطا در ${context}:`, error);
  showToast(`❌ ${context} با خطا مواجه شد: ${error.message || 'خطای ناشناخته'}`, 'error');
  console.error('Stack trace:', error.stack);
  return { success: false, error };
}

function saveBanks(banksData) {
  if (banksData) {
    return DataManager.saveBanks(banksData);
  }
  return DataManager.saveBanks(banks);
}

function getBanks() {
  return DataManager.getBanks();
}

function renderBanks() {
  const list = document.getElementById("banksList");
  if (!list) return;
  list.innerHTML = banks.map((b, i) => `
    <div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span>${b}</span>
      <div style="display:flex;gap:6px">
        <button class="btn-sm" onclick="editBank(${i})">ویرایش</button>
        <button class="btn-sm btn-danger" onclick="deleteBank(${i})">حذف</button>
      </div>
    </div>
  `).join("");
}

function editBank(i) {
  const name = prompt("نام جدید:", banks[i]);
  if (name && name.trim()) {
    banks[i] = name.trim();
    saveBanks();
    renderBanks();
    renderPaymentBanks();
  }
}

function deleteBank(i) {
  if (!confirm(`حذف "${banks[i]}"؟`)) return;
  banks.splice(i, 1);
  saveBanks();
  renderBanks();
  renderPaymentBanks();
}

function renderPaymentBanks() {
  const container = document.getElementById("paymentBanksContainer");
  if (!container) return;
  const banksList = getBanks();
  container.innerHTML = banksList.map(b =>
    `<button type="button" class="tag-btn payment-bank" data-bank="${b}">${b}</button>`
  ).join("");
  container.querySelectorAll(".payment-bank").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".payment-bank").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedIncomeBank = btn.dataset.bank;
    });
  });
}

document.getElementById("addBankButton")?.addEventListener("click", () => {
  const input = document.getElementById("bankNameInput");
  const name = input.value.trim();
  if (!name) return;
  const currentBanks = getBanks();
  currentBanks.push(name);
  banks = currentBanks;
  saveBanks(banks);
  renderBanks();
  renderPaymentBanks();
  input.value = "";
});

renderBanks();
renderPaymentBanks();

function isExpense(i) {
  const id = Number(i.id);
  return i.type === "expense" || (id >= 10000 && id < 20000);
}

function isIncome(i) {
  const id = Number(i.id);
  return i.type === "income" || (id >= 20000 && id < 30000);
}

function isNullValue(v) { return v === null || v === undefined || v === ""; }
function isClosedValue(v) { return String(v || "").trim().toUpperCase() === "CLOSE"; }
function isPaidValue(v) { return !isNullValue(v) && !isClosedValue(v); }
function formatMoney(v) { return Number(v || 0).toLocaleString("fa-IR") + " ریال"; }
function escapeHtml(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function getCurrentPersianDay() { return getPersianDateParts().day; }

function parseMoney(v) {
  if (isNullValue(v) || isClosedValue(v)) return null;
  const n = Number(String(v).split(/\s*-\s*/)[0].replace(/[,\s٬]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function getRemainingInstallments(item) {
  if (!isInstallment(item)) return 0;
  return Number(item.installment_count || 0);
}

function getPaidCount(item) { let n = 0; for (const m of MONTHS) if (isPaidValue(item[m.key])) n++; return n; }
function getLatestExpenseAmount(item) { for (let i = currentMonthIndex; i >= 0; i--) { const n = parseMoney(item[MONTHS[i].key]); if (n !== null) return n; } for (let i = MONTHS.length - 1; i > currentMonthIndex; i--) { const n = parseMoney(item[MONTHS[i].key]); if (n !== null) return n; } return Number(item.amount || 0); }
function getExpenseTotal(item) { let total = 0; for (const m of MONTHS) { const n = parseMoney(item[m.key]); if (n !== null) total += n; } return total; }
function extractPaymentDate(v) { if (!isPaidValue(v)) return ""; const s = String(v); const matches = s.match(/[۰-۹0-9]{4}[\/\-][۰-۹0-9]{1,2}[\/\-][۰-۹0-9]{1,2}/g); return matches?.at(-1) || s; }
function currentStatus(item) { const v = item[currentMonthKey]; if (isClosedValue(v)) return "بسته"; return isPaidValue(v) ? "پرداخت‌شده" : "پرداخت‌نشده"; }

async function loadData() {
  if (refreshButton) {
    refreshButton.disabled = true;
  }
  statusBox.textContent = "📡 در حال دریافت اطلاعات…";
  allStatus.textContent = "📡 در حال دریافت اطلاعات…";
  try {
    const data = await supabaseRequest(`${TABLE_NAME}?select=*&order=id.asc`);
    allExpenses = Array.isArray(data) ? data : [];
    try {
      localStorage.setItem('cachedExpenses', JSON.stringify(allExpenses));
      localStorage.setItem('cachedExpensesDate', new Date().toISOString());
    } catch (cacheErr) {
      console.warn('خطا در ذخیره کش:', cacheErr);
    }
    loadIncomeOptions();
    visibleCount = PAGE_SIZE;
    renderDueCards();
    renderAllCards();
    renderReports();
    renderHome();
    statusBox.textContent = `${allExpenses.length.toLocaleString("fa-IR")} مورد دریافت شد`;
    allStatus.textContent = `${allExpenses.length.toLocaleString("fa-IR")} مورد موجود است`;
  } catch (e) {
    console.error('❌ خطا در loadData:', e);
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      try {
        const cached = localStorage.getItem('cachedExpenses');
        if (cached) {
          allExpenses = JSON.parse(cached);
          const cacheDate = localStorage.getItem('cachedExpensesDate') || 'نامشخص';
          loadIncomeOptions();
          visibleCount = PAGE_SIZE;
          renderDueCards();
          renderAllCards();
          renderReports();
          renderHome();
          statusBox.textContent = `📂 نمایش داده‌های ذخیره شده (${new Date(cacheDate).toLocaleString('fa-IR')})`;
          allStatus.textContent = `📂 ${allExpenses.length} مورد از کش (آفلاین)`;
          showToast(`📂 نمایش داده‌های ذخیره شده`, 'info');
        } else {
          statusBox.textContent = `❌ بدون داده ذخیره شده و بدون اتصال`;
          allStatus.textContent = `❌ لطفاً اتصال اینترنت را بررسی کنید`;
        }
      } catch (cacheErr) {
        console.warn('خطا در خواندن کش:', cacheErr);
        statusBox.textContent = `❌ خطا: ${e.message}`;
        allStatus.textContent = `❌ خطا: ${e.message}`;
      }
    } else {
      statusBox.textContent = `❌ خطا: ${e.message}`;
      allStatus.textContent = `❌ خطا: ${e.message}`;
    }
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
    }
  }
}

function getDaysInPersianMonth(monthIndex) {
  if (monthIndex <= 5) return 31;
  if (monthIndex <= 10) return 30;
  return 29;
}

function getDueItems() {
  const today = getCurrentPersianDay();
  const daysInCurrentMonth = getDaysInPersianMonth(currentMonthIndex);
  return allExpenses
    .filter(isInstallment)
    .filter(i => Number.isFinite(Number(i.due_day)) && Number(i.due_day) > 0)
    .map(i => {
      const dueDay = Number(i.due_day);
      let diff = dueDay - today;
      let targetMonthIndex = currentMonthIndex;
      if (diff < 0) {
        diff += daysInCurrentMonth;
        targetMonthIndex = (currentMonthIndex + 1) % 12;
      }
      return {
        ...i,
        daysRemaining: diff,
        targetMonthKey: MONTHS[targetMonthIndex].key
      };
    })
    .filter(i => isNullValue(i[i.targetMonthKey]) && i.daysRemaining <= 7)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function renderDueCards() {
  const items = getDueItems();
  cards.innerHTML = "";
  if (!items.length) {
    cards.innerHTML = '<div class="empty">قسط سررسیدشده یا نزدیک به سررسید وجود ندارد</div>';
    return;
  }
  items.forEach(i => cards.appendChild(createDueCard(i)));
}

function setupPaymentPanel(card, item) {
  const save = card.querySelector(".save-payment");
  const cancel = card.querySelector(".cancel-payment");
  const noteBox = card.querySelector(".payment-note");
  const addDate = card.querySelector(".add-date");
  const confirm = card.querySelector(".confirm-payment");
  let selectedBank = null;
  setupButtonGroup(card, ".bank-tag", btn => {
    selectedBank = btn.dataset.bank;
    let text = noteBox.value;
    (JSON.parse(localStorage.getItem('banks') || '[]'))
      .forEach(b => { text = text.replace(b, ""); });
    text = text.replace(/^\s*-\s*/, "").trim();
    noteBox.value = btn.dataset.bank + (text ? " - " + text : "-");
  });
  cancel.addEventListener("click", () => card.classList.remove("open"));
  save.addEventListener("click", async () => {
    if (!confirm.checked) return alert("لطفاً پرداخت را تأیید کنید");
    const p = getPersianDateParts();
    const dateStr = addDate.checked ? `${p.year}/${String(p.month).padStart(2, "0")}/${String(p.day).padStart(2, "0")}` : null;
    const note = noteBox.value.trim() || null;
    const cellValue = [note, dateStr].filter(Boolean).join(" - ");
    try {
      await supabaseRequest(`${TABLE_NAME}?id=eq.${item.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ [currentMonthKey]: cellValue })
      });
      await registerPaymentTransaction(item, note, selectedBank);
      const currentRemaining = Number(item.installment_count);
      if (Number.isFinite(currentRemaining) && currentRemaining > 0) {
        await supabaseRequest(`${TABLE_NAME}?id=eq.${item.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ installment_count: Math.max(0, currentRemaining - 1) })
        });
      }
      card.classList.remove("open");
      await loadData();
    } catch (e) {
      alert("خطا در ثبت پرداخت");
    }
  });
}

function setupButtonGroup(parent, selector, callback) {
  parent.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener("click", () => {
      parent.querySelectorAll(selector).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (callback) {
        callback(btn);
      }
    });
  });
}

function createDueCard(item) {
  const card = document.createElement("article");
  card.className = "card " + (item.daysRemaining < 0 ? "overdue" : "soon");
  const dayText = item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining).toLocaleString("fa-IR")} روز گذشته` : item.daysRemaining === 0 ? "امروز" : `${item.daysRemaining.toLocaleString("fa-IR")} روز مانده`;
  card.innerHTML = `<div class="card-main"><div class="name">${escapeHtml(item.title)}</div><div class="top"><div class="days">${dayText}</div><div class="installment-badge">${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی مانده</div></div><div class="amount">${formatMoney(item.amount)}</div><div class="meta">سررسید: روز ${Number(item.due_day).toLocaleString("fa-IR")}ام</div></div>${createPaymentPanelHtml()}`;
  card.querySelector(".card-main").addEventListener("click", () => {
    document.querySelectorAll("#cards .card.open").forEach(c => {
      if (c !== card) c.classList.remove("open");
    });
    card.classList.toggle("open");
  });
  setupPaymentPanel(card, item);
  return card;
}

function createPaymentPanelHtml() {
  return `
<div class="payment-panel">
<div class="payment-title">ثبت پرداخت</div>
<textarea class="payment-note" placeholder="توضیح پرداخت..."></textarea>
<div class="quick-tags">
 ${getBanks().map(b => `<button type="button" class="tag-btn bank-tag" data-bank="${b}">${b}</button>`).join('')}
</div>
<label class="date-option">
<input type="checkbox" class="add-date" checked>
افزودن تاریخ پرداخت
</label>
<label class="confirm-option">
<input type="checkbox" class="confirm-payment">
پرداخت این قسط را تأیید می‌کنم
</label>
<div class="payment-actions">
<button type="button" class="cancel-payment">انصراف</button>
<button type="button" class="save-payment">ثبت پرداخت</button>
</div>
</div>
`;
}

async function registerPaymentTransaction(item, note, account, date) {
  const data = {
    expense_id: Number(item.id),
    title: item.title,
    amount: Number(item.amount || 0),
    type: "payment",
    account: account || null,
    from_account: null,
    to_account: null,
    transaction_date: date || new Date().toISOString(),
    note: note || null
  };
  return await addTransaction(data);
}

function setupTransferButtons() {
  const fromContainer = document.getElementById("transferFromContainer");
  const toContainer = document.getElementById("transferToContainer");
  const transferFrom = document.getElementById("transferFromModal");
  const transferTo = document.getElementById("transferToModal");
  if (!fromContainer || !toContainer) return;

  function renderBtns(container, hiddenInput, activeClass) {
    container.innerHTML = banks.map(b =>
      `<button type="button" class="tag-btn ${activeClass}" data-bank="${b}">${b}</button>`
    ).join('');
    container.querySelectorAll(`.${activeClass}`).forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(`.${activeClass}`).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        hiddenInput.value = btn.dataset.bank;
      });
    });
  }
  renderBtns(fromContainer, transferFrom, "from-bank");
  renderBtns(toContainer, transferTo, "to-bank");
}

function getFilteredItems() {
  const s = searchInput.value.trim().toLowerCase();
  return allExpenses.filter(i => {
    if (activeFilter === "installment" && !isInstallment(i)) return false;
    if (activeFilter === "expense" && !isExpense(i)) return false;
    if (activeFilter === "income" && !isIncome(i)) return false;
    if (activeStatusFilter === "paid" && !isPaidValue(i[currentMonthKey])) return false;
    if (activeStatusFilter === "unpaid" && !isNullValue(i[currentMonthKey])) return false;
    if (!s) return true;
    return (
      String(i.title || "").toLowerCase().includes(s) ||
      String(i.id || "").includes(s) ||
      String(i.note || "").toLowerCase().includes(s)
    );
  });
}

function renderAllCards() {
  const filtered = getFilteredItems();
  const items = filtered.slice(0, visibleCount);
  allCards.innerHTML = "";
  if (!items.length) {
    allCards.innerHTML = '<div class="empty">موردی پیدا نشد</div>';
    loadMoreButton.classList.add("hidden");
    allStatus.textContent = "۰ مورد نمایش داده می‌شود";
    return;
  }
  items.forEach(i => allCards.appendChild(createCard(i, { showActions: true })));
  loadMoreButton.classList.toggle("hidden", visibleCount >= filtered.length);
  allStatus.textContent = `${filtered.length.toLocaleString("fa-IR")} مورد نمایش داده می‌شود`;
}

function getExpenseAmount(item) { return getLatestExpenseAmount(item); }

function setExpenseType(type) {
  expenseType.value = type;

  // مقداردهی required برای expenseTitle
  expenseTitle.required = (type !== "asset");

 const amountField = expenseAmount.closest(".field");
if (amountField) {
    amountField.classList.toggle("hidden", type === "expense" || type === "income" || type === "asset");
}

  installmentTypeButton?.classList.toggle("active", type === "installment");
  expenseTypeButton?.classList.toggle("active", type === "expense");
  incomeTypeButton?.classList.toggle("active", type === "income");
  transferTypeButton?.classList.toggle("active", type === "transfer");
  $("debtTypeButton")?.classList.toggle("active", type === "debt");
  $("assetTypeButton")?.classList.toggle("active", type === "asset");

  installmentFields?.classList.toggle("hidden", type !== "installment");
  expenseFields?.classList.toggle("hidden", type !== "expense");
  $("debtFields")?.classList.toggle("hidden", type !== "debt");
  incomeFields?.classList.toggle("hidden", type !== "income");
  transferFields?.classList.toggle("hidden", type !== "transfer");
  $("assetFields")?.classList.toggle("hidden", type !== "asset");

  switch (type) {
    case "installment":
      expenseTitleLabel.textContent = "عنوان قسط";
      expenseTitle.classList.remove("hidden");
      expenseTitleSelect.classList.add("hidden");
      expenseTitle.placeholder = "مثلا وام ازدواج، ویپاد";
      startMonthLabel.textContent = "ماه شروع";
      break;
    case "debt":
      fillDebtDateSelects();
      expenseTitleLabel.textContent = "توضیح (اختیاری)";
      expenseTitle.placeholder = "توضیح دلخواه";
      if (!editExpenseId.value && !editingDebtId) {
        $("debtDueDay").value = getCurrentPersianDay();
        $("debtDueMonth").value = currentMonthKey;
        $("debtDueYear").value = getPersianDateParts().year;
      }
      break;
    case "expense":
      expenseTitleLabel.textContent = "عنوان هزینه";
      expenseTitle.classList.remove("hidden");
      expenseTitle.placeholder = "مثلا کارواش یا عمومی";
      startMonthLabel.textContent = "ماه هزینه";
      break;
    case "income":
      expenseTitleLabel.textContent = "عنوان درآمد";
      expenseTitle.placeholder = "مثلا حقوق، فروش، سود";
      startMonthLabel.textContent = "ماه درآمد";
      break;
    case "transfer":
      expenseTitleLabel.textContent = "شرح انتقال";
      expenseTitle.placeholder = "مثلا انتقال از ملی به رفاه";
      startMonthLabel.textContent = "تاریخ انتقال";
      break;
    case "asset":
      expenseTitleLabel.textContent = "تعریف دارایی جدید";
      expenseTitle.placeholder = "مثلا انگشتر طلا";
      expenseTitle.classList.add("hidden");
      expenseTitle.required = false;
      startMonthLabel.textContent = "";
      document.getElementById("assetFields")?.classList.remove("hidden");
      break;
  }

  expenseDueDay.required = false;
  expenseInstallments.required = false;

  if (editExpenseId.value) {
    saveExpenseButton.textContent = "ذخیره تغییرات";
  } else {
    switch (type) {
      case "installment":
        saveExpenseButton.textContent = "ثبت قسط";
        break;
      case "debt":
        saveExpenseButton.textContent = "ثبت قرض/دین";
        break;
      case "expense":
        saveExpenseButton.textContent = "ثبت هزینه";
        break;
      case "income":
        saveExpenseButton.textContent = "ثبت درآمد";
        break;
      case "transfer":
        saveExpenseButton.textContent = "ثبت انتقال";
        break;
      case "asset":
        saveExpenseButton.textContent = "ثبت دارایی";
        break;
    }
  }

  const sheet = document.querySelector(".modal-sheet");
  if (sheet) {
    sheet.classList.remove("form-income", "form-expense", "form-installment", "form-transfer");
    sheet.classList.add("form-" + type);
  }
}

fabCreate.onclick = () => {
  openWithType("expense");
};

const paymentModal = $("paymentModal");
const closePaymentModal = $("closePaymentModal");
let selectedPaymentBank = null;

function getDateFromSelects() {
  const day = parseInt(document.getElementById("paymentDay")?.value);
  const monthKey = document.getElementById("paymentMonth")?.value;
  const year = parseInt(document.getElementById("paymentYear")?.value);
  if (!day || !monthKey || !year) return null;
  const monthIndex = MONTHS.findIndex(m => m.key === monthKey);
  if (monthIndex === -1) return null;
  return {
    day: day,
    month: monthIndex + 1,
    monthKey: monthKey,
    year: year,
    fullDate: `${year}/${String(monthIndex + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`
  };
}

async function updateAccountCellFromPayment(itemId, monthKey, amount) {
  if (!itemId || !monthKey) return;
  const item = allExpenses.find(i => Number(i.id) === Number(itemId));
  const existing = item ? parseMoney(item[monthKey]) : null;
  const total = (existing || 0) + amount;
  await supabaseRequest(`${TABLE_NAME}?id=eq.${itemId}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ [monthKey]: total })
  });
}

document.querySelectorAll(".payment-type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-type-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const type = btn.dataset.type;
    $("paymentType").value = type;
    fillPaymentItems(type);
    $("paymentModalTitle").textContent = type === "income" ? "ثبت دریافت" : "ثبت پرداخت";
  });
});

document.querySelectorAll(".payment-bank").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-bank").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedPaymentBank = btn.dataset.bank;
  });
});

$("paymentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const type = $("paymentType").value || "payment";
  const itemSelect = $("paymentItemSelect");
  const itemId = itemSelect ? itemSelect.value : "";
  const amount = parseFloat($("paymentAmount").value);
  const note = $("paymentNote").value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (!itemId) { alert("حساب را انتخاب کنید."); return; }
  if (!Number.isFinite(amount) || amount <= 0) { alert("مبلغ معتبر نیست."); return; }
  if (!selectedPaymentBank) { alert("بانک را انتخاب کنید."); return; }
  const dateObj = getDateFromSelects();
  const date = dateObj ? dateObj.fullDate : null;
  const monthKey = dateObj ? dateObj.monthKey : currentMonthKey;
  if (!date) { alert("تاریخ معتبر نیست."); return; }
  if (submitBtn) submitBtn.disabled = true;
  try {
    await addTransaction({
      expense_id: Number(itemId),
      title: itemSelect.options[itemSelect.selectedIndex]?.text || "",
      amount,
      type,
      account: null,
      from_account: type === "payment" ? selectedPaymentBank : null,
      to_account: type === "income" ? selectedPaymentBank : null,
      transaction_date: new Date().toISOString(),
      note: note || null
    });
    try {
      await updateAccountCellFromPayment(itemId, monthKey, amount);
    } catch (cellErr) {
      console.error("خطا در بروزرسانی سلول ماه:", cellErr);
      alert("تراکنش ثبت شد اما بروزرسانی جدول با خطا مواجه شد:\n" + cellErr.message);
    }
    paymentModal.classList.remove("open");
    document.body.style.overflow = "";
    e.target.reset();
    selectedPaymentBank = null;
    document.querySelectorAll(".payment-bank").forEach(b => b.classList.remove("active"));
    fillPaymentDateSelects();
    await loadData();
  } catch (err) {
    console.error("خطا در ثبت تراکنش:", err);
    alert("خطا در ثبت:\n" + err.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

fabPayment.onclick = () => {
  fabMenu.classList.add("hidden");
  addExpenseButton.classList.remove("open");
  addExpenseButton.classList.remove("active");
  paymentModal.classList.add("open");
  fillPaymentItems($("paymentType").value || "payment");
  document.body.style.overflow = "hidden";
  fillPaymentDateSelects();
};

closePaymentModal.onclick = () => closeModalEl(paymentModal);
paymentModal.querySelector(".modal-backdrop").addEventListener("click", () => closeModalEl(paymentModal));

fabTransfer.onclick = () => {
  fabMenu.classList.add("hidden");
  addExpenseButton.classList.remove("open");
  addExpenseButton.classList.remove("active");
  transferModal.classList.add("open");
  document.body.style.overflow = "hidden";
};

function closeModal() { expenseModal.classList.remove("open"); document.body.style.overflow = ""; }

function resetExpenseForm() {
  editingDebtId = null;
  expenseForm.reset();
  editExpenseId.value = "";
  monthsEditor.classList.add("hidden");
  monthFields.innerHTML = "";
  expenseStartMonth.value = currentMonthKey;
  expenseModalTitle.textContent = "ثبت مورد جدید";
  setExpenseType("installment");
}

function openNewModal() { resetExpenseForm(); openModal(); }

function openEditModal(item) {
  resetExpenseForm();
  editExpenseId.value = item.id;
  expenseTitle.value = item.title || "";
  expenseNote.value = item.note || "";
  const type = isExpense(item) ? "expense" : isIncome(item) ? "income" : "installment";
  setExpenseType(type);
  if (type === "installment") {
    expenseAmount.value = item.amount ?? "";
    expenseDueDay.value = item.due_day ?? "";
    expenseInstallments.value = item.installment_count ?? "";
  } else {
    expenseAmount.value = getExpenseAmount(item);
  }
  expenseStartMonth.value = findStartMonth(item);
  expenseModalTitle.textContent = type === "installment" ? "ویرایش قسط" : type === "expense" ? "ویرایش هزینه" : "ویرایش درآمد";
  buildMonthEditor(item);
  monthsEditor.classList.remove("hidden");
  saveExpenseButton.textContent = "ذخیره تغییرات";
  openModal();
}

function findStartMonth(item) { for (const m of MONTHS) if (!isClosedValue(item[m.key])) return m.key; return currentMonthKey; }

function buildMonthEditor(item) {
  monthFields.innerHTML = "";
  for (const m of MONTHS) {
    const w = document.createElement("div");
    w.className = "month-field";
    w.innerHTML = `<label>${m.name}</label><input type="text" data-month="${m.key}" value="${escapeHtml(item[m.key] ?? "")}" placeholder="NULL / CLOSE / مقدار پرداخت">`;
    monthFields.appendChild(w);
  }
}

function getNextId(type) {
  let min, max;
  switch (type) {
    case "installment": min = 1;
      max = 9999;
      break;
    case "expense": min = 10000;
      max = 19999;
      break;
    case "income": min = 20000;
      max = 29999;
      break;
    default: return null;
  }
  const ids = allExpenses.map(x => Number(x.id)).filter(id => id >= min && id <= max);
  return ids.length ? Math.max(...ids) + 1 : min;
}

function fillPaymentItems(type) {
  const sel = $("paymentItemSelect");
  if (!sel) return;
  sel.innerHTML = '<option value="">انتخاب کنید</option>';
  const rangeStart = type === "payment" ? 10000 : 20000;
  const rangeEnd = type === "payment" ? 20000 : 30000;
  allExpenses.filter(i => Number(i.id) >= rangeStart && Number(i.id) < rangeEnd).forEach(item => {
    const op = document.createElement("option");
    op.value = item.id;
    op.textContent = item.title;
    sel.appendChild(op);
  });
  const label = $("paymentItemLabel");
  if (label) {
    label.textContent = type === "income" ? "انتخاب حساب درآمد" : "انتخاب حساب هزینه";
  }
}

async function saveExpense(e) {
  e.preventDefault();
  const type = expenseType.value;

  // ===== ثبت قرض =====
  if (type === "debt") {
    const counterparty = $("debtCounterparty").value.trim();
    const amount = Number(expenseAmount.value);
    const day = Number($("debtDueDay").value);
    const month = $("debtDueMonth").value;
    const year = Number($("debtDueYear").value);
    const direction = $("debtDirection").value || "lent";
    if (!counterparty) { alert("نام طرف حساب را وارد کنید."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { alert("مبلغ معتبر نیست."); return; }
    if (!Number.isFinite(day) || day < 1 || day > 31) { alert("روز موعد تسویه معتبر نیست."); return; }
    if (!month) { alert("ماه موعد تسویه را انتخاب کنید."); return; }
    if (!Number.isFinite(year) || year < 1300) { alert("سال معتبر نیست."); return; }
    const body = { direction, counterparty, amount, due_day: day, due_month: month, due_year: year, note: expenseTitle.value.trim() || null };
    saveExpenseButton.disabled = true;
    try {
      let debtPath = DEBT_TABLE;
      if (editingDebtId && editingDebtId !== null && editingDebtId !== undefined) {
        debtPath = `${DEBT_TABLE}?id=eq.${encodeURIComponent(String(editingDebtId))}`;
      }
      const result = await supabaseRequest(debtPath, {
        method: editingDebtId ? "PATCH" : "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body)
      });
      if (editingDebtId && Array.isArray(result) && result.length === 0) {
        alert("ویرایش انجام نشد؛ رکوردی با این شناسه پیدا نشد.");
        return;
      }
      closeModal();
      await loadDebts();
    } catch (err) {
      alert("خطا:\n" + err.message);
    } finally {
      saveExpenseButton.disabled = false;
    }
    return;
  }

  // ===== ثبت دارایی =====
  if (type === "asset") {
    const name = document.getElementById("assetName").value.trim();
    const assetType = document.getElementById("assetTypeSelect").value;
    const unit = document.getElementById("assetUnit").value.trim();
    const note = document.getElementById("assetNote").value.trim();
    if (!name) { alert("نام دارایی را وارد کنید."); return; }
    if (!unit) { alert("واحد اندازه‌گیری را وارد کنید."); return; }
    saveExpenseButton.disabled = true;
    saveExpenseButton.textContent = "در حال ذخیره...";
    try {
      await supabaseRequest("assets", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name: name, type: assetType, unit: unit, note: note || null })
      });
      closeModal();
      showToast("✅ دارایی با موفقیت ثبت شد", "success");
      await loadAssets();
      await loadData();
    } catch (err) {
      alert("خطا در ثبت دارایی:\n" + err.message);
    } finally {
      saveExpenseButton.disabled = false;
      setExpenseType(expenseType.value);
    }
    return;
  }

  // ===== ثبت انتقال =====
  if (type === "transfer") {
    if (!transferFrom.value || !transferTo.value) {
      alert("حساب مبدا و مقصد را انتخاب کنید.");
      return;
    }
    if (transferFrom.value === transferTo.value) {
      alert("مبدا و مقصد نمی‌توانند یکسان باشند.");
      return;
    }
    const amount = Number(expenseAmount.value);
    if (type !== "expense" && type !== "income") {
      if (!Number.isFinite(amount) || amount < 0) {
        alert("مبلغ معتبر نیست.");
        return;
      }
    }
    saveExpenseButton.disabled = true;
    try {
      await addTransaction({
        expense_id: null,
        title: expenseTitle.value.trim() || "انتقال وجه",
        amount: amount,
        type: "transfer",
        account: null,
        from_account: transferFrom.value,
        to_account: transferTo.value,
        transaction_date: new Date().toISOString(),
        note: expenseNote.value.trim() || null
      });
      closeModal();
      alert("انتقال ثبت شد.");
    } catch (err) {
      alert(err.message);
    } finally {
      saveExpenseButton.disabled = false;
    }
    return;
  }

  // ===== ثبت هزینه/قسط/درآمد =====
  const editingId = editExpenseId.value ? Number(editExpenseId.value) : null;
  const title = expenseTitle.value.trim();
  const amount = Number(expenseAmount.value);
  if (!title) { alert("عنوان را وارد کنید."); return; }
  if (type !== "transfer") {
    if (!Number.isFinite(amount) || amount < 0) { alert("مبلغ معتبر نیست."); return; }
  }
  if (type === "installment") {
    const d = Number(expenseDueDay.value);
    const c = Number(expenseInstallments.value);
    if (expenseDueDay.value !== "" && (!Number.isFinite(d) || d < 0 || d > 31)) {
      alert("روز سررسید معتبر نیست.");
      return;
    }
    if (expenseInstallments.value !== "" && (!Number.isFinite(c) || c < 0)) {
      alert("تعداد اقساط معتبر نیست.");
      return;
    }
  }
  saveExpenseButton.disabled = true;
  saveExpenseButton.textContent = "در حال ذخیره...";
  try {
    let body = editingId ? buildEditBody(type) : buildNewBody(type);
    if (!editingId) {
      body.id = getNextId(type);
    }
    await supabaseRequest(editingId ? `${TABLE_NAME}?id=eq.${editingId}` : TABLE_NAME, {
      method: editingId ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body)
    });
    if (type === "income") {
      await addTransaction({
        expense_id: editingId || body.id,
        title: title,
        amount: amount,
        type: "income",
        account: selectedIncomeBank || null,
        from_account: null,
        to_account: null,
        transaction_date: new Date().toISOString(),
        note: expenseNote.value.trim() || null
      });
    }
    closeModal();
    await loadData();
  } catch (err) {
    alert("خطا:\n" + err.message);
  } finally {
    saveExpenseButton.disabled = false;
    setExpenseType(expenseType.value);
  }
}

function buildNewBody(type) {
  const idx = MONTHS.findIndex(m => m.key === expenseStartMonth.value);
  const body = { type: type, title: expenseTitle.value.trim(), note: expenseNote.value.trim() || null };
  if (type === "installment") {
    body.amount = Number(expenseAmount.value);
    body.due_day = expenseDueDay.value.trim() === "" ? null : Number(expenseDueDay.value);
    body.installment_count = expenseInstallments.value.trim() === "" ? null : Number(expenseInstallments.value);
    MONTHS.forEach((m, i) => body[m.key] = i < idx ? "CLOSE" : null);
  } else if (type === "expense" || type === "income") {
    body.amount = null;
    body.due_day = null;
    body.installment_count = null;
    MONTHS.forEach((m, i) => body[m.key] = i < idx ? "CLOSE" : i === idx ? Number(expenseAmount.value) : null);
  }
  return body;
}

async function forceLoadData() {
  if (refreshButton) {
    refreshButton.disabled = true;
  }
  statusBox.textContent = "📥 در حال دریافت داده‌ها از سرور…";
  allStatus.textContent = "📥 در حال دریافت داده‌ها از سرور…";
  try {
    const data = await supabaseRequest(`${TABLE_NAME}?select=*&order=id.asc`);
    allExpenses = Array.isArray(data) ? data : [];
    try {
      localStorage.setItem('cachedExpenses', JSON.stringify(allExpenses));
      localStorage.setItem('cachedExpensesDate', new Date().toISOString());
    } catch (cacheErr) {
      console.warn('خطا در ذخیره کش:', cacheErr);
    }
    loadIncomeOptions();
    visibleCount = PAGE_SIZE;
    renderDueCards();
    renderAllCards();
    renderReports();
    renderHome();
    statusBox.textContent = `✅ ${allExpenses.length.toLocaleString("fa-IR")} مورد از سرور دریافت شد`;
    allStatus.textContent = `✅ ${allExpenses.length.toLocaleString("fa-IR")} مورد از سرور دریافت شد`;
    showToast(`✅ ${allExpenses.length} مورد از سرور دریافت شد`, 'success');
  } catch (e) {
    console.error('❌ خطا در forceLoadData:', e);
    statusBox.textContent = `❌ خطا در دریافت از سرور: ${e.message}`;
    allStatus.textContent = `❌ خطا در دریافت از سرور: ${e.message}`;
    throw e;
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
    }
  }
}

function buildEditBody(type) {
  const body = { title: expenseTitle.value.trim(), note: expenseNote.value.trim() || null };
  if (type === "installment") {
    body.amount = Number(expenseAmount.value);
    body.due_day = Number(expenseDueDay.value);
    body.installment_count = Number(expenseInstallments.value);
  } else {
    body.amount = null;
    body.due_day = null;
    body.installment_count = null;
  }
  monthFields.querySelectorAll("[data-month]").forEach(input => {
    body[input.dataset.month] = input.value.trim() === "" ? null : input.value.trim();
  });
  return body;
}

function getReportItems(kind) {
  const installments = allExpenses.filter(isInstallment),
    expenses = allExpenses.filter(isExpense),
    incomes = allExpenses.filter(isIncome);
  if (kind === "month") return installments.filter(i => !isClosedValue(i[currentMonthKey]));
  if (kind === "paid") return installments.filter(i => isPaidValue(i[currentMonthKey]));
  if (kind === "remaining") return installments.filter(i => isNullValue(i[currentMonthKey]));
  if (kind === "expenses") return expenses.filter(i => parseMoney(i[currentMonthKey]) !== null);
  if (kind === "income") return incomes.filter(i => parseMoney(i[currentMonthKey]) !== null);
  if (kind === "all") return [...installments.filter(i => isPaidValue(i[currentMonthKey])), ...expenses.filter(i => isPaidValue(i[currentMonthKey]))];
  return [];
}

function renderHome() {
  const today = getCurrentPersianDay();
  const overdue = allExpenses.filter(i => isInstallment(i) && isNullValue(i[currentMonthKey]) && Number(i.due_day) < today).length;
  const soon = getDueItems().length;
  let paid = 0,
    expense = 0;
  allExpenses.forEach(i => {
    if (isInstallment(i) && isPaidValue(i[currentMonthKey])) {
      paid += Number(i.amount) || 0;
    }
    if (isExpense(i)) {
      const value = parseMoney(i[currentMonthKey]);
      if (value !== null) {
        expense += value;
      }
    }
  });
  $("homeOverdue").textContent = overdue.toLocaleString("fa-IR");
  $("homeSoon").textContent = soon.toLocaleString("fa-IR");
  $("homePaid").textContent = formatMoney(paid);
  $("homeExpense").textContent = formatMoney(expense);
}

function openReportDetails(kind) {
  const titles = { month: "اقساط این ماه", paid: "اقساط پرداخت‌شده", remaining: "اقساط باقی‌مانده", expenses: "هزینه‌های این ماه", income: "درآمدهای این ماه", all: "جمع کل پرداختی" };
  const items = getReportItems(kind);
  reportDetailsTitle.textContent = titles[kind] || "جزئیات گزارش";
  reportDetailsList.innerHTML = "";
  if (!items.length) { reportDetailsList.innerHTML = '<div class="empty">موردی وجود ندارد</div>'; }
  items.forEach(item => {
    const expense = isExpense(item),
      income = isIncome(item),
      paid = isPaidValue(item[currentMonthKey]),
      row = document.createElement("article");
    row.className = "report-detail-item";
    let detail = "";
    if (expense || income) detail = `<span>${formatMoney(parseMoney(item[currentMonthKey]) || 0)}</span><span>${income ? "دریافت شده" : "پرداخت شده"}</span>`;
    else if (paid) detail = `<span>${formatMoney(item.amount)}</span><span>تاریخ پرداخت: ${escapeHtml(extractPaymentDate(item[currentMonthKey]))}</span>`;
    else detail = `<span>${formatMoney(item.amount)}</span><span>سررسید: روز ${Number(item.due_day || 0).toLocaleString("fa-IR")}ام</span>`;
    row.innerHTML = `<div class="report-detail-title">${escapeHtml(item.title)}</div><div class="report-detail-meta">${detail}</div>`;
    reportDetailsList.appendChild(row);
  });
  reportDetailsModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReportModal() { reportDetailsModal.classList.remove("open"); document.body.style.overflow = ""; }

// =========================================================
// ================= گزارش سرمایه =================
// =========================================================

function renderCapitalReportList() {
  const container = document.getElementById("capitalReportList");
  if (!container) return;
  
  if (!allCapitalTransactions || allCapitalTransactions.length === 0) {
    container.innerHTML = '<div class="empty" style="padding:20px;text-align:center;color:var(--muted);">هیچ تراکنش سرمایه‌ای ثبت نشده</div>';
    return;
  }
  
  // گروه‌بندی بر اساس دارایی
  const grouped = {};
  allCapitalTransactions.forEach(t => {
    const key = t.asset_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  
  let html = '<div style="display:grid;gap:10px;">';
  
  Object.keys(grouped).forEach(assetId => {
    const asset = getAssetById(assetId);
    const transactions = grouped[assetId];
    const totalBuy = transactions.filter(t => t.type === 'buy').reduce((sum, t) => sum + getNumeric(t.total_price), 0);
    const totalSell = transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + getNumeric(t.total_price), 0);
    const net = totalBuy - totalSell;
    
    html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:14px;">${asset ? escapeHtml(asset.name) : 'دارایی حذف شده'}</span>
          <span style="font-size:13px;color:${net >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatMoney(net)}</span>
        </div>
        <div style="display:flex;gap:12px;margin-top:6px;font-size:11px;color:var(--muted);">
          <span>خرید: ${transactions.filter(t => t.type === 'buy').length} مورد</span>
          <span>فروش: ${transactions.filter(t => t.type === 'sell').length} مورد</span>
          <span>${transactions.length} تراکنش</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function renderReports() {
  const installments = allExpenses.filter(isInstallment);
  const expenses = allExpenses.filter(isExpense);
  const incomes = allExpenses.filter(isIncome);
  const totals = installments.reduce((acc, item) => {
    const currentValue = item[currentMonthKey];
    const amount = Number(item.amount || 0);
    if (!isClosedValue(currentValue)) {
      acc.monthInstallmentTotal += amount;
      if (isPaidValue(currentValue)) acc.paidInstallmentTotal += amount;
      if (isNullValue(currentValue)) acc.remainingInstallmentTotal += amount;
    }
    return acc;
  }, { monthInstallmentTotal: 0, paidInstallmentTotal: 0, remainingInstallmentTotal: 0 });
  const monthExpenseTotal = expenses.reduce((sum, item) => {
    const amount = parseMoney(item[currentMonthKey]);
    return amount !== null ? sum + amount : sum;
  }, 0);
  const monthIncomeTotal = incomes.reduce((sum, item) => {
    const amount = parseMoney(item[currentMonthKey]);
    return amount !== null ? sum + amount : sum;
  }, 0);
  const allPaidTotal = totals.paidInstallmentTotal + monthExpenseTotal;
  const balanceTotal = monthIncomeTotal - allPaidTotal;
  reportMonthTotal.textContent = formatMoney(totals.monthInstallmentTotal);
  reportPaidTotal.textContent = formatMoney(totals.paidInstallmentTotal);
  reportRemainingTotal.textContent = formatMoney(totals.remainingInstallmentTotal);
  reportExpensesTotal.textContent = formatMoney(monthExpenseTotal);
  reportAllTotal.textContent = formatMoney(allPaidTotal);
  if (reportIncomeTotal) reportIncomeTotal.textContent = formatMoney(monthIncomeTotal);
  if (reportBalanceTotal) {
    reportBalanceTotal.textContent = (balanceTotal < 0 ? "− " : "") + formatMoney(Math.abs(balanceTotal));
    reportBalanceTotal.style.color = balanceTotal < 0 ? "var(--danger)" : "var(--success)";
  }
  const chartTotal = totals.paidInstallmentTotal + totals.remainingInstallmentTotal;
  const paidPercentage = chartTotal ? Math.round(totals.paidInstallmentTotal / chartTotal * 100) : 0;
  const remainingPercentage = chartTotal ? Math.round(totals.remainingInstallmentTotal / chartTotal * 100) : 0;
  if (paidPercent) paidPercent.textContent = `${paidPercentage.toLocaleString("fa-IR")}٪`;
  if (remainingPercent) remainingPercent.textContent = `${remainingPercentage.toLocaleString("fa-IR")}٪`;
  if (paidBar) paidBar.style.width = `${paidPercentage}%`;
  if (remainingBar) remainingBar.style.width = `${remainingPercentage}%`;
  const incomeChartTotal = monthIncomeTotal + totals.paidInstallmentTotal + monthExpenseTotal + totals.remainingInstallmentTotal;
  const incomePercentage = incomeChartTotal ? Math.round((monthIncomeTotal / incomeChartTotal) * 100) : 0;
  const paidInstallmentPercentage = incomeChartTotal ? Math.round((totals.paidInstallmentTotal / incomeChartTotal) * 100) : 0;
  const expensePercentage = incomeChartTotal ? Math.round((monthExpenseTotal / incomeChartTotal) * 100) : 0;
  const unpaidInstallmentPercentage = Math.max(0, 100 - incomePercentage - paidInstallmentPercentage - expensePercentage);
  if (incomePercent) incomePercent.textContent = `${incomePercentage.toLocaleString("fa-IR")}٪`;
  if ($("paidInstallmentPercent")) $("paidInstallmentPercent").textContent = `${paidInstallmentPercentage.toLocaleString("fa-IR")}٪`;
  if ($("expensePercent")) $("expensePercent").textContent = `${expensePercentage.toLocaleString("fa-IR")}٪`;
  if ($("unpaidInstallmentPercent")) $("unpaidInstallmentPercent").textContent = `${unpaidInstallmentPercentage.toLocaleString("fa-IR")}٪`;
  if (incomeBar) incomeBar.style.width = `${incomePercentage}%`;
  if ($("paidInstallmentBar")) $("paidInstallmentBar").style.width = `${paidInstallmentPercentage}%`;
  if ($("expenseBar")) $("expenseBar").style.width = `${expensePercentage}%`;
  if ($("unpaidInstallmentBar")) $("unpaidInstallmentBar").style.width = `${unpaidInstallmentPercentage}%`;
  
  // گزارش سرمایه
  renderCapitalReportList();
}

async function loadDebts() {
  try {
    const data = await supabaseRequest(`${DEBT_TABLE}?select=*&order=due_year.asc`);
    allDebts = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("خطا در دریافت قرض و دیون", e);
    allDebts = [];
  }
  renderDebtsPanel();
}

function renderDebtsPanel() {
  const container = $("debtsPanel");
  if (!container) return;
  if (!allDebts.length) {
    container.innerHTML = '<div class="empty">قرض یا دینی ثبت نشده</div>';
    return;
  }
  const sorted = [...allDebts].sort((a, b) => {
    const am = MONTHS.findIndex(m => m.key === a.due_month);
    const bm = MONTHS.findIndex(m => m.key === b.due_month);
    return (Number(a.due_year) - Number(b.due_year)) || (am - bm) || (Number(a.due_day) - Number(b.due_day));
  });
  container.innerHTML = "";
  sorted.forEach(d => {
    const monthName = MONTHS.find(m => m.key === d.due_month)?.name || "";
    const row = document.createElement("article");
    row.className = `debt-row ${d.direction === "lent" ? "debt-lent" : "debt-borrowed"}`;
    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");
    // اصلاح: حذف جداکننده سه رقمی از تاریخ
    row.innerHTML = `
      <div class="debt-card-summary">
        <div class="debt-card-top">
          <div class="debt-title">${escapeHtml(d.counterparty || "بدون نام")}</div>
          <div class="debt-amount">${formatMoney(d.amount)}</div>
        </div>
        <div class="debt-card-bottom">
          سررسید: ${d.due_day || 0} ${monthName} ${d.due_year || 0}
        </div>
      </div>
    `;
    row.addEventListener("click", () => openDebtDetailsModal(d));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDebtDetailsModal(d);
      }
    });
    container.appendChild(row);
  });
}

let activeDebtDetails = null;

function createCard(item, options = {}) {
  const { type = 'default', showActions = true } = options;
  const card = document.createElement("article");
  const isExpenseItem = isExpense(item);
  const isIncomeItem = isIncome(item);
  const v = item[currentMonthKey];
  let cardClass = "card compact-card";
  if (isExpenseItem) cardClass += " expense-card";
  else if (isIncomeItem) cardClass += " income-card";
  else if (isPaidValue(v)) cardClass += " paid-card";
  card.className = cardClass;
  let html = `
    <div class="card-main compact-main">
      <div class="compact-head">
        <div class="compact-amount-wrap">
          <div class="amount compact-amount ${isIncomeItem ? 'income-amount' : ''}">
            ${isIncomeItem ? '+ ' : ''}${formatMoney(getLatestExpenseAmount(item))}
          </div>
        </div>
        <div class="compact-side">
          ${isIncomeItem ? getPaidCount(item).toLocaleString("fa-IR") + ' دریافت' :
            isExpenseItem ? getPaidCount(item).toLocaleString("fa-IR") + ' پرداخت' :
            getRemainingInstallments(item).toLocaleString("fa-IR") + ' قسط باقی‌مانده'}
        </div>
        <div class="id-badge">ID ${Number(item.id).toLocaleString("fa-IR")}</div>
      </div>
      <div class="compact-foot">
        <div class="compact-title">${escapeHtml(item.title)}</div>
        <div class="badge-row">
          <span class="${isExpenseItem ? 'expense-badge' : isIncomeItem ? 'income-badge' : 'installment-badge'}">
            ${isExpenseItem ? '🧾 هزینه' : isIncomeItem ? '💰 درآمد' : '💳 قسط'}
          </span>
          <span class="status-badge">
            ${isIncomeItem ? (isPaidValue(v) ? 'دریافت‌شده' : 'دریافت‌نشده') : currentStatus(item)}
          </span>
        </div>
      </div>
      ${showActions ? `
        <div class="all-card-actions">
          <button type="button" class="edit-expense">ویرایش</button>
        </div>
      ` : ''}
    </div>
  `;
  card.innerHTML = html;
  if (showActions) {
    card.querySelector(".edit-expense").addEventListener("click", e => {
      e.stopPropagation();
      openEditModal(item);
    });
  }
  return card;
}

function openDebtDetailsModal(d) {
  activeDebtDetails = d;
  const modal = $("debtDetailsModal");
  const body = $("debtDetailsBody");
  const title = $("debtDetailsTitle");
  const editBtn = $("editDebtDetailsBtn") || $("debtDetailsEditBtn");
  const deleteBtn = $("deleteDebtDetailsBtn") || $("debtDetailsDeleteBtn");
  if (!modal) { console.error("debtDetailsModal پیدا نشد"); return; }
  if (!body) { console.error("debtDetailsBody پیدا نشد"); return; }
  if (title) { title.textContent = d.counterparty || "جزئیات قرض / دین"; }
  const monthName = MONTHS.find(m => m.key === d.due_month)?.name || "";
  const directionText = d.direction === "lent" ? "طلب از او" : "بدهی به او";
  // اصلاح: حذف جداکننده سه رقمی از تاریخ در جزئیات
  body.innerHTML = `
    <div class="debt-detail-list">
      <div class="debt-detail-item"><span>طرف حساب</span><strong>${escapeHtml(d.counterparty || "-")}</strong></div>
      <div class="debt-detail-item"><span>نوع</span><strong>${directionText}</strong></div>
      <div class="debt-detail-item"><span>مبلغ</span><strong>${formatMoney(d.amount)}</strong></div>
      <div class="debt-detail-item"><span>سررسید</span><strong>${d.due_day || 0} ${monthName} ${d.due_year || 0}</strong></div>
      <div class="debt-detail-item"><span>عنوان / توضیح</span><strong>${escapeHtml(d.note || "-")}</strong></div>
    </div>
  `;
  if (editBtn) {
    editBtn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeDebtDetailsModal();
      openEditDebtModal(d);
    };
  }
  if (deleteBtn) {
    deleteBtn.onclick = async event => {
      event.preventDefault();
      event.stopPropagation();
      await deleteDebt(d.id);
    };
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDebtDetailsModal() {
  const modal = $("debtDetailsModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
  activeDebtDetails = null;
}

async function deleteDebt(id) {
  if (id === null || id === undefined || id === "") {
    alert("شناسه قرض پیدا نشد.");
    return;
  }
  if (!confirm("این مورد حذف شود؟")) return;
  try {
    const result = await supabaseRequest(`${DEBT_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" }
    });
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error(`رکورد با شناسه ${id} حذف نشد.`);
    }
    closeDebtDetailsModal();
    await loadDebts();
  } catch (err) {
    console.error("Delete debt failed:", err);
    alert("خطا در حذف:\n" + err.message);
  }
}

function openEditDebtModal(d) {
  if (!d || !d.id) {
    alert("شناسه این مورد برای ویرایش پیدا نشد.");
    return;
  }
  resetExpenseForm();
  fillDebtDateSelects();
  editingDebtId = d.id;
  setExpenseType("debt");
  expenseTitle.value = d.note || "";
  expenseAmount.value = d.amount ?? "";
  $("debtCounterparty").value = d.counterparty || "";
  $("debtDueDay").value = d.due_day || "";
  $("debtDueMonth").value = d.due_month || currentMonthKey;
  $("debtDueYear").value = d.due_year || "";
  document.querySelectorAll(".debt-direction-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.direction === d.direction);
  });
  $("debtDirection").value = d.direction || "lent";
  expenseModalTitle.textContent = "ویرایش قرض/دین";
  saveExpenseButton.textContent = "ذخیره تغییرات";
  openModal();
}

function openPage(id, title) {
  pages.forEach(p => p.classList.remove("active"));
  const targetPage = document.getElementById(id);
  if (targetPage) targetPage.classList.add("active");
  navButtons.forEach(b => b.classList.remove("active"));
  const activeNav = document.querySelector(`.nav-button[data-page="${id}"]`);
  if (activeNav) activeNav.classList.add("active");
  pageTitle.textContent = title;
  if (id === "homePage") renderHome();
  if (id === "allPage") renderAllCards();
  if (id === "reportPage") renderReports();
  if (id === "banksPage") {
    setTimeout(function() {
      if (typeof renderBankCards === 'function') {
        renderBankCards();
      }
    }, 150);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll('.nav-button').forEach(btn => {
  btn.addEventListener('click', function() {
    const pageId = this.dataset.page;
    const titles = {
      duePage: '⏰ سررسیدها',
      homePage: '🏠 داشبورد',
      banksPage: '📋 بانک‌ها',
      allPage: '📋 همه اقساط',
      reportPage: '📊 گزارش‌ها'
    };
    openPage(pageId, titles[pageId] || pageId);
  });
});

searchInput.addEventListener("input", () => { visibleCount = PAGE_SIZE;
  renderAllCards(); });

function updateStatusFilterLabels(filter) {
  const paidBtn = $("statusFilterPaid"),
    unpaidBtn = $("statusFilterUnpaid");
  if (!paidBtn || !unpaidBtn) return;
  if (filter === "income") {
    paidBtn.textContent = "دریافت‌شده این ماه";
    unpaidBtn.textContent = "دریافت‌نشده این ماه";
  } else {
    paidBtn.textContent = "پرداخت‌شده این ماه";
    unpaidBtn.textContent = "پرداخت‌نشده این ماه";
  }
}

typeFilters.forEach(b => b.addEventListener("click", () => {
  typeFilters.forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  activeFilter = b.dataset.filter;
  updateStatusFilterLabels(activeFilter);
  visibleCount = PAGE_SIZE;
  renderAllCards();
}));

statusFilters.forEach(b => b.addEventListener("click", () => {
  statusFilters.forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  activeStatusFilter = b.dataset.status;
  visibleCount = PAGE_SIZE;
  renderAllCards();
}));

loadMoreButton.addEventListener("click", () => { visibleCount += PAGE_SIZE;
  renderAllCards(); });

document.querySelectorAll(".report-card[data-report]").forEach(c => c.addEventListener("click", () => openReportDetails(c.dataset.report)));
closeReportDetails.addEventListener("click", closeReportModal);
reportDetailsModal.querySelector(".modal-backdrop").addEventListener("click", closeReportModal);

const fabMenu = $("fabMenu");
addExpenseButton.addEventListener("click", () => {
  const isOpen = !fabMenu.classList.contains("hidden");
  if (isOpen) {
    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
    addExpenseButton.classList.remove("active");
  } else {
    fabMenu.classList.remove("hidden");
    fabMenu.classList.remove("animating");
    void fabMenu.offsetWidth;
    fabMenu.classList.add("animating");
    addExpenseButton.classList.add("open");
    addExpenseButton.classList.add("active");
  }
});

function openModal() {
  expenseModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function loadIncomeOptions() {
  fillPaymentItems($("paymentType")?.value || "payment");
}

function openWithType(type) {
  fabMenu.classList.add("hidden");
  addExpenseButton.classList.remove("open");
  addExpenseButton.classList.remove("active");
  resetExpenseForm();
  setExpenseType(type);
  openModal();
}

$("closeDebtDetailsModal")?.addEventListener("click", closeDebtDetailsModal);
$("debtDetailsModal")?.querySelector(".modal-backdrop")?.addEventListener("click", closeDebtDetailsModal);

document.addEventListener("click", e => {
  if (!$("fabContainer").contains(e.target)) {
    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
    addExpenseButton.classList.remove("active");
  }
});

installmentTypeButton.addEventListener("click", () => setExpenseType("installment"));
setupTransferButtons();
$("debtTypeButton")?.addEventListener("click", () => setExpenseType("debt"));
$("assetTypeButton")?.addEventListener("click", () => setExpenseType("asset"));
setupButtonGroup(document, ".debt-direction-btn", btn => {
  $("debtDirection").value = btn.dataset.direction;
});
expenseTypeButton.addEventListener("click", () => setExpenseType("expense"));

if (transferTypeButton) {
  transferTypeButton.addEventListener("click", () => setExpenseType("transfer"));
}
if (incomeTypeButton) {
  incomeTypeButton.addEventListener("click", () => setExpenseType("income"));
  document.querySelectorAll(".income-bank").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".income-bank").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedIncomeBank = btn.dataset.bank;
    });
  });
}

document.querySelectorAll(".transfer-from").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".transfer-from").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $("transferFromModal").value = btn.dataset.bank;
  });
});

document.querySelectorAll(".transfer-to").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".transfer-to").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $("transferToModal").value = btn.dataset.bank;
  });
});

expenseForm.addEventListener("submit", saveExpense);
updatePersianDate();
expenseStartMonth.value = currentMonthKey;
setExpenseType("installment");

$("transferForm").addEventListener("submit", async e => {
  e.preventDefault();
  const from = $("transferFromModal").value;
  const to = $("transferToModal").value;
  const amount = Number($("transferAmount").value);
  if (!from || !to) { alert("حساب مبدا و مقصد را انتخاب کنید"); return; }
  if (from === to) { alert("مبدا و مقصد یکسان است"); return; }
  await addTransaction({
    expense_id: null,
    title: "انتقال وجه",
    amount: amount,
    type: "transfer",
    account: null,
    from_account: from,
    to_account: to,
    transaction_date: new Date().toISOString(),
    note: $("transferNote").value || null
  });
  transferModal.classList.remove("open");
  document.body.style.overflow = "";
  alert("انتقال ثبت شد");
});

// اصلاح: صفحه اصلی بر اساس وجود قسط سررسید
loadData().then(() => {
  const dueItems = getDueItems();
  if (dueItems.length > 0) {
    openPage("duePage", "⏰ سررسید اقساط");
  } else {
    openPage("homePage", "🏠 داشبورد");
  }
  loadDebts();
  loadAssets();
  loadCapitalTransactions();
  loadGoldPrice();
  setTimeout(updateDashboardAssets, 500);
});

function addSwipeToClose(modalId) {
  const modal = document.getElementById(modalId);
  const handle = modal?.querySelector(".modal-handle");
  if (!handle) return;
  let startY = 0;
  handle.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  handle.addEventListener("touchend", e => {
    if (e.changedTouches[0].clientY - startY > 80) {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
  }, { passive: true });
}

["expenseModal", "transferModal", "paymentModal", "settingsLockModal"].forEach(addSwipeToClose);

// =========================================================
// ثبت Service Worker با مدیریت خطا - نسخه ایمن
// =========================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // با تأخیر و با try/catch
    setTimeout(() => {
      try {
        navigator.serviceWorker.register("./sw.js")
          .then((reg) => {
            swRegistration = reg;
            console.log("✅ Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.warn("⚠️ Service Worker registration failed:", err);
            // خطا را نادیده بگیر
          });
      } catch (e) {
        console.warn("⚠️ Service Worker error:", e);
      }
    }, 2000);
  });
}

async function fetchGithubVersion() {
  try {
    const res = await fetch("https://api.github.com/repos/ahooraboy43/vamremember/commits/main", {
      cache: "no-store"
    });
    if (!res.ok) {
      console.warn('❌ خطا در دریافت نسخه:', res.status);
      return null;
    }
    const data = await res.json();
    const commitDate = data?.commit?.committer?.date || null;
    const commitSha = data?.sha || null;
    console.log('📌 آخرین نسخه:', { commitDate, commitSha });
    return commitDate;
  } catch (e) {
    console.error("❌ خطا در دریافت نسخه گیت‌هاب:", e);
    return null;
  }
}

function updateAppVersionText(text) {
  currentAppVersionText = text;
  const el = $("appVersionText");
  if (el) el.textContent = text;
}

async function performFullAppUpdate() {
  const menuBtn = document.getElementById("hamburgerMenuBtn");
  if (menuBtn) {
    menuBtn.disabled = true;
    menuBtn.textContent = "↻";
  }
  showToast("🔄 در حال بررسی بروزرسانی…", "info");
  try {
    showToast("📡 در حال بررسی نسخه جدید...", "info");
    const versionDate = await fetchGithubVersion();
    if (!versionDate) {
      showToast("❌ خطا در دریافت نسخه جدید", "error");
      return;
    }
    const faDate = new Date(versionDate).toLocaleString("fa-IR");
    const lastVersion = localStorage.getItem('lastAppVersion');
    if (lastVersion === versionDate) {
      showToast("📥 در حال بروزرسانی داده‌ها از سرور...", "info");
      await forceLoadData();
      showToast(`✅ داده‌ها بروزرسانی شدند (نسخه ${faDate})`, 'success');
      updateAppVersionText(`✅ نسخه ${faDate} (داده‌ها بروزرسانی شد)`);
      return;
    }
    showToast("📥 در حال دریافت داده‌های جدید…", "info");
    await forceLoadData();
    if (swRegistration) {
      showToast("🔄 در حال به‌روزرسانی سرویس‌دهنده…", "info");
      await swRegistration.update();
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 3000);
        swRegistration.addEventListener('updatefound', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    localStorage.setItem('lastAppUpdate', new Date().toISOString());
    localStorage.setItem('lastAppVersion', versionDate);
    updateAppVersionText(`✅ نسخه جدید ${faDate} دریافت شد`);
    showToast(`✅ نسخه جدید ${faDate} با موفقیت دریافت شد!`, 'success');
    showToast("🔄 در حال بارگذاری مجدد برنامه…", "info");
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e) {
    console.error('❌ خطا در بروزرسانی:', e);
    showToast(`❌ خطا: ${e.message}`, "error");
  } finally {
    if (menuBtn) {
      menuBtn.disabled = false;
      menuBtn.textContent = "☰";
    }
  }
}

// ================= تنظیمات =================
const SETTINGS_KEY = "appSettingsV1";

function loadSettings() { return DataManager.getSettings(); }

function saveSettings(settings) { return DataManager.saveSettings(settings); }

let appSettings = loadSettings();

function simpleHash(str) {
  let hash = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return String(hash);
}

function toPersianDigits(str) { return String(str).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]); }

function applyTheme(theme) {
  const finalTheme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", finalTheme);
  document.querySelectorAll(".theme-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.theme === finalTheme);
  });
}

function applyAppIcon(dataUrl) {
  if (!dataUrl) return;
  let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!touchIcon) {
    touchIcon = document.createElement("link");
    touchIcon.rel = "apple-touch-icon";
    document.head.appendChild(touchIcon);
  }
  touchIcon.href = dataUrl;
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = dataUrl;
  fetch("./manifest.json").then(r => r.json()).then(manifest => {
    const updated = { ...manifest, icons: [{ src: dataUrl, sizes: "192x192", type: "image/png" }, { src: dataUrl, sizes: "512x512", type: "image/png" }] };
    const blob = new Blob([JSON.stringify(updated)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.href = url;
  }).catch(() => {});
  const preview = $("appIconPreview");
  if (preview) preview.src = dataUrl;
}

function resetAppIcon() {
  delete appSettings.icon;
  saveSettings(appSettings);
  const preview = $("appIconPreview");
  if (preview) preview.src = "assets/book.png";
  const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (touchIcon) touchIcon.remove();
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.remove();
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) manifestLink.href = "./manifest.json";
}

function initSettingsUI() {
  applyTheme(appSettings.theme || "dark");
  if (appSettings.icon) { applyAppIcon(appSettings.icon); }
  const lockToggle = $("settingsLockEnabled");
  if (lockToggle) lockToggle.checked = !!appSettings.lockEnabled;
  const versionEl = $("appVersionText");
  if (versionEl) versionEl.textContent = currentAppVersionText;
}

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    appSettings.theme = btn.dataset.theme;
    saveSettings(appSettings);
    applyTheme(appSettings.theme);
  });
});

const settingsLockModal = $("settingsLockModal");
const settingsLockForm = $("settingsLockForm");
const settingsLockInput = $("settingsLockInput");
const closeSettingsLockModal = $("closeSettingsLockModal");

function openSettingsPage() { openPage("settingsPage", "⚙️ تنظیمات"); }

function openSettingsLockModal() {
  if (!settingsLockModal) return;
  settingsLockModal.classList.add("open");
  document.body.style.overflow = "hidden";
  if (settingsLockInput) {
    settingsLockInput.value = "";
    setTimeout(() => settingsLockInput.focus(), 100);
  }
}

function closeSettingsLockModalFn() {
  if (!settingsLockModal) return;
  settingsLockModal.classList.remove("open");
  document.body.style.overflow = "";
}

if (settingsLockForm) {
  settingsLockForm.addEventListener("submit", e => {
    e.preventDefault();
    const val = settingsLockInput ? settingsLockInput.value : "";
    if (simpleHash(val) === appSettings.passwordHash) {
      closeSettingsLockModalFn();
      openSettingsPage();
    } else {
      alert("رمز عبور اشتباه است");
    }
  });
}

if (closeSettingsLockModal) {
  closeSettingsLockModal.addEventListener("click", closeSettingsLockModalFn);
}
if (settingsLockModal) {
  settingsLockModal.querySelector(".modal-backdrop")?.addEventListener("click", closeSettingsLockModalFn);
}

const saveSettingsPasswordButton = $("saveSettingsPasswordButton");
if (saveSettingsPasswordButton) {
  saveSettingsPasswordButton.addEventListener("click", () => {
    const input = $("newSettingsPassword");
    const val = input ? input.value : "";
    if (!val) { alert("رمز عبور را وارد کنید"); return; }
    appSettings.passwordHash = simpleHash(val);
    saveSettings(appSettings);
    if (input) input.value = "";
    alert("رمز عبور ذخیره شد");
  });
}

const settingsLockEnabledInput = $("settingsLockEnabled");
if (settingsLockEnabledInput) {
  settingsLockEnabledInput.addEventListener("change", () => {
    if (settingsLockEnabledInput.checked && !appSettings.passwordHash) {
      alert("ابتدا یک رمز عبور تنظیم و ذخیره کنید");
      settingsLockEnabledInput.checked = false;
      return;
    }
    appSettings.lockEnabled = settingsLockEnabledInput.checked;
    saveSettings(appSettings);
  });
}

const appIconInput = $("appIconInput");
if (appIconInput) {
  appIconInput.addEventListener("change", () => {
    const file = appIconInput.files && appIconInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      appSettings.icon = reader.result;
      saveSettings(appSettings);
      applyAppIcon(appSettings.icon);
    };
    reader.readAsDataURL(file);
  });
}

const resetAppIconButton = $("resetAppIconButton");
if (resetAppIconButton) {
  resetAppIconButton.addEventListener("click", resetAppIcon);
}

updateStatusFilterLabels(activeFilter);

// ================= قفل اپلیکیشن =================
const APP_LOCK_SESSION_KEY = "appUnlockedV1";

function ensureDefaultAppLock() {
  if (appSettings.appLockEnabled === undefined) {
    appSettings.appLockEnabled = true;
    appSettings.appLockPasswordHash = simpleHash("83242433");
    saveSettings(appSettings);
  }
}

function isAppLocked() {
  return !!(appSettings.appLockEnabled && appSettings.appLockPasswordHash && !sessionStorage.getItem(APP_LOCK_SESSION_KEY));
}

function showAppLockScreen() {
  const el = $("appLockScreen");
  if (el) el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const input = $("appLockInput");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 150);
  }
}

function hideAppLockScreen() {
  const el = $("appLockScreen");
  if (el) el.classList.add("hidden");
  document.body.style.overflow = "";
}

function initAppLock() {
  ensureDefaultAppLock();
  const toggle = $("appLockEnabledToggle");
  if (toggle) toggle.checked = !!appSettings.appLockEnabled;
  if (isAppLocked()) {
    showAppLockScreen();
  } else {
    hideAppLockScreen();
  }
}

const appLockForm = $("appLockForm");
if (appLockForm) {
  appLockForm.addEventListener("submit", e => {
    e.preventDefault();
    const input = $("appLockInput");
    const val = input ? input.value : "";
    const errEl = $("appLockError");
    if (simpleHash(val) === appSettings.appLockPasswordHash) {
      sessionStorage.setItem(APP_LOCK_SESSION_KEY, "1");
      if (errEl) errEl.classList.add("hidden");
      hideAppLockScreen();
    } else {
      if (errEl) errEl.classList.remove("hidden");
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  });
}

const appLockEnabledToggle = $("appLockEnabledToggle");
if (appLockEnabledToggle) {
  appLockEnabledToggle.addEventListener("change", () => {
    if (appLockEnabledToggle.checked && !appSettings.appLockPasswordHash) {
      appSettings.appLockPasswordHash = simpleHash("83242433");
    }
    appSettings.appLockEnabled = appLockEnabledToggle.checked;
    saveSettings(appSettings);
  });
}

const saveAppLockPasswordButton = $("saveAppLockPasswordButton");
if (saveAppLockPasswordButton) {
  saveAppLockPasswordButton.addEventListener("click", () => {
    const input = $("newAppLockPassword");
    const val = input ? input.value : "";
    if (!val) { alert("رمز عبور را وارد کنید"); return; }
    appSettings.appLockPasswordHash = simpleHash(val);
    saveSettings(appSettings);
    if (input) input.value = "";
    alert("رمز عبور اپلیکیشن ذخیره شد");
  });
}

// =========================================================
// ================= کمکی‌ها =================
// =========================================================
function formatCardNumber(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

function maskCardNumber(cardNumber) {
  const digits = (cardNumber || '').replace(/\D/g, '');
  if (!digits) return '••••-••••-••••-••••';
  const last4 = digits.slice(-4).padStart(4, '•');
  return `••••-••••-••••-${last4}`;
}

// =========================================================
// ================= کارت‌های بانکی =================
// =========================================================
const BANK_CARDS_KEY = "bankCardsV1";
let bankCards = [];
let currentCardIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

function loadBankCards() {
  try {
    const saved = DataManager.getBankCards();
    // اطمینان از اینکه array هست و فیلتر کردن کارت‌های خالی
    bankCards = Array.isArray(saved) ? saved.filter(c => c && c.bankName) : [];
    console.log('✅ کارت‌های بانکی بارگذاری شدند:', bankCards.length);
    renderBankCards();
    return bankCards;
  } catch (e) {
    console.error('❌ خطا در بارگذاری کارت‌ها:', e);
    bankCards = [];
    renderBankCards();
    return [];
  }
}

function saveBankCards() {
  try {
    // فیلتر کردن کارت‌های خالی و نامعتبر
    const validCards = bankCards.filter(c => c && c.bankName && c.bankName.trim() !== '');
    bankCards = validCards;
    
    const result = DataManager.saveBankCards(validCards);
    console.log('💾 کارت‌ها ذخیره شدند:', validCards.length);
    renderBankCards();
    return result;
  } catch (e) {
    console.error('❌ خطا در ذخیره کارت‌ها:', e);
    showToast('❌ خطا در ذخیره کارت‌ها', 'error');
    return false;
  }
}

function renderBankCards() {
  const container = document.getElementById("bankCarousel");
  const dotsContainer = document.getElementById("carouselDots");
  const banksListContainer = document.getElementById("banksManagementList");
  if (!container) return;
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";
  container.style.webkitOverflowScrolling = "touch";
  container.style.scrollSnapType = "x mandatory";
  container.style.display = "flex";
  container.style.gap = "16px";
  container.style.padding = "10px calc(50% - 140px)";
  container.style.scrollbarWidth = "none";
  container.style.cursor = "grab";
  container.style.touchAction = "pan-x";
  container.style.position = "relative";
  container.style.zIndex = "1";

  if (banksListContainer) {
    const banks = loadBanksFromStorage();
    banksListContainer.innerHTML = banks.map((b, i) => {
      const hasCard = bankCards.some(c => c.bankName === b);
      return `
        <div class="bank-manage-item" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
          <span>🏦 ${b}</span>
          <div style="display:flex;gap:6px;">
            <button class="btn-sm" onclick="editBankName(${i})"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
            <button class="btn-sm btn-danger" onclick="deleteBankName(${i})"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
            <button class="btn-sm btn-primary" onclick="addCardToBank('${b}')">${hasCard ? '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#75FBFD"><path d="M880-720v480q0 33-23.5 56.5T800-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720Zm-720 80h640v-80H160v80Zm0 160v240h640v-240H160Zm0 240v-480 480Z"/></svg>' : '➕'}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  if (bankCards.length === 0) {
    container.innerHTML = `
      <div class="empty-bank-state">
        <div class="empty-icon">💳</div>
        <p>هیچ کارت بانکی ثبت نشده است</p>
        <button class="primary-button" id="emptyAddBankBtn" type="button">➕ افزودن کارت</button>
      </div>
    `;
    if (dotsContainer) dotsContainer.innerHTML = "";
    const emptyBtn = document.getElementById("emptyAddBankBtn");
    if (emptyBtn) emptyBtn.addEventListener("click", () => openBankCardModal());
    return;
  }

  if (currentCardIndex >= bankCards.length) currentCardIndex = 0;
  if (currentCardIndex < 0) currentCardIndex = 0;

  let cardsHtml = '';
  bankCards.forEach((card, i) => {
    const hasImage = !!card.image;
    const bgStyle = hasImage ? `background-image:url('${card.image}');background-size:cover;background-position:center;` : `background:${card.color || '#1a2332'};`;
    const fullNumber = formatCardNumber(card.cardNumber);
    const masked = maskCardNumber(card.cardNumber);
    const isCenter = i === currentCardIndex;
    cardsHtml += `
      <div class="bank-card-item ${isCenter ? 'is-center' : ''}" 
           data-index="${i}" 
           style="${bgStyle} flex: 0 0 280px; max-width: 280px; height: 180px; border-radius: 20px; scroll-snap-align: center; position: relative; box-shadow: 0 12px 30px rgba(0,0,0,0.3);">
        ${hasImage ? '<div class="bank-card-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.3);border-radius:20px;"></div>' : ''}
        <div class="bank-card-inner" style="position:relative;width:100%;height:100%;padding:12px 14px;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;justify-content:space-between;color:#fff;overflow:hidden;z-index:1;">
          <div class="bank-card-top" style="display:flex;justify-content:space-between;align-items:flex-start;">
            <span class="bank-card-chip" style="font-size:20px;">💳</span>
            <span class="bank-card-type" style="font-size:12px;font-weight:600;opacity:0.9;">${card.bankName || 'بانک'}</span>
          </div>
          <div class="bank-card-number" style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);padding:6px 10px;border-radius:8px;margin:3px 0;text-shadow:0 1px 3px rgba(0,0,0,0.4);">
            <span class="full-value" dir="ltr" style="font-size:14px;font-family:'Courier New',monospace;letter-spacing:1px;">${fullNumber || '••••-••••-••••-••••'}</span>
            <span class="masked-value" dir="ltr" style="font-size:14px;font-family:'Courier New',monospace;letter-spacing:1px;">${masked}</span>
            <button class="copy-btn" data-field="number" data-value="${card.cardNumber || ''}" type="button" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;color:#fff;padding:2px 6px;font-size:9px;cursor:pointer;">📋</button>
          </div>
          <div class="bank-card-bottom" style="display:flex;justify-content:space-between;align-items:center;font-size:10px;opacity:0.85;">
            <div class="bank-card-expiry" style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.15);padding:2px 6px;border-radius:6px;font-size:9px;">
              <span class="full-value" dir="ltr">${card.expiry || '••/••'}</span>
              <span class="masked-value" dir="ltr">••/••</span>
            </div>
            <div class="bank-card-cvv" style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.15);padding:2px 6px;border-radius:6px;font-size:9px;">
              <span class="full-value">${card.cvv || '•••'}</span>
              <span class="masked-value">•••</span>
            </div>
          </div>
          <div class="bank-card-iban" style="font-size:9px;opacity:0.75;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.15);padding:2px 8px;border-radius:6px;margin-top:2px;font-family:'Courier New',monospace;">
            <span class="full-value" dir="ltr">${card.iban || 'شبا ثبت نشده'}</span>
            <span class="masked-value" dir="ltr">••••-••••-••••-••••</span>
            <button class="copy-btn" data-field="iban" data-value="${card.iban || ''}" type="button" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;color:#fff;padding:1px 5px;font-size:8px;cursor:pointer;">📋</button>
          </div>
          <button class="bank-card-edit-btn" data-id="${card.id || i}" type="button" style="position:absolute;top:6px;left:6px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:24px;height:24px;color:#fff;font-size:10px;cursor:pointer;backdrop-filter:blur(4px);z-index:2;display:flex;align-items:center;justify-content:center;">✎</button>
          <button class="bank-card-delete-btn" data-id="${card.id || i}" type="button" style="position:absolute;top:6px;left:36px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:26px;height:26px;color:#ff3b30;font-size:13px;cursor:pointer;backdrop-filter:blur(4px);z-index:2;display:flex;align-items:center;justify-content:center;transition:all 0.2s;">🗑</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = cardsHtml;

  container.querySelectorAll('.bank-card-item').forEach(card => {
    card.style.pointerEvents = 'auto';
  });

  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = btn.dataset.value;
      if (value) {
        navigator.clipboard?.writeText(value).then(() => {
          showToast('کپی شد!', 'success');
        }).catch(() => {
          const input = document.createElement('input');
          input.value = value;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          input.remove();
          showToast('کپی شد!', 'success');
        });
      }
    });
  });

  container.querySelectorAll('.bank-card-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = bankCards.find(c => c.id == id);
      if (card) openBankCardModal(card);
    });
  });

  container.querySelectorAll('.bank-card-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = bankCards.find(c => c.id == id);
      if (!card) return;
      if (!confirm(`حذف کارت "${card.bankName}"؟`)) return;
      bankCards = bankCards.filter(c => c.id != id);
      saveBankCards();
      showToast("کارت حذف شد", "info");
      renderBankCards();
    });
  });

  if (dotsContainer) {
    dotsContainer.innerHTML = bankCards.map((_, i) =>
      `<span class="dot ${i === currentCardIndex ? 'active' : ''}" data-index="${i}" style="width:8px;height:8px;border-radius:50%;background:${i === currentCardIndex ? 'var(--primary-light)' : 'var(--border-light)'};cursor:pointer;transition:all 0.3s;display:inline-block;margin:0 3px;"></span>`
    ).join('');
    dotsContainer.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        const card = container.querySelector(`.bank-card-item[data-index="${index}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    });
  }

  attachCarouselMotion(container);
  requestAnimationFrame(() => {
    const centerCard = container.querySelector(`.bank-card-item[data-index="${currentCardIndex}"]`);
    if (centerCard) {
      centerCard.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
  });
}

function attachCarouselMotion(container) {
  function updateCardTransforms() {
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    container.querySelectorAll('.bank-card-item').forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - centerX);
      const ratio = Math.min(distance / containerRect.width, 1);
      const scale = 1 - ratio * 0.18;
      const opacity = 1 - ratio * 0.55;
      card.style.transform = `scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
    });
  }

  if (!container.dataset.motionAttached) {
    container.dataset.motionAttached = "1";
    let ticking = false;
    container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateCardTransforms();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    let scrollEndTimer = null;
    container.addEventListener('scroll', () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.left + containerRect.width / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        const cards = container.querySelectorAll('.bank-card-item');
        cards.forEach((card, i) => {
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(cardCenter - centerX);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        });
        if (closestIndex !== currentCardIndex) {
          currentCardIndex = closestIndex;
          cards.forEach((card, i) => {
            card.classList.toggle('is-center', i === closestIndex);
          });
          document.querySelectorAll('#carouselDots .dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === closestIndex);
          });
        }
      }, 120);
    }, { passive: true });
  }

  let isDragging = false;
  let dragStartX = 0;
  let scrollStartLeft = 0;
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    container.style.cursor = 'grabbing';
    dragStartX = e.pageX;
    scrollStartLeft = container.scrollLeft;
    container.style.scrollSnapType = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.pageX - dragStartX;
    container.scrollLeft = scrollStartLeft - dx;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = 'grab';
    container.style.scrollSnapType = "x mandatory";
  });
  container.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = 'grab';
      container.style.scrollSnapType = "x mandatory";
    }
  });
  updateCardTransforms();
}

// =========================================================
// ================= پنل دیباگ =================
// =========================================================

function openAdminPanel() {
  const pass = prompt("رمز عبور مدیریت:");
  if (pass !== "1234") {
    if (pass !== null) alert("رمز اشتباه است");
    return;
  }
  const oldPanel = document.getElementById('admin-panel');
  if (oldPanel) oldPanel.remove();
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div class="admin-overlay">
      <div class="admin-glass">
        <div class="admin-header">
          <h3>🛠 پنل دیباگ</h3>
          <button onclick="closeAdminPanel()" class="admin-close-btn">✕</button>
        </div>
        <div class="admin-tabs">
          <button class="admin-tab active" data-tab="banks">🏦 بانک‌ها</button>
          <button class="admin-tab" data-tab="debts">🤝 قرض‌ها</button>
          <button class="admin-tab" data-tab="expenses">💳 هزینه‌ها</button>
          <button class="admin-tab" data-tab="settings">⚙️ تنظیمات</button>
          <button class="admin-tab" data-tab="storage">💾 دیتابیس</button>
        </div>
        <div class="admin-body" id="adminBody">
          <div style="color:#94a3b8;text-align:center;padding:40px 0;">در حال بارگذاری...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      panel.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      renderAdminTab(this.dataset.tab);
    });
  });
  setTimeout(() => { renderAdminTab('banks'); }, 50);
}

function closeAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (panel) panel.remove();
}

function renderAdminTab(tab) {
  const body = document.getElementById('adminBody');
  if (!body) { console.error('adminBody پیدا نشد'); return; }
  try {
    switch (tab) {
      case 'banks':
        renderAdminBanks(body);
        break;
      case 'debts':
        renderAdminDebts(body);
        break;
      case 'expenses':
        renderAdminExpenses(body);
        break;
      case 'settings':
        renderAdminSettings(body);
        break;
      case 'storage':
        renderAdminStorage(body);
        break;
      default:
        body.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">تب نامعتبر</div>';
    }
  } catch (e) {
    console.error('❌ خطای کامل در renderAdminTab:', e);
    body.innerHTML = `
      <div style="color:#ef4444;text-align:center;padding:20px;background:rgba(239,68,68,0.1);border-radius:12px;">
        <strong>❌ خطا در تب ${tab}</strong>
        <br><br>
        <span style="font-size:13px;color:#94a3b8;">${e.message}</span>
      </div>
    `;
  }
}

function renderAdminBanks(body) {
  try {
    let banks = [];
    try {
      const saved = localStorage.getItem("banks");
      banks = saved ? JSON.parse(saved) : ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
    } catch (e) {
      banks = ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
    }
    let cards = [];
    try {
      const saved = localStorage.getItem("bankCardsV1");
      cards = saved ? JSON.parse(saved) : [];
    } catch (e) {
      cards = [];
    }
    body.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>🏦 بانک‌ها (${banks.length})</span>
          <button onclick="openAddBankModal(); setTimeout(()=>renderAdminTab('banks'),100);" class="admin-add-btn">➕ افزودن</button>
        </div>
        <div class="admin-list">
          ${banks.length === 0 ? '<div class="admin-empty">هیچ بانکی ثبت نشده</div>' : banks.map((b, i) => `
            <div class="admin-item">
              <span class="admin-item-title">${b}</span>
              <div class="admin-item-actions">
                <button onclick="editBankName(${i}); setTimeout(()=>renderAdminTab('banks'),100);" class="admin-edit-btn">✎</button>
                <button onclick="deleteBankName(${i}); setTimeout(()=>renderAdminTab('banks'),100);" class="admin-delete-btn">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="admin-section" style="margin-top:16px;">
        <div class="admin-section-header">
          <span>💳 کارت‌های بانکی (${cards.length})</span>
          <button onclick="closeAdminPanel(); setTimeout(()=>openBankCardModal(),200);" class="admin-add-btn">➕ افزودن</button>
        </div>
        <div class="admin-list">
          ${cards.length === 0 ? '<div class="admin-empty">هیچ کارتی ثبت نشده</div>' : cards.map(c => `
            <div class="admin-item admin-card-item">
              <div class="admin-item-info">
                <span class="admin-item-title">${c.bankName}</span>
                <span class="admin-item-sub" dir="ltr">${maskCardNumber(c.cardNumber)}</span>
              </div>
              <div class="admin-item-actions">
                <button onclick="closeAdminPanel(); setTimeout(()=>openBankCardModal(bankCards.find(card=>card.id=='${c.id}')),200);" class="admin-edit-btn">✎</button>
                <button onclick="deleteCardFromAdmin('${c.id}')" class="admin-delete-btn">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">خطا در بارگذاری بانک‌ها: ${e.message}</div>`;
  }
}

function deleteCardFromAdmin(id) {
  if (!confirm("این کارت حذف شود؟")) return;
  bankCards = bankCards.filter(c => c.id != id);
  saveBankCards();
  renderAdminTab('banks');
  showToast("کارت حذف شد", "success");
}

function renderAdminDebts(body) {
  try {
    const debts = allDebts || [];
    body.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>🤝 قرض و دیون (${debts.length})</span>
        </div>
        <div class="admin-list">
          ${debts.length === 0 ? '<div class="admin-empty">هیچ قرضی ثبت نشده</div>' : debts.map(d => `
            <div class="admin-item admin-debt-item ${d.direction === 'lent' ? 'admin-debt-lent' : 'admin-debt-borrowed'}">
              <div class="admin-item-info">
                <span class="admin-item-title">${d.counterparty || 'بدون نام'}</span>
                <span class="admin-item-sub">${d.direction === 'lent' ? '📤 طلب' : '📥 بدهی'} • ${formatMoney(d.amount)}</span>
              </div>
              <div class="admin-item-actions">
                <button onclick="closeAdminPanel(); setTimeout(()=>openEditDebtModal(allDebts.find(debt=>debt.id=='${d.id}')),200);" class="admin-edit-btn">✎</button>
                <button onclick="deleteDebtFromAdmin('${d.id}')" class="admin-delete-btn">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">خطا در بارگذاری قرض‌ها: ${e.message}</div>`;
  }
}

function deleteDebtFromAdmin(id) {
  if (!confirm("این قرض حذف شود؟")) return;
  deleteDebt(id);
}

function renderAdminExpenses(body) {
  try {
    const expenses = allExpenses || [];
    body.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>💳 همه موارد (${expenses.length})</span>
        </div>
        <div class="admin-list">
          ${expenses.length === 0 ? '<div class="admin-empty">موردی ثبت نشده</div>' : expenses.slice(0, 20).map(e => `
            <div class="admin-item admin-expense-item">
              <div class="admin-item-info">
                <span class="admin-item-title">#${e.id} ${e.title || 'بدون عنوان'}</span>
                <span class="admin-item-sub">${e.type || 'نامشخص'} • ${formatMoney(e.amount || 0)}</span>
              </div>
              <div class="admin-item-actions">
                <button onclick="closeAdminPanel(); setTimeout(()=>openEditModal(allExpenses.find(item=>item.id=='${e.id}')),200);" class="admin-edit-btn">✎</button>
              </div>
            </div>
          `).join('')}
          ${expenses.length > 20 ? `<div class="admin-more">... و ${expenses.length - 20} مورد دیگر</div>` : ''}
        </div>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">خطا در بارگذاری هزینه‌ها: ${e.message}</div>`;
  }
}

function renderAdminSettings(body) {
  try {
    const settings = loadSettings();
    body.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>⚙️ تنظیمات برنامه</span>
        </div>
        <div class="admin-settings-list">
          <div class="admin-setting-item"><span>تم</span><span>${settings.theme === 'light' ? '☀️ روشن' : '🌙 تیره'}</span></div>
          <div class="admin-setting-item"><span>قفل اپلیکیشن</span><span>${settings.appLockEnabled ? '✅ فعال' : '❌ غیرفعال'}</span></div>
          <div class="admin-setting-item"><span>قفل تنظیمات</span><span>${settings.lockEnabled ? '✅ فعال' : '❌ غیرفعال'}</span></div>
          <div class="admin-setting-item"><span>کلیدهای ذخیره شده</span><span>${Object.keys(settings).length} کلید</span></div>
        </div>
        <button onclick="if(confirm('همه داده‌ها پاک شوند؟')){localStorage.clear();alert('داده‌ها پاک شد!');location.reload();}" class="admin-danger-btn" style="margin-top:12px;width:100%;padding:10px;border:none;border-radius:10px;background:#ef4444;color:#fff;font-weight:bold;cursor:pointer;">🗑 پاک کردن کل دیتا</button>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">خطا در بارگذاری تنظیمات: ${e.message}</div>`;
  }
}

function renderAdminStorage(body) {
  try {
    let html = `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>💾 دیتای ذخیره شده در مرورگر (${localStorage.length} مورد)</span>
        </div>
        <div class="admin-storage-list">
    `;
    if (localStorage.length === 0) {
      html += `<div class="admin-empty">هیچ داده‌ای ذخیره نشده</div>`;
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        let preview = val;
        try {
          const parsed = JSON.parse(val);
          preview = JSON.stringify(parsed, null, 2);
          if (preview.length > 100) preview = preview.substring(0, 100) + '...';
        } catch (e) {}
        html += `
          <div class="admin-storage-item">
            <div class="admin-storage-key">${key}</div>
            <div class="admin-storage-value" dir="ltr">${preview}</div>
            <div class="admin-storage-actions">
              <button onclick="copyStorageKey('${key}')" class="admin-edit-btn" style="font-size:10px;padding:2px 8px;border-radius:4px;">📋 کپی</button>
              <button onclick="deleteStorageKey('${key}')" class="admin-delete-btn" style="font-size:10px;padding:2px 8px;border-radius:4px;">✕</button>
            </div>
          </div>
        `;
      }
    }
    html += `</div></div>`;
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">خطا در بارگذاری دیتابیس: ${e.message}</div>`;
  }
}

function copyStorageKey(key) {
  const val = localStorage.getItem(key);
  navigator.clipboard?.writeText(val).then(() => {
    showToast('کپی شد!', 'success');
  }).catch(() => {
    const input = document.createElement('input');
    input.value = val;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    showToast('کپی شد!', 'success');
  });
}

function deleteStorageKey(key) {
  if (!confirm(`حذف "${key}"؟`)) return;
  localStorage.removeItem(key);
  renderAdminTab('storage');
  showToast('حذف شد', 'info');
}

function loadBanksFromStorage() {
  try {
    const saved = localStorage.getItem("banks");
    return saved ? JSON.parse(saved) : ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
  } catch {
    return ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
  }
}

function saveBanksToStorage(banks) {
  localStorage.setItem("banks", JSON.stringify(banks));
}

function openAddBankModal() {
  const name = prompt("نام بانک جدید را وارد کنید:");
  if (name && name.trim()) {
    const banks = loadBanksFromStorage();
    banks.push(name.trim());
    saveBanksToStorage(banks);
    renderBankCards();
    showToast("بانک اضافه شد", "success");
  }
}

function editBankName(index) {
  const banks = loadBanksFromStorage();
  const oldName = banks[index];
  const newName = prompt("نام جدید:", oldName);
  if (newName && newName.trim() && newName.trim() !== oldName) {
    banks[index] = newName.trim();
    saveBanksToStorage(banks);
    bankCards.forEach(c => {
      if (c.bankName === oldName) c.bankName = newName.trim();
    });
    saveBankCards();
    renderBankCards();
    showToast("نام بانک تغییر کرد", "success");
  }
}

function deleteBankName(index) {
  const banks = loadBanksFromStorage();
  const bankName = banks[index];
  if (!confirm(`حذف "${bankName}"؟ کارت این بانک هم حذف خواهد شد.`)) return;
  banks.splice(index, 1);
  saveBanksToStorage(banks);
  bankCards = bankCards.filter(c => c.bankName !== bankName);
  saveBankCards();
  if (currentCardIndex >= bankCards.length) currentCardIndex = Math.max(0, bankCards.length - 1);
  renderBankCards();
  showToast("بانک و کارت آن حذف شد", "info");
}

function addCardToBank(bankName) {
  const existing = bankCards.find(c => c.bankName === bankName);
  if (existing) {
    showToast("این بانک قبلاً یک کارت دارد. برای ویرایش باز شد.", "info");
    openBankCardModal(existing);
    return;
  }
  openBankCardModal(null, bankName);
}

let currentCardImageData = null;

function openBankCardModal(card = null, prefillBank = null) {
  const modal = document.getElementById("bankCardModal");
  const form = document.getElementById("bankCardForm");
  const title = document.getElementById("bankCardModalTitle");
  const idField = document.getElementById("editBankCardId");
  const nameField = document.getElementById("bankCardName");
  const numberField = document.getElementById("bankCardNumber");
  const ibanField = document.getElementById("bankCardIban");
  const expiryField = document.getElementById("bankCardExpiry");
  const cvvField = document.getElementById("bankCardCvv");
  const colorField = document.getElementById("bankCardColor");
  const imagePreview = document.getElementById("bankCardImagePreview");
  const imageInput = document.getElementById("bankCardImage");
  if (!modal) return;
  form.reset();
  idField.value = "";
  currentCardImageData = null;
  if (imageInput) imageInput.value = "";
  if (imagePreview) { imagePreview.style.display = "none";
    imagePreview.src = ""; }
  if (prefillBank) { nameField.value = prefillBank; }
  if (card) {
    title.textContent = "ویرایش کارت بانکی";
    idField.value = card.id || "";
    nameField.value = card.bankName || "";
    numberField.value = formatCardNumber(card.cardNumber);
    ibanField.value = card.iban || "";
    expiryField.value = card.expiry || "";
    cvvField.value = card.cvv || "";
    colorField.value = card.color || "#1a2332";
    if (card.image) {
      currentCardImageData = card.image;
      if (imagePreview) { imagePreview.src = card.image;
        imagePreview.style.display = "block"; }
    }
  } else {
    title.textContent = "ثبت کارت بانکی جدید";
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeBankCardModal() {
  const modal = document.getElementById("bankCardModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("bankCardNumber")?.addEventListener("input", function(e) {
  const cursorWasAtEnd = e.target.selectionStart === e.target.value.length;
  e.target.value = formatCardNumber(e.target.value);
  if (cursorWasAtEnd) {
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
  }
});

document.getElementById("bankCardImage")?.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    currentCardImageData = ev.target.result;
    const preview = document.getElementById("bankCardImagePreview");
    if (preview) {
      preview.src = currentCardImageData;
      preview.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
});

document.getElementById("removeBankCardImageBtn")?.addEventListener("click", function() {
  currentCardImageData = null;
  const preview = document.getElementById("bankCardImagePreview");
  if (preview) { preview.style.display = "none";
    preview.src = ""; }
  const imageInput = document.getElementById("bankCardImage");
  if (imageInput) imageInput.value = "";
});

document.getElementById("bankCardForm")?.addEventListener("submit", function(e) {
  e.preventDefault();
  const idField = document.getElementById("editBankCardId");
  const nameField = document.getElementById("bankCardName");
  const numberField = document.getElementById("bankCardNumber");
  const ibanField = document.getElementById("bankCardIban");
  const expiryField = document.getElementById("bankCardExpiry");
  const cvvField = document.getElementById("bankCardCvv");
  const colorField = document.getElementById("bankCardColor");
  const isEditing = !!idField.value;
  const bankName = nameField.value.trim();
  if (!bankName) { showToast("نام بانک را وارد کنید", "error"); return; }
  const duplicate = bankCards.find(c => c.bankName === bankName && (!isEditing || c.id !== idField.value));
  if (duplicate) { showToast("برای این بانک قبلاً یک کارت ثبت شده است", "error"); return; }
  const rawNumber = numberField.value.replace(/\D/g, '');
  const cardData = {
    id: idField.value || Date.now().toString(),
    bankName: bankName,
    cardNumber: rawNumber,
    iban: ibanField.value.trim(),
    expiry: expiryField.value.trim(),
    cvv: cvvField.value.trim(),
    color: colorField.value || "#1a2332",
    image: currentCardImageData,
    createdAt: new Date().toISOString()
  };
  if (cardData.cardNumber && cardData.cardNumber.length < 16) {
    showToast("شماره کارت باید ۱۶ رقم باشد", "error");
    return;
  }
  const existingIndex = bankCards.findIndex(c => c.id === cardData.id);
  if (existingIndex >= 0) {
    bankCards[existingIndex] = cardData;
  } else {
    bankCards.push(cardData);
  }
  saveBankCards();
  closeBankCardModal();
  showToast("کارت بانکی ذخیره شد", "success");
  renderBankCards();
});

document.getElementById("closeBankCardModal")?.addEventListener("click", closeBankCardModal);
document.getElementById("bankCardModal")?.querySelector(".modal-backdrop")?.addEventListener("click", closeBankCardModal);
document.addEventListener("click", function(e) { if (e.target.closest("#addBankCardBtn")) { openBankCardModal(); } });
document.getElementById("addBankBtn")?.addEventListener("click", openAddBankModal);
document.getElementById("updateGoldPriceBtn")?.addEventListener("click", updateGoldPrice);
// =========================================================
// ================= منوی همبرگری =================
// =========================================================

function createHamburgerPanel() {
  if (document.getElementById("hamburgerPanel")) return;
  const panel = document.createElement("div");
  panel.id = "hamburgerPanel";
  panel.className = "hamburger-popup hidden";
  panel.innerHTML = `
    <div class="hamburger-items">
      <button class="hamburger-item" data-action="update" type="button" style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding-top:10px;color:#38bdf8;">
        <span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#38bdf8"><path d="M440-82q-76-8-141.5-41.5t-114-87Q136-264 108-333T80-480q0-91 36.5-168T216-780h-96v-80h240v240h-80v-109q-55 44-87.5 108.5T160-480q0 123 80.5 212.5T440-163v81Zm-17-214L254-466l56-56 113 113 227-227 56 57-283 283Zm177 196v-240h80v109q55-45 87.5-109T800-480q0-123-80.5-212.5T520-797v-81q152 15 256 128t104 270q0 91-36.5 168T744-180h96v80H600Z"/></svg></span> بروزرسانی برنامه
      </button>
      <button class="hamburger-item" data-action="settings" type="button">
        <span>⚙️</span> تنظیمات
      </button>
      <button class="hamburger-item" data-action="admin" type="button">
        <span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M480-212q66 0 107-46.71 41-46.7 41-112.29v-137q0-66.41-41-113.71Q546-669 480-669t-107 47.29q-41 47.3-41 113.71v137q0 65.59 41 112.29Q414-212 480-212Zm-80-100h160v-96H400v96Zm0-160h160v-96H400v96Zm80 31Zm.06 355Q404-86 339-125.5T238-232H126v-96h83q-2.25-15.67-2.62-31.33Q206-375 206-392h-80v-96h80q0-17 .38-32.67.37-15.66 2.62-31.33h-83v-96h117q10-27 29-48.5t43-38.5l-66-66 69-68 86 86q34-15 70.5-16t70.5 13l90-89 68 68-64 64q29 19 50 45t34 58h111v88h-83q2.25 15.67 2.63 31.33Q754-505 754-488h80v96h-80q0 17-1 32.5t-3 31.5h84v96H722q-36 67-100.94 106.5t-141 39.5Z"/></svg></span> دیباگ
      </button>
      <button class="hamburger-item" data-action="exit" type="button" style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding-top:10px;color:#ef4444;">
        <span>🚪</span> خروج از برنامه
      </button>
    </div>
  `;
  document.body.appendChild(panel);
  const menuBtn = document.getElementById("hamburgerMenuBtn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      panel.classList.toggle("hidden");
    });
  }
  document.addEventListener("click", function(e) {
    if (!panel.classList.contains("hidden") && !panel.contains(e.target) && e.target !== menuBtn) {
      panel.classList.add("hidden");
    }
  });
  panel.querySelectorAll(".hamburger-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const action = this.dataset.action;
      panel.classList.add("hidden");
      switch (action) {
        case "update":
        case "refresh":
          if (typeof performFullAppUpdate === 'function') {
            showToast("🔄 در حال بررسی و دریافت آخرین نسخه...", "info");
            performFullAppUpdate();
          } else {
            window.location.reload();
          }
          break;
        case "settings":
          if (typeof openPage === "function") {
            openPage("settingsPage", "⚙️ تنظیمات");
          }
          break;
        case "admin":
          if (typeof openAdminPanel === "function") {
            openAdminPanel();
          } else {
            alert("خطا: تابع پنل دیباگ پیدا نشد.");
          }
          break;
        case "exit":
          if (confirm('آیا مطمئن هستید که می‌خواهید از برنامه خارج شوید؟')) {
            if (window.matchMedia('(display-mode: standalone)').matches) {
              if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
              } else if (window.close) {
                window.close();
              } else {
                window.location.href = 'about:blank';
              }
            } else {
              if (window.close) {
                window.close();
              } else {
                alert('برای خروج از برنامه، تب مرورگر را ببندید.');
              }
            }
          }
          break;
      }
    });
  });
}

function initNewFeatures() {
  createHamburgerPanel();
  
  // بارگذاری کارت‌ها با تأخیر و چند بار تلاش
  setTimeout(() => {
    loadBankCards();
  }, 300);
  
  setTimeout(() => {
    // چک مجدد
    if (bankCards.length === 0) {
      const saved = DataManager.getBankCards();
      if (saved && saved.length > 0) {
        bankCards = saved;
        renderBankCards();
      }
    }
  }, 1000);
  
  document.addEventListener("click", (e) => {
    if (e.target.id === "emptyAddBankBtn") {
      if (typeof openBankCardModal === 'function') {
        openBankCardModal();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initNewFeatures, 300);
  });
} else {
  setTimeout(initNewFeatures, 300);
}

if (typeof initAppLock === 'function') initAppLock();
if (typeof initSettingsUI === 'function') initSettingsUI();

function toPersianDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

function toPersianDateShort(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

function convertToPersian(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const persian = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
    return persian.replace(/\//g, '/');
  } catch {
    return dateStr;
  }
}

function debugDateSelects() {
  const daySel = document.getElementById("paymentDay");
  const monthSel = document.getElementById("paymentMonth");
  const yearSel = document.getElementById("paymentYear");
  const p = getPersianDateParts();
  console.log("تاریخ امروز از getPersianDateParts:", p);
  const monthIndex = p.month - 1;
  const debugMonthKey = MONTHS[monthIndex]?.key;

}
// =========================================================
// ================= مدیریت سرمایه و طلا =================
// VAM REMEMBER — GOLD / ASSETS REFACTORED
// =========================================================

let allAssets = [];
let allCapitalTransactions = [];

let currentGoldPrice = 0;
let goldPriceLastUpdate = null;
let goldPriceSource = null;
let goldPriceRefreshTimer = null;
let currentUsdPrice = 0;  // <-- دلار
let usdPriceLastUpdate = null;  // <--  دلار

const GOLD_PRICE_REFRESH_INTERVAL = 60 * 1000;



// =========================================================
// ابزارهای عمومی دارایی
// =========================================================

function getAssetById(assetId) {
  return allAssets.find(
    asset => Number(asset.id) === Number(assetId)
  ) || null;
}

function isGoldAsset(asset) {
  if (!asset) return false;

  return (
    String(asset.type || "").toLowerCase() === "gold"
  );
}

function getNumeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatWeight(value) {
  return getNumeric(value).toLocaleString("fa-IR", {
    maximumFractionDigits: 3
  });
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}٪`;
}


// =========================================================
// دارایی‌ها
// =========================================================

async function loadAssets() {

  try {

    const data =
      await supabaseRequest(
        "assets?select=*&order=name.asc"
      );

    allAssets =
      Array.isArray(data) ? data : [];

    populateAssetSelect();
    updateAssetUnitLabels();

  } catch (error) {

    console.error(
      "خطا در دریافت دارایی‌ها:",
      error
    );

    allAssets = [];

    populateAssetSelect();
  }
}


// =========================================================
// تراکنش‌های سرمایه
// =========================================================

async function loadCapitalTransactions() {

  try {

    const data =
      await supabaseRequest(
        "capital_transactions?select=*&order=date.asc"
      );

    allCapitalTransactions =
      Array.isArray(data) ? data : [];

    updateAllGoldUI();

  } catch (error) {

    console.error(
      "خطا در دریافت تراکنش‌های دارایی:",
      error
    );

    allCapitalTransactions = [];

    updateAllGoldUI();
  }
}


// =========================================================
// قیمت لحظه‌ای طلا
// =========================================================
//
// API:
// ارزهام → gold_18
//
// API Key نباید داخل app.js قرار بگیرد.
// قیمت از Supabase Edge Function گرفته می‌شود.
// =========================================================

const BRS_GOLD_API_URL =
  "https://api.brsapi.ir/Market/Gold_Currency.php?key=BdEC9cvaBvqKarc5VAgScrTJyNwTtVt8";

async function fetchLiveGoldPrice(options = {}) {
  const silent = options.silent === true;

  try {
    const response = await fetch(BRS_GOLD_API_URL, {
      method: "GET",
      cache: "no-store",
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`BRS API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.gold)) {
      throw new Error("ساختار پاسخ API نامعتبر است");
    }

    // ===== قیمت طلا =====
    const gold18 = data.gold.find(
      item => item.symbol === "IR_GOLD_18K"
    );

    if (!gold18 || !Number.isFinite(Number(gold18.price))) {
      throw new Error("قیمت طلای ۱۸ عیار در پاسخ API پیدا نشد");
    }

    currentGoldPrice = Number(gold18.price) * 10;
    goldPriceLastUpdate = gold18.time_unix
      ? new Date(Number(gold18.time_unix) * 1000)
      : new Date();
    goldPriceSource = "BRS API";

    // ===== قیمت دلار =====
    // در API brsapi، دلار در بخش currency هست
    if (data.currency && Array.isArray(data.currency)) {
      const usd = data.currency.find(
        item => item.symbol === "USD" || item.symbol === "IRR_USD"
      );
      
      if (usd && Number.isFinite(Number(usd.price))) {
        currentUsdPrice = Number(usd.price) * 10; // تبدیل به ریال
        usdPriceLastUpdate = usd.time_unix
          ? new Date(Number(usd.time_unix) * 1000)
          : new Date();
        console.log("قیمت آنلاین دلار:", {
          price: currentUsdPrice,
          time: usd.date + " " + usd.time
        });
      } else {
        // اگر API دلار نداشت، از مقدار ثابت استفاده کن
        console.warn("قیمت دلار در API پیدا نشد، از مقدار پیش‌فرض استفاده می‌شود");
        currentUsdPrice = 0;
      }
    } else {
      console.warn("بخش currency در API پیدا نشد");
      currentUsdPrice = 0;
    }

    updateAllGoldUI();

    console.log("قیمت آنلاین طلای ۱۸ عیار:", {
      price: currentGoldPrice,
      unit: gold18.unit,
      time: gold18.date + " " + gold18.time
    });

    return currentGoldPrice;
  } catch (error) {
    console.error("خطا در دریافت قیمت طلا از BRS API:", error);

    updateAllGoldUI();

    if (!silent && typeof showToast === "function") {
      showToast(
        currentGoldPrice > 0
          ? "⚠️ دریافت قیمت جدید ناموفق بود؛ آخرین قیمت معتبر نمایش داده شد."
          : "❌ قیمت آنلاین طلا دریافت نشد.",
        "error"
      );
    }

    return currentGoldPrice;
  }
}


async function loadGoldPrice(options = {}) {
  return fetchLiveGoldPrice(options);
}

function updateGoldPrice(price = currentGoldPrice) {
  const numericPrice = Number(price);

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    currentGoldPrice = Math.round(numericPrice);

    if (!goldPriceLastUpdate) {
      goldPriceLastUpdate = new Date();
    }
  }

  updateAllGoldUI();
}

//-------------------------+++++++++++++++++----------
async function loadGoldPrice(options = {}) {
  return fetchLiveGoldPrice(options);
}

function updateGoldPrice(price = currentGoldPrice) {
  const numericPrice = Number(price);

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    currentGoldPrice = Math.round(numericPrice);

    if (!goldPriceLastUpdate) {
      goldPriceLastUpdate = new Date();
    }
  }

  updateAllGoldUI();
}

// =========================================================
// نمایش قیمت روی تابلو
// =========================================================

function updateGoldPriceDisplay() {

  const priceEl =
    document.getElementById(
      "todayGoldPrice"
    );



  const timeEl =
    document.getElementById(
      "goldPriceUpdateTime"
    );


  if (priceEl) {

    priceEl.textContent =
      currentGoldPrice > 0
        ? formatMoney(currentGoldPrice)
        : "در حال دریافت…";
  }
 


  if (timeEl) {

    if (goldPriceLastUpdate) {

      timeEl.textContent =
        `آخرین بروزرسانی: ${goldPriceLastUpdate.toLocaleTimeString(
          "fa-IR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )}`;

    } else {

      timeEl.textContent =
        "در حال دریافت…";
    }
  }
}


// =========================================================
// قیمت زنده در مودال خرید و فروش
// =========================================================

function updateModalGoldPrice() {

  const priceEls = [
    document.getElementById("modalGoldPrice"),
    document.getElementById("modalSellGoldPrice")
  ];


  priceEls.forEach(el => {

    if (!el) return;

    el.textContent =
      currentGoldPrice > 0
        ? formatMoney(currentGoldPrice)
        : "در حال دریافت…";
  });


  const dateEls = [
    document.getElementById("modalGoldPriceDate"),
    document.getElementById("modalSellGoldPriceDate")
  ];


  dateEls.forEach(el => {

    if (!el) return;

    if (goldPriceLastUpdate) {

      el.textContent =
        `آخرین بروزرسانی ${goldPriceLastUpdate.toLocaleTimeString(
          "fa-IR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )}`;

    } else {

      el.textContent = "-";
    }
  });
}


// =========================================================
// وضعیت واقعی موجودی طلا
// =========================================================
//
// خریدها +
// فروش‌ها -
//
// دیگر مثل نسخه قبلی، فروش‌ها را نادیده نمی‌گیریم.
// =========================================================

function getGoldPosition(assetId = null) {

  let quantity = 0;
  let invested = 0;
  let realizedProfit = 0;


  const transactions =
    allCapitalTransactions
      .filter(t => {

        if (assetId !== null) {

          return (
            Number(t.asset_id) ===
            Number(assetId)
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.date || 0) -
          new Date(b.date || 0)
      );


  for (const transaction of transactions) {

    const q =
      getNumeric(transaction.quantity);

    const total =
      getNumeric(transaction.total_price);


    if (
      transaction.type === "buy"
    ) {

      quantity += q;
      invested += total;

    } else if (
      transaction.type === "sell"
    ) {

      if (quantity <= 0) continue;


      const averageCost =
        invested / quantity;


      const soldCost =
        Math.min(q, quantity) *
        averageCost;


      realizedProfit +=
        total - soldCost;


      quantity -=
        Math.min(q, quantity);

      invested -= soldCost;
    }
  }


  const averageCost =
    quantity > 0
      ? invested / quantity
      : 0;


  const currentValue =
    quantity * currentGoldPrice;


  const unrealizedProfit =
    currentValue - invested;


  const totalProfit =
    realizedProfit +
    unrealizedProfit;


  return {

    quantity,

    invested,

    averageCost,

    currentValue,

    realizedProfit,

    unrealizedProfit,

    totalProfit
  };
}


// =========================================================
// محاسبه وضعیت همه طلای موجود
// =========================================================

function getTotalGoldPosition() {

  let quantity = 0;
  let invested = 0;
  let realizedProfit = 0;


  const goldAssets =
    allAssets.filter(
      isGoldAsset
    );


  goldAssets.forEach(asset => {

    const position =
      getGoldPosition(asset.id);


    quantity +=
      position.quantity;

    invested +=
      position.invested;

    realizedProfit +=
      position.realizedProfit;
  });


  const currentValue =
    quantity * currentGoldPrice;


  const unrealizedProfit =
    currentValue - invested;


  return {

    quantity,

    invested,

    currentValue,

    realizedProfit,

    unrealizedProfit,

    totalProfit:
      realizedProfit +
      unrealizedProfit
  };
}


// =========================================================
// داشبورد طلا
// =========================================================

function updateDashboardAssets() {

  const position =
    getTotalGoldPosition();


  const weightEl =
    document.getElementById(
      "dashGoldWeight"
    );

  const valueEl =
    document.getElementById(
      "dashGoldValue"
    );

  const profitEl =
    document.getElementById(
      "dashGoldProfit"
    );


  if (weightEl) {

    weightEl.textContent =
      `${formatWeight(position.quantity)} گرم`;
  }


  if (valueEl) {

    valueEl.textContent =
      formatMoney(
        position.currentValue
      );
  }


  if (profitEl) {

    const profit =
      position.totalProfit;


    profitEl.textContent =
      `${profit >= 0 ? "+" : ""}${formatMoney(profit)}`;


    profitEl.style.color =
      profit >= 0
        ? "var(--success)"
        : "var(--danger)";
  }
}


// =========================================================
// کارت سرمایه در صفحه بانک‌ها
// =========================================================

function updateGoldSummary() {

  const position =
    getTotalGoldPosition();


  const valueEl =
    document.getElementById(
      "goldTotalValue"
    );

  const weightEl =
    document.getElementById(
      "goldTotalWeight"
    );

  const investEl =
    document.getElementById(
      "goldTotalInvest"
    );

  const profitEl =
    document.getElementById(
      "goldTotalProfit"
    );


  if (valueEl) {

    valueEl.textContent =
      formatMoney(
        position.currentValue
      );
  }


  if (weightEl) {

    weightEl.textContent =
      `${formatWeight(position.quantity)} گرم`;
  }


  if (investEl) {

    investEl.textContent =
      formatMoney(
        position.invested
      );
  }


  if (profitEl) {

    profitEl.textContent =
      `${position.totalProfit >= 0 ? "+" : ""}${formatMoney(
        position.totalProfit
      )}`;

    profitEl.style.color =
      position.totalProfit >= 0
        ? "var(--success)"
        : "var(--danger)";
  }
}


// =========================================================
// گزارش
// =========================================================

function updateGoldReport() {

  const position =
    getTotalGoldPosition();


  const el =
    document.getElementById(
      "reportGoldTotal"
    );


  if (el) {

    el.textContent =
      formatMoney(
        position.currentValue
      );
  }
}


// =========================================================
// همه UI های طلا از یک مسیر
// =========================================================

function updateAllGoldUI() {
  updateGoldPriceDisplay();
  updateModalGoldPrice();
  updateDashboardAssets();
  updateGoldSummary();
  updateGoldReport();
  updateUsdPriceDisplay();  // <-- دلار
   updateModalUsdPrice();    // <--دلار

  if (typeof calculateAssetSellUnitPrice === "function") {
    calculateAssetSellUnitPrice();
  }
}



// =========================================================
// لیست دارایی‌ها در مودال
// =========================================================

function populateAssetSelect() {

  const select =
    document.getElementById(
      "assetSelect"
    );

  if (!select) return;


  select.innerHTML =
    '<option value="">انتخاب کنید...</option>';


  allAssets.forEach(asset => {

    const option =
      document.createElement("option");


    option.value =
      asset.id;


    option.textContent =
      `${asset.name} (${asset.unit})`;


    select.appendChild(option);
  });
}


// =========================================================
// واحد دارایی
// =========================================================

function updateAssetUnitLabels() {

  const select =
    document.getElementById(
      "assetSelect"
    );

  if (!select) return;


  const asset =
    getAssetById(
      select.value
    );


  const unit =
    asset?.unit || "گرم";


  const buyLabel =
    document.getElementById(
      "assetBuyUnitLabel"
    );

  const sellLabel =
    document.getElementById(
      "assetSellUnitLabel"
    );


  if (buyLabel) {
    buyLabel.textContent = unit;
  }

  if (sellLabel) {
    sellLabel.textContent = unit;
  }


  const goldBoxes =
    document.querySelectorAll(
      ".gold-live-price-box"
    );


  goldBoxes.forEach(box => {

    box.style.display =
      asset && isGoldAsset(asset)
        ? "flex"
        : "none";
  });


  updateModalGoldPrice();

  calculateAssetSellUnitPrice();
}


// =========================================================
// تاریخ خرید / فروش (بدون ماه)
// =========================================================

function fillAssetDateSelectsNoMonth(prefix, presetValues = null) {
  const daySel = document.getElementById(`${prefix}Day`);
  const monthSel = document.getElementById(`${prefix}Month`);
  const yearSel = document.getElementById(`${prefix}Year`);
  
  if (!daySel || !yearSel) return;
  
  // پر کردن روزها
  if (daySel.options.length === 0) {
    for (let d = 1; d <= 31; d++) {
      const op = document.createElement("option");
      op.value = d;
      op.textContent = d.toLocaleString("fa-IR");
      daySel.appendChild(op);
    }
  }
  
  // پر کردن ماه‌ها
  if (monthSel && monthSel.options.length === 0) {
    MONTHS.forEach(m => {
      const op = document.createElement("option");
      op.value = m.key;
      op.textContent = m.name;
      monthSel.appendChild(op);
    });
  }
  
  // اگر مقادیر از قبل تنظیم شده باشه (حالت ویرایش)
  if (presetValues) {
    if (presetValues.day) daySel.value = presetValues.day;
    if (presetValues.month) monthSel.value = presetValues.month;
    if (presetValues.year) yearSel.value = presetValues.year;
    return;
  }
  
  // حالت جدید: تاریخ روز جاری
  const p = getPersianDateParts();
  const monthIndex = p.month - 1;
  const selectedMonthKey = MONTHS[monthIndex]?.key || MONTHS[0].key;
  
  daySel.value = p.day;
  if (monthSel) monthSel.value = selectedMonthKey;
  yearSel.value = p.year;
}

// =========================================================
// تبدیل تاریخ شمسی به ISO
// =========================================================

function persianDateToGregorian(
  jy,
  jm,
  jd
) {

  jy = Number(jy);
  jm = Number(jm);
  jd = Number(jd);


  let gy;

  if (jy > 979) {

    gy = 1600;

    jy -= 979;

  } else {

    gy = 621;
  }


  const days =
    (365 * jy) +
    Math.floor(jy / 33) * 8 +
    Math.floor(
      ((jy % 33) + 3) / 4
    ) +
    78 +
    jd +
    (
      jm < 7
        ? (jm - 1) * 31
        : ((jm - 7) * 30) + 186
    );


  gy +=
    400 *
    Math.floor(days / 146097);


  const remaining =
    days % 146097;


  if (
    remaining > 36524
  ) {

    gy +=
      100 *
      Math.floor(
        --remaining / 36524
      );

    const rem2 =
      remaining % 36524;

    if (
      rem2 >= 365
    ) {

      // handled below
    }
  }


  const gyDay =
    days % 1461;


  gy +=
    4 *
    Math.floor(
      gyDay / 1461
    );


  const dayOfYear =
    gyDay % 1461;


  let gd;

  let gm;


  if (
    dayOfYear > 365
  ) {

    gy +=
      Math.floor(
        (dayOfYear - 1) / 365
      );

    const doy =
      (dayOfYear - 1) % 365;


    const monthDays = [
      31,28,31,30,31,30,
      31,31,30,31,30,31
    ];


    let dayCount = 0;

    gm = 1;

    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const leap =
        i === 1 &&
        (
          gy % 4 === 0 &&
          (
            gy % 100 !== 0 ||
            gy % 400 === 0
          )
        )
          ? 1
          : 0;


      const md =
        monthDays[i] + leap;


      if (
        doy <
        dayCount + md
      ) {

        gm = i + 1;

        gd =
          doy -
          dayCount +
          1;

        break;
      }


      dayCount += md;
    }

  } else {

    const monthDays = [
      31,28,31,30,31,30,
      31,31,30,31,30,31
    ];


    let dayCount = 0;

    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const leap =
        i === 1 &&
        (
          gy % 4 === 0 &&
          (
            gy % 100 !== 0 ||
            gy % 400 === 0
          )
        )
          ? 1
          : 0;


      const md =
        monthDays[i] + leap;


      if (
        dayOfYear <
        dayCount + md
      ) {

        gm = i + 1;

        gd =
          dayOfYear -
          dayCount +
          1;

        break;
      }


      dayCount += md;
    }
  }


  return {
    year: gy,
    month: gm,
    day: gd
  };
}


function getAssetDate(prefix) {

  const day =
    parseInt(
      document.getElementById(
        `${prefix}Day`
      )?.value
    );

  const year =
    parseInt(
      toEnglishDigits(
        document.getElementById(
          `${prefix}Year`
        )?.value
      )
    );


  if (!day || !year || year < 1300) {
    return null;
  }

  const month = 1; // فروردین

  const approx =
    new Date(
      year + 621,
      month - 1,
      day
    );

  return {
    iso: approx.toISOString(),
    persian: `${year}/01/${String(day).padStart(2, "0")}`
  };
}


// =========================================================
// بانک‌های خرید / فروش
// =========================================================

function renderAssetBanks(
  containerId,
  isBuy = true
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) return;


  const banksList =
    getBanks();


  container.innerHTML =
    banksList.map(bank => `
      <button
        type="button"
        class="tag-btn asset-bank-btn"
        data-bank="${escapeHtml(bank)}">
        ${escapeHtml(bank)}
      </button>
    `).join("");


  container
    .querySelectorAll(
      ".asset-bank-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          container
            .querySelectorAll(
              ".asset-bank-btn"
            )
            .forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          if (isBuy) {

            selectedAssetBuyBank =
              button.dataset.bank;

          } else {

            selectedAssetSellBank =
              button.dataset.bank;
          }
        }
      );
    });
}


// =========================================================
// قیمت واحد خرید
// =========================================================

function calculateAssetBuyUnitPrice() {

  const quantity =
    getNumeric(
      document.getElementById(
        "assetBuyQuantity"
      )?.value
    );


  const total =
    getNumeric(
      document.getElementById(
        "assetBuyTotalPrice"
      )?.value
    );


  const unitPrice =
    quantity > 0
      ? total / quantity
      : 0;


  const el =
    document.getElementById(
      "assetBuyUnitPrice"
    );


  if (el) {

    el.textContent =
      formatMoney(unitPrice);
  }
}


// =========================================================
// سود / زیان فروش
// =========================================================

function calculateAssetSellUnitPrice() {

  const assetId =
    document.getElementById(
      "assetSelect"
    )?.value;


  const quantity =
    getNumeric(
      document.getElementById(
        "assetSellQuantity"
      )?.value
    );


  const totalPrice =
    getNumeric(
      document.getElementById(
        "assetSellTotalPrice"
      )?.value
    );


  const unitPrice =
    quantity > 0
      ? totalPrice / quantity
      : 0;


  const unitPriceEl =
    document.getElementById(
      "assetSellUnitPrice"
    );


  if (unitPriceEl) {

    unitPriceEl.textContent =
      formatMoney(unitPrice);
  }


  const marketValueEl =
    document.getElementById(
      "assetSellMarketValue"
    );


  const marketProfitEl =
    document.getElementById(
      "assetSellMarketProfit"
    );


  const enteredProfitEl =
    document.getElementById(
      "assetSellProfit"
    );


  if (!assetId) {

    if (marketValueEl)
      marketValueEl.textContent =
        "۰ ریال";

    if (marketProfitEl)
      marketProfitEl.textContent =
        "—";

    if (enteredProfitEl)
      enteredProfitEl.textContent =
        "—";

    return;
  }


  const asset =
    getAssetById(assetId);


  if (!isGoldAsset(asset)) {

    if (marketValueEl)
      marketValueEl.textContent =
        "—";

    if (marketProfitEl)
      marketProfitEl.textContent =
        "—";

    if (enteredProfitEl)
      enteredProfitEl.textContent =
        "—";

    return;
  }


  const position =
    getGoldPosition(assetId);


  // -------------------------------------------------------
  // ارزش روز همین مقدار با قیمت لحظه‌ای
  // -------------------------------------------------------

  const marketValue =
    quantity *
    currentGoldPrice;


  // -------------------------------------------------------
  // بهای تمام‌شده همین مقدار
  // -------------------------------------------------------

  const costBasis =
    quantity *
    position.averageCost;


  const marketProfit =
    marketValue -
    costBasis;


  const marketProfitPercent =
    costBasis > 0
      ? (
          marketProfit /
          costBasis
        ) * 100
      : 0;


  if (marketValueEl) {

    marketValueEl.textContent =
      formatMoney(
        marketValue
      );
  }


  if (marketProfitEl) {

    marketProfitEl.textContent =
      `${marketProfit >= 0 ? "+" : ""}${formatMoney(
        marketProfit
      )} (${formatPercent(
        marketProfitPercent
      )})`;


    marketProfitEl.style.color =
      marketProfit >= 0
        ? "var(--success)"
        : "var(--danger)";
  }


  // -------------------------------------------------------
  // اگر مبلغ فروش دستی وارد شده باشد
  // -------------------------------------------------------

  if (
    enteredProfitEl
  ) {

    if (
      quantity > 0 &&
      totalPrice > 0 &&
      position.averageCost > 0
    ) {

      const enteredProfit =
        totalPrice -
        costBasis;


      const enteredPercent =
        costBasis > 0
          ? (
              enteredProfit /
              costBasis
            ) * 100
          : 0;


      enteredProfitEl.textContent =
        `${enteredProfit >= 0 ? "+" : ""}${formatMoney(
          enteredProfit
        )} (${formatPercent(
          enteredPercent
        )})`;


      enteredProfitEl.style.color =
        enteredProfit >= 0
          ? "var(--success)"
          : "var(--danger)";

    } else {

      enteredProfitEl.textContent =
        "—";
    }
  }
}


// =========================================================
// باز کردن مودال تراکنش
// =========================================================

let selectedAssetBuyBank = null;
let selectedAssetSellBank = null;

async function openAssetTransactionModal(assetId = null) {
  const modal = document.getElementById("assetTransactionModal");
  if (!modal) return;

  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  const form = document.getElementById("assetTransactionForm");
  form?.reset();

  selectedAssetBuyBank = null;
  selectedAssetSellBank = null;

  // حذف ID ویرایش اگر وجود دارد
  const oldHidden = document.getElementById("editAssetId");
  if (oldHidden) oldHidden.remove();

  document.getElementById("assetTransactionType").value = "buy";
  document.getElementById("assetBuyFields").style.display = "block";
  document.getElementById("assetSellFields").style.display = "none";
  document.getElementById("assetTransactionTitle").textContent = assetId ? "✏️ ویرایش دارایی" : "📥 خرید دارایی";
  document.getElementById("saveAssetTransactionBtn").textContent = assetId ? "ذخیره تغییرات" : "ثبت خرید";

  document.querySelectorAll(".asset-transaction-type").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.type === "buy")
  );

  await loadAssets();
  await loadCapitalTransactions();

  // پر کردن تاریخ بدون ماه (همیشه تاریخ روز برای حالت جدید)
  fillAssetDateSelectsNoMonth("assetBuy");
  fillAssetDateSelectsNoMonth("assetSell");

  renderAssetBanks("assetBuyBanksContainer", true);
  renderAssetBanks("assetSellBanksContainer", false);

  // ===== اگر assetId داده شده، دارایی رو انتخاب کن و اطلاعات رو پر کن =====
  if (assetId) {
    const select = document.getElementById("assetSelect");
    if (select) {
      select.value = assetId;
      updateAssetUnitLabels();
    }

    // پیدا کردن آخرین تراکنش خرید این دارایی
    const lastBuyTransaction = allCapitalTransactions
      .filter(t => Number(t.asset_id) === Number(assetId) && t.type === "buy")
      .pop();

    const asset = getAssetById(assetId);

    if (lastBuyTransaction) {
      // پر کردن مقدار و مبلغ
      document.getElementById("assetBuyQuantity").value = lastBuyTransaction.quantity || "";
      document.getElementById("assetBuyTotalPrice").value = lastBuyTransaction.total_price || "";
      
      // ===== تنظیم تاریخ از asset.created_at =====
      if (asset && asset.created_at) {
        try {
          const d = new Date(asset.created_at);
          if (!isNaN(d.getTime())) {
            // استخراج روز، ماه، سال به شمسی
            const persianParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            }).formatToParts(d);
            
            let year = '', month = '', day = '';
            for (const part of persianParts) {
              if (part.type === 'year') year = toEnglishDigits(part.value);
              else if (part.type === 'month') month = toEnglishDigits(part.value);
              else if (part.type === 'day') day = toEnglishDigits(part.value);
            }
            
            // تنظیم روز و سال (ماه در اینجا استفاده نمی‌شه چون فقط روز و سال داریم)
            const daySel = document.getElementById("assetBuyDay");
            const yearSel = document.getElementById("assetBuyYear");
            if (daySel && day) daySel.value = parseInt(day);
            if (yearSel && year) yearSel.value = parseInt(year);
          }
        } catch(e) {
          console.warn("خطا در تنظیم تاریخ:", e);
        }
      }

      // تنظیم بانک
      if (lastBuyTransaction.bank) {
        const container = document.getElementById("assetBuyBanksContainer");
        if (container) {
          const btns = container.querySelectorAll('.asset-bank-btn');
          btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bank === lastBuyTransaction.bank);
          });
          selectedAssetBuyBank = lastBuyTransaction.bank;
        }
      }

      // تنظیم یادداشت
      document.getElementById("assetTransactionNote").value = lastBuyTransaction.note || "";
      
      // ذخیره ID برای ویرایش
      const hiddenId = document.createElement("input");
      hiddenId.type = "hidden";
      hiddenId.id = "editAssetId";
      hiddenId.value = assetId;
      document.getElementById("assetTransactionForm").appendChild(hiddenId);
    }
  }

  await fetchLiveGoldPrice({ silent: true });
  updateAllGoldUI();
}


// =========================================================
// بستن مودال
// =========================================================

function closeAssetTransactionModal() {

  const modal =
    document.getElementById(
      "assetTransactionModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "open"
  );

  document.body.style.overflow =
    "";
}


// =========================================================
// خرید / فروش
// =========================================================

document
  .querySelectorAll(
    ".asset-transaction-type"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      async function () {

        document
          .querySelectorAll(
            ".asset-transaction-type"
          )
          .forEach(
            b =>
              b.classList.remove(
                "active"
              )
          );


        this.classList.add(
          "active"
        );


        const type =
          this.dataset.type;


        document.getElementById(
          "assetTransactionType"
        ).value =
          type;


        document.getElementById(
          "assetBuyFields"
        ).style.display =
          type === "buy"
            ? "block"
            : "none";


        document.getElementById(
          "assetSellFields"
        ).style.display =
          type === "sell"
            ? "block"
            : "none";


        document.getElementById(
          "assetTransactionTitle"
        ).textContent =
          type === "buy"
            ? "📥 خرید دارایی"
            : "📤 فروش دارایی";


        document.getElementById(
          "saveAssetTransactionBtn"
        ).textContent =
          type === "buy"
            ? "ثبت خرید"
            : "ثبت فروش";


        const asset =
          getAssetById(
            document.getElementById(
              "assetSelect"
            )?.value
          );


        if (
          asset &&
          isGoldAsset(asset)
        ) {

          await fetchLiveGoldPrice({
            silent: true
          });
        }


        updateAllGoldUI();
      }
    );
  });


// =========================================================
// انتخاب دارایی
// =========================================================

document
  .getElementById(
    "assetSelect"
  )
  ?.addEventListener(
    "change",
    async function () {

      updateAssetUnitLabels();


      const asset =
        getAssetById(
          this.value
        );


      if (
        asset &&
        isGoldAsset(asset)
      ) {

        await fetchLiveGoldPrice({
          silent: true
        });

      } else {

        updateAllGoldUI();
      }
    }
  );


// =========================================================
// ورودی‌ها
// =========================================================

document
  .getElementById(
    "assetBuyQuantity"
  )
  ?.addEventListener(
    "input",
    calculateAssetBuyUnitPrice
  );


document
  .getElementById(
    "assetBuyTotalPrice"
  )
  ?.addEventListener(
    "input",
    calculateAssetBuyUnitPrice
  );


document
  .getElementById(
    "assetSellQuantity"
  )
  ?.addEventListener(
    "input",
    calculateAssetSellUnitPrice
  );


document
  .getElementById(
    "assetSellTotalPrice"
  )
  ?.addEventListener(
    "input",
    calculateAssetSellUnitPrice
  );


// =========================================================
// FAB دارایی
// =========================================================

document
  .getElementById(
    "fabAsset"
  )
  ?.addEventListener(
    "click",
    function () {

      fabMenu.classList.add(
        "hidden"
      );

      addExpenseButton.classList.remove(
        "open"
      );

      addExpenseButton.classList.remove(
        "active"
      );


      openAssetTransactionModal();
    }
  );


// =========================================================
// بستن
// =========================================================

document
  .getElementById(
    "closeAssetTransactionModal"
  )
  ?.addEventListener(
    "click",
    closeAssetTransactionModal
  );


document
  .getElementById(
    "assetTransactionModal"
  )
  ?.querySelector(
    ".modal-backdrop"
  )
  ?.addEventListener(
    "click",
    closeAssetTransactionModal
  );


// =========================================================
// ثبت خرید / فروش
// =========================================================

document.getElementById("assetTransactionForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const assetId = Number(document.getElementById("assetSelect").value);
    const type = document.getElementById("assetTransactionType").value;
    const asset = getAssetById(assetId);
    const isEditing = document.getElementById("editAssetId")?.value ? true : false;

    if (!assetId || !asset) {
        showToast("لطفاً دارایی را انتخاب کنید.", "error");
        return;
    }

    let quantity;
    let totalPrice;
    let bank;
    let prefix;

    if (type === "buy") {
        prefix = "assetBuy";
        quantity = getNumeric(document.getElementById("assetBuyQuantity").value);
        totalPrice = getNumeric(document.getElementById("assetBuyTotalPrice").value);
        bank = selectedAssetBuyBank;
    } else {
        prefix = "assetSell";
        quantity = getNumeric(document.getElementById("assetSellQuantity").value);
        totalPrice = getNumeric(document.getElementById("assetSellTotalPrice").value);
        bank = selectedAssetSellBank;
    }

    if (quantity <= 0) {
        showToast("مقدار معتبر نیست.", "error");
        return;
    }

    if (totalPrice <= 0) {
        showToast("مبلغ معتبر نیست.", "error");
        return;
    }

    if (!bank) {
        showToast(type === "buy" ? "لطفاً حساب پرداخت را انتخاب کنید." : "لطفاً حساب دریافت را انتخاب کنید.", "error");
        return;
    }

    const day = parseInt(document.getElementById(`${prefix}Day`).value);
    const year = parseInt(toEnglishDigits(document.getElementById(`${prefix}Year`).value));

    if (!day || !year) {
        showToast("تاریخ معتبر نیست.", "error");
        return;
    }

    const dateInfo = getAssetDate(prefix);
    if (!dateInfo) {
        showToast("تاریخ معتبر نیست.", "error");
        return;
    }

    let goldPriceAtTransaction = null;
    if (isGoldAsset(asset)) {
        await fetchLiveGoldPrice({ silent: true });
        goldPriceAtTransaction = currentGoldPrice;
        if (!goldPriceAtTransaction) {
            showToast("قیمت لحظه‌ای طلا دریافت نشد؛ ثبت متوقف شد.", "error");
            return;
        }
    }

    const note = document.getElementById("assetTransactionNote").value.trim();
    const unitPrice = totalPrice / quantity;

    const data = {
        asset_id: assetId,
        type: type,
        quantity: quantity,
        total_price: Math.round(Number(totalPrice)),
        unit_price: Math.round(Number(unitPrice)),
        date: dateInfo.iso,
        bank: bank,
        note: note || null
    };

    if (type === "buy" && isGoldAsset(asset)) {
        data.gold_price_at_transaction = goldPriceAtTransaction;
    }

    const btn = document.getElementById("saveAssetTransactionBtn");
    btn.disabled = true;
    btn.textContent = "در حال ذخیره...";

    try {if (isEditing) {
    // ===== حالت ویرایش =====
    const editAssetId = document.getElementById("editAssetId").value;
    
    // پیدا کردن آخرین تراکنش خرید
    const lastBuy = allCapitalTransactions
        .filter(t => Number(t.asset_id) === Number(editAssetId) && t.type === "buy")
        .pop();
    
    if (lastBuy) {
        // آپدیت تراکنش
        await supabaseRequest(`capital_transactions?id=eq.${lastBuy.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                quantity: quantity,
                total_price: Math.round(Number(totalPrice)),
                unit_price: Math.round(Number(unitPrice)),
                date: dateInfo.iso,
                bank: bank,
                note: note || null
            })
        });
        
        showToast("✅ دارایی با موفقیت ویرایش شد", "success");
    }
} else {
  
            // ===== حالت ثبت جدید =====
            await supabaseRequest("capital_transactions", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(data)
            });

            const assetName = asset.name || "دارایی";
            await addTransaction({
                expense_id: null,
                title: `خرید ${assetName}`,
                amount: totalPrice,
                type: "payment",
                account: bank,
                from_account: bank,
                to_account: null,
                transaction_date: dateInfo.iso,
                note: note || null
            });
            
            showToast("✅ خرید دارایی ثبت شد", "success");
        }

        closeAssetTransactionModal();
        await loadCapitalTransactions();
        await loadData();

    } catch (error) {
        console.error("خطا در ثبت دارایی:", error);
        showToast(`❌ ثبت انجام نشد: ${error.message || "خطای نامشخص"}`, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = isEditing ? "ذخیره تغییرات" : (type === "buy" ? "ثبت خرید" : "ثبت فروش");
    }
});


// =========================================================
// بروزرسانی خودکار قیمت
// =========================================================

function startGoldPriceAutoRefresh() {

  if (
    goldPriceRefreshTimer
  ) {

    clearInterval(
      goldPriceRefreshTimer
    );
  }


  fetchLiveGoldPrice({
    silent: true
  });


  goldPriceRefreshTimer =
    setInterval(
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {

          fetchLiveGoldPrice({
            silent: true
          });
        }

      },
      GOLD_PRICE_REFRESH_INTERVAL
    );
}


// =========================================================
// بروزرسانی با برگشت اپ از پس‌زمینه
// =========================================================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      fetchLiveGoldPrice({
        silent: true
      });
    }
  }
);


// =========================================================
// دکمه Refresh تابلو
// =========================================================

document
  .getElementById(
    "updateGoldPriceBtn"
  )
  ?.addEventListener(
    "click",
    async function () {

      const btn =
        this;


      const oldText =
        btn.textContent;


      btn.disabled =
        true;

      btn.textContent =
        "⏳";


      try {

        await fetchLiveGoldPrice();


      } finally {

        btn.disabled =
          false;

        btn.textContent =
          oldText ||
          "🔄";
      }
    }
  );


// =========================================================
// شروع سیستم طلا
// =========================================================

async function initGoldSystem() {
  try {
    await loadAssets();
    await loadCapitalTransactions();
    await loadGoldPrice({ silent: true });
    startGoldPriceAutoRefresh();
  } catch (error) {
    console.error("خطا در راه‌اندازی سیستم طلا:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGoldSystem);
} else {
  initGoldSystem();
}

// =========================================================
// ================= نمایش سرمایه‌ها در صفحه بانک‌ها =================
// =========================================================

/**
 * رندر کارت‌های سرمایه در صفحه بانک‌ها
 * این تابع جایگزین بخش سرمایه در صفحه بانک‌ها می‌شود
 */
function renderCapitalCards() {
    const container = document.getElementById("capitalCardsContainer");
    if (!container) return;

    // اگر داده‌ای نیست
    if (!allCapitalTransactions || allCapitalTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-capital-state" style="text-align:center;padding:30px 20px;color:var(--muted);">
                <div style="font-size:48px;margin-bottom:12px;">💰</div>
                <p style="font-size:14px;">هیچ سرمایه‌ای ثبت نشده است</p>
                <button onclick="openAssetTransactionModal()" class="primary-button" style="margin-top:16px;max-width:200px;margin-left:auto;margin-right:auto;">
                    ➕ ثبت سرمایه جدید
                </button>
            </div>
        `;
        return;
    }

    // گروه‌بندی تراکنش‌ها بر اساس asset_id
    const grouped = {};
    allCapitalTransactions.forEach(t => {
        const key = t.asset_id;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(t);
    });

    let html = '<div class="capital-grid" style="display:grid;gap:12px;margin-bottom: 12px;">';

    // برای هر دارایی، یک کارت بساز
    Object.keys(grouped).forEach(assetId => {
        const transactions = grouped[assetId];
        const asset = getAssetById(assetId);
        if (!asset) return;

        // محاسبه موجودی فعلی
        let quantity = 0;
        let totalInvested = 0;
        let lastBuyPrice = 0;
        let buyDate = null;

        transactions.forEach(t => {
            const q = getNumeric(t.quantity);
            const total = getNumeric(t.total_price);
            if (t.type === "buy") {
                quantity += q;
                totalInvested += total;
                lastBuyPrice = getNumeric(t.unit_price);
                if (!buyDate) buyDate = t.date;
            } else if (t.type === "sell") {
                quantity -= q;
                totalInvested -= total;
            }
        });

        // ارزش فعلی
        let currentValue = 0;
        let currentUnitPrice = 0;

        // اگر طلاست
        if (isGoldAsset(asset)) {
            currentUnitPrice = currentGoldPrice || 0;
            currentValue = quantity * currentUnitPrice;
        } else {
            // برای سایر دارایی‌ها از آخرین قیمت خرید استفاده می‌کنیم
            currentUnitPrice = lastBuyPrice;
            currentValue = quantity * currentUnitPrice;
        }

        const profit = currentValue - totalInvested;
        const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        // نام دارایی با ایموجی
        const assetEmoji = asset.type === 'gold' ? '🏅' : '💎';

        html += `
            <div class="capital-card" data-asset-id="${assetId}" style="
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 18px;
                padding: 14px 16px;
                transition: all 0.25s ease;
                position: relative;
                cursor: pointer;
            ">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-size:20px;">${assetEmoji}</span>
                            <span style="font-weight:700;font-size:15px;color:var(--text);">${escapeHtml(asset.name)}</span>
                            <span style="font-size:11px;color:var(--muted);background:var(--surface-2);padding:2px 8px;border-radius:6px;">
                                ${asset.type === 'gold' ? 'طلا' : 'سرمایه'}
                            </span>
                        </div>
                        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px;">
                            <span style="font-size:12px;color:var(--muted);">
                                وزن/تعداد: <strong style="color:var(--text);">${formatWeight(quantity)} ${escapeHtml(asset.unit || '')}</strong>
                            </span>
                            <span style="font-size:12px;color:var(--muted);">
                                ارزش فعلی: <strong style="color:var(--text);">${formatMoney(currentValue)}</strong>
                            </span>
                            ${profit !== 0 ? `
                                <span style="font-size:12px;color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                                    ${profit >= 0 ? '📈+' : '📉'} ${formatMoney(profit)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <button class="capital-eye-btn" data-asset-id="${assetId}" style="
                        background:var(--surface-2);
                        border:1px solid var(--border);
                        border-radius:50%;
                        width:40px;
                        height:40px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#fff;
                        cursor:pointer;
                        transition:all 0.2s ease;
                        flex-shrink:0;
                        font-size:18px;
                    ">
                        👁
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // رویداد کلیک روی دکمه چشم
    container.querySelectorAll('.capital-eye-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const assetId = this.dataset.assetId;
            openCapitalDetailsModal(assetId);
        });
    });

    // رویداد کلیک روی کل کارت
    container.querySelectorAll('.capital-card').forEach(card => {
        card.addEventListener('click', function() {
            const assetId = this.dataset.assetId;
            openCapitalDetailsModal(assetId);
        });
    });
}

// =========================================================
// ================= پاپ‌آپ جزئیات سرمایه =================
// =========================================================

/**
 * باز کردن مودال جزئیات سرمایه
 */
function openCapitalDetailsModal(assetId) {
    const asset = getAssetById(assetId);
    if (!asset) {
        showToast("دارایی پیدا نشد!", "error");
        return;
    }

    const transactions = allCapitalTransactions.filter(t => Number(t.asset_id) === Number(assetId));
    if (transactions.length === 0) {
        showToast("هیچ تراکنشی برای این دارایی ثبت نشده!", "error");
        return;
    }

    // محاسبات
    let quantity = 0;
    let totalInvested = 0;
    let totalQuantityBought = 0;
    let totalInvestedBought = 0;
    let lastBuyPrice = 0;
    let buyDate = null;

    transactions.forEach(t => {
        const q = getNumeric(t.quantity);
        const total = getNumeric(t.total_price);
        if (t.type === "buy") {
            quantity += q;
            totalInvested += total;
            totalQuantityBought += q;
            totalInvestedBought += total;
            lastBuyPrice = getNumeric(t.unit_price);
            if (!buyDate) buyDate = t.date;
        } else if (t.type === "sell") {
            quantity -= q;
            totalInvested -= total;
        }
    });

    // ===== تاریخ خرید از asset.created_at =====
    let buyDatePersian = 'نامشخص';
    if (asset.created_at) {
        try {
            const d = new Date(asset.created_at);
            if (!isNaN(d.getTime())) {
                buyDatePersian = d.toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch(e) {
            buyDatePersian = asset.created_at;
        }
    }

    const avgBuyPrice = totalQuantityBought > 0 ? totalInvestedBought / totalQuantityBought : 0;
    let currentUnitPrice = 0;
    let currentValue = 0;

    if (isGoldAsset(asset)) {
        currentUnitPrice = currentGoldPrice || lastBuyPrice;
        currentValue = quantity * currentUnitPrice;
    } else {
        currentUnitPrice = lastBuyPrice;
        currentValue = quantity * currentUnitPrice;
    }

    const totalBuyPrice = quantity * avgBuyPrice;
    const priceDiff = currentValue - totalBuyPrice;
    const priceDiffPercent = totalBuyPrice > 0 ? (priceDiff / totalBuyPrice) * 100 : 0;
    const profit = currentValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    const assetEmoji = asset.type === 'gold' ? '🏅' : '💎';
    const typeLabel = asset.type === 'gold' ? 'طلا' : 'سرمایه';

    const modal = document.getElementById("capitalDetailsModal");
    if (!modal) {
        createCapitalDetailsModal();
        setTimeout(() => openCapitalDetailsModal(assetId), 100);
        return;
    }

    const body = document.getElementById("capitalDetailsBody");
    const title = document.getElementById("capitalDetailsTitle");

    if (title) {
        title.textContent = `${assetEmoji} ${escapeHtml(asset.name)}`;
    }

    if (body) {
        body.innerHTML = `
            <div class="capital-detail-grid" style="display:grid;gap:10px;padding:4px 0;">
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">نوع دارایی</span>
                    <span style="font-weight:600;font-size:14px;">${typeLabel}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">وزن / تعداد</span>
                    <span style="font-weight:600;font-size:14px;">${formatWeight(quantity)} ${escapeHtml(asset.unit || '')}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">تاریخ خرید</span>
                    <span style="font-weight:600;font-size:14px;">${buyDatePersian}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">میانگین قیمت خرید</span>
                    <span style="font-weight:600;font-size:14px;color:var(--text);">${formatMoney(avgBuyPrice)}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">قیمت خرید کل</span>
                    <span style="font-weight:600;font-size:14px;color:var(--text);">${formatMoney(totalBuyPrice)}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="color:var(--muted);font-size:13px;">قیمت روز</span>
                    <span style="font-weight:600;font-size:14px;color:var(--text);">${formatMoney(currentValue)}</span>
                </div>
                <div class="capital-detail-item" style="display:flex;justify-content:space-between;padding:10px 0;background:rgba(255,255,255,0.03);border-radius:12px;margin-top:4px;padding:12px 14px;">
                    <span style="color:var(--muted);font-size:14px;font-weight:600;">سود / زیان</span>
                    <span style="font-weight:800;font-size:18px;color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${profit >= 0 ? '📈 +' : '📉 '}${formatMoney(Math.abs(profit))} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)
                    </span>
                </div>
            </div>
        `;
    }

   const editBtn = document.getElementById("capitalDetailsEditBtn");
if (editBtn) {
    editBtn.onclick = function() {
        closeCapitalDetailsModal();
        setTimeout(() => {
            // باز کردن مودال ویرایش با assetId
            openAssetTransactionModal(assetId);
        }, 200);
    };
}
    const closeBtn = document.getElementById("capitalDetailsCloseBtn");

    if (editBtn) {
        editBtn.onclick = function() {
            closeCapitalDetailsModal();
            setTimeout(() => {
                // باز کردن مودال خرید با assetId
                openAssetTransactionModal(assetId);
            }, 200);
        };
    }

    if (closeBtn) {
        closeBtn.onclick = closeCapitalDetailsModal;
    }

    const backdrop = modal.querySelector(".modal-backdrop");
    if (backdrop) {
        backdrop.onclick = closeCapitalDetailsModal;
    }

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
}

/**
 * بستن مودال جزئیات سرمایه
 */
function closeCapitalDetailsModal() {
    const modal = document.getElementById("capitalDetailsModal");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
}

/**
 * ساختن مودال جزئیات سرمایه (اگر وجود نداشت)
 */
function createCapitalDetailsModal() {
    if (document.getElementById("capitalDetailsModal")) return;

    const modal = document.createElement("div");
    modal.id = "capitalDetailsModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-sheet" style="padding-bottom:120px;">
            <div class="modal-handle"></div>
            <div class="modal-header">
                <h2 id="capitalDetailsTitle">جزئیات سرمایه</h2>
                <button class="close-modal" id="capitalDetailsCloseBtn">✕</button>
            </div>
            <div id="capitalDetailsBody" style="padding:4px 0;">
                <div style="text-align:center;padding:30px 0;color:var(--muted);">در حال بارگذاری...</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
                <button id="capitalDetailsEditBtn" style="
                    padding:12px;
                    border:1px solid var(--primary-light);
                    border-radius:12px;
                    background:transparent;
                    color:var(--primary-light);
                    font-weight:600;
                    font-size:14px;
                    cursor:pointer;
                    transition:all 0.2s;
                ">✎ ویرایش</button>
                <button id="capitalDetailsCloseBtn2" style="
                    padding:12px;
                    border:1px solid var(--border);
                    border-radius:12px;
                    background:var(--surface-2);
                    color:var(--text);
                    font-weight:600;
                    font-size:14px;
                    cursor:pointer;
                    transition:all 0.2s;
                " onclick="closeCapitalDetailsModal()">✕ بستن</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // دکمه بستن دوم
    const closeBtn2 = modal.querySelector("#capitalDetailsCloseBtn2");
    if (closeBtn2) {
        closeBtn2.addEventListener("click", closeCapitalDetailsModal);
    }

    // دکمه بستن اول
    const closeBtn = modal.querySelector("#capitalDetailsCloseBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeCapitalDetailsModal);
    }

    // کلیک روی پس‌زمینه
    const backdrop = modal.querySelector(".modal-backdrop");
    if (backdrop) {
        backdrop.addEventListener("click", closeCapitalDetailsModal);
    }
}

// =========================================================
// ================= اتصال به صفحه بانک‌ها =================
// =========================================================

/**
 * تابع جایگزین برای رندر کردن کارت‌های سرمایه در صفحه بانک‌ها
 * این تابع باید در renderBankCards یا هر جای دیگه‌ای که صفحه بانک‌ها رندر می‌شه، صدا زده بشه
 */
function renderCapitalSection() {
    // صبر می‌کنیم تا داده‌ها بارگذاری بشن
    if (!allCapitalTransactions || allCapitalTransactions.length === 0) {
        // اگر داده‌ها هنوز بارگذاری نشده، دوباره تلاش می‌کنیم
        setTimeout(() => {
            loadCapitalTransactions().then(() => {
                renderCapitalCards();
            });
        }, 500);
        return;
    }
    renderCapitalCards();
}

// =========================================================
// ================= پچ کردن renderBankCards =================
// =========================================================

// تابع اصلی renderBankCards رو نگه می‌داریم و بعد از اجراش، بخش سرمایه رو اضافه می‌کنیم
const originalRenderBankCards = window.renderBankCards;

if (originalRenderBankCards) {
    window.renderBankCards = function() {
        // اجرای تابع اصلی
        originalRenderBankCards.call(this);

        // اضافه کردن بخش سرمایه
        setTimeout(() => {
            // اطمینان از وجود container
            let container = document.getElementById("capitalCardsContainer");
            if (!container) {
                // اگر container وجود نداشت، بساز
                const banksPage = document.getElementById("banksPage");
                if (banksPage) {
                    // پیدا کردن جایی برای قرار دادن
                    const existingSection = banksPage.querySelector(".capital-section");
                    if (!existingSection) {
                        const section = document.createElement("div");
                        section.className = "capital-section";
                        section.style.cssText = "margin-top:16px;padding:0 4px;";
                        section.innerHTML = `
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;">
                                <span style="font-size:16px;font-weight:700;color:var(--text);">💰 سرمایه‌ها</span>
                                <button onclick="openAssetTransactionModal()" style="
                                    background:var(--primary);
                                    border:none;
                                    border-radius:10px;
                                    color:#fff;
                                    padding:6px 14px;
                                    font-size:12px;
                                    font-weight:600;
                                    cursor:pointer;
                                    transition:all 0.2s;
                                ">➕ جدید</button>
                            </div>
                            <div id="capitalCardsContainer"></div>
                        `;
                        banksPage.appendChild(section);
                        container = document.getElementById("capitalCardsContainer");
                    } else {
                        container = document.getElementById("capitalCardsContainer");
                    }
                }
            }

            if (container) {
                renderCapitalCards();
            }
        }, 200);
    };
}

// =========================================================
// ================= مقداردهی اولیه =================
// =========================================================

// وقتی صفحه بانک‌ها باز می‌شه، سرمایه‌ها رو نمایش بده
document.addEventListener("DOMContentLoaded", function() {
    // بعد از بارگذاری کامل
    setTimeout(() => {
        // اگر در صفحه بانک‌ها هستیم
        const banksPage = document.getElementById("banksPage");
        if (banksPage && banksPage.classList.contains("active")) {
            renderCapitalSection();
        }
    }, 1000);
});

// وقتی صفحه بانک‌ها با نویگیشن باز می‌شه
const originalOpenPage = window.openPage;
if (originalOpenPage) {
    window.openPage = function(id, title) {
        originalOpenPage.call(this, id, title);
        if (id === "banksPage") {
            setTimeout(renderCapitalSection, 300);
        }
    };
}


////-----تابع ویرایش دارایی
// =========================================================
// ================= ویرایش دارایی =================
// =========================================================

async function openEditAssetModal(assetId) {
    const asset = getAssetById(assetId);
    if (!asset) {
        showToast("دارایی پیدا نشد!", "error");
        return;
    }

    const modal = document.getElementById("assetTransactionModal");
    if (!modal) {
        showToast("مودال دارایی پیدا نشد!", "error");
        return;
    }

    modal.classList.add("open");
    document.body.style.overflow = "hidden";

    // تنظیم نوع تراکنش به خرید (برای ویرایش اطلاعات دارایی)
    document.getElementById("assetTransactionType").value = "buy";
    document.getElementById("assetBuyFields").style.display = "block";
    document.getElementById("assetSellFields").style.display = "none";
    document.getElementById("assetTransactionTitle").textContent = "✏️ ویرایش دارایی";
    document.getElementById("saveAssetTransactionBtn").textContent = "ذخیره تغییرات";

    // تنظیم دکمه‌های نوع تراکنش
    document.querySelectorAll(".asset-transaction-type").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.type === "buy");
    });

    // بارگذاری لیست دارایی‌ها
    await loadAssets();

    // انتخاب دارایی مورد نظر
    const select = document.getElementById("assetSelect");
    if (select) {
        select.value = asset.id;
        updateAssetUnitLabels();
    }

    // پیدا کردن آخرین تراکنش خرید این دارایی
    const lastBuyTransaction = allCapitalTransactions
        .filter(t => Number(t.asset_id) === Number(assetId) && t.type === "buy")
        .pop();

    // پر کردن مقادیر از دارایی و آخرین تراکنش
    if (lastBuyTransaction) {
        document.getElementById("assetBuyQuantity").value = lastBuyTransaction.quantity || "";
        document.getElementById("assetBuyTotalPrice").value = lastBuyTransaction.total_price || "";
        
        // تنظیم تاریخ از asset.created_at
        if (asset.created_at) {
            try {
                const d = new Date(asset.created_at);
                if (!isNaN(d.getTime())) {
                    const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    }).formatToParts(d);
                    
                    let year = '', day = '';
                    for (const part of persianDate) {
                        if (part.type === 'year') year = toEnglishDigits(part.value);
                        else if (part.type === 'day') day = toEnglishDigits(part.value);
                    }
                    
                    document.getElementById("assetBuyDay").value = day;
                    document.getElementById("assetBuyYear").value = year;
                }
            } catch(e) {
                console.warn("خطا در تنظیم تاریخ:", e);
            }
        }

        // تنظیم بانک
        if (lastBuyTransaction.bank) {
            const container = document.getElementById("assetBuyBanksContainer");
            if (container) {
                const btns = container.querySelectorAll('.asset-bank-btn');
                btns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.bank === lastBuyTransaction.bank);
                });
                selectedAssetBuyBank = lastBuyTransaction.bank;
            }
        }

        // تنظیم یادداشت
        document.getElementById("assetTransactionNote").value = lastBuyTransaction.note || "";
    } else {
        // اگر تراکنش خرید وجود نداشت، فقط تاریخ دارایی رو تنظیم کن
        if (asset.created_at) {
            try {
                const d = new Date(asset.created_at);
                if (!isNaN(d.getTime())) {
                    const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    }).formatToParts(d);
                    
                    let year = '', day = '';
                    for (const part of persianDate) {
                        if (part.type === 'year') year = toEnglishDigits(part.value);
                        else if (part.type === 'day') day = toEnglishDigits(part.value);
                    }
                    
                    document.getElementById("assetBuyDay").value = day;
                    document.getElementById("assetBuyYear").value = year;
                }
            } catch(e) {
                console.warn("خطا در تنظیم تاریخ:", e);
            }
        }
    }

    // ذخیره ID دارایی برای ویرایش
    const oldHidden = document.getElementById("editAssetId");
    if (oldHidden) oldHidden.remove();
    
    const hiddenId = document.createElement("input");
    hiddenId.type = "hidden";
    hiddenId.id = "editAssetId";
    hiddenId.value = asset.id;
    document.getElementById("assetTransactionForm").appendChild(hiddenId);

    // بروزرسانی قیمت طلا
    await fetchLiveGoldPrice({ silent: true });
    updateAllGoldUI();
}
// =========================================================
// نمایش قیمت دلار
// =========================================================

function updateUsdPriceDisplay() {
  const priceEl = document.getElementById("todayusdPrice");
  const timeEl = document.getElementById("usdPriceUpdateTime");

  if (priceEl) {
    priceEl.textContent = currentUsdPrice > 0
      ? formatMoney(currentUsdPrice)
      : "در حال دریافت…";
  }

  if (timeEl) {
    if (usdPriceLastUpdate) {
      timeEl.textContent = `آخرین بروزرسانی: ${usdPriceLastUpdate.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    } else {
      timeEl.textContent = "در حال دریافت…";
    }
  }
}

function updateModalUsdPrice() {
  const priceEl = document.getElementById("modalUsdPrice");
  const dateEl = document.getElementById("modalUsdPriceDate");

  if (priceEl) {
    priceEl.textContent = currentUsdPrice > 0
      ? formatMoney(currentUsdPrice)
      : "در حال دریافت…";
  }

  if (dateEl) {
    if (usdPriceLastUpdate) {
      dateEl.textContent = `آخرین بروزرسانی ${usdPriceLastUpdate.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    } else {
      dateEl.textContent = "-";
    }
  }
}

// =========================================================
// بازیابی کارت‌ها از localStorage در صورت ناپدید شدن
// =========================================================

function recoverBankCards() {
  try {
    const raw = localStorage.getItem('bankCardsV1');
    if (!raw) return false;
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    
    // فیلتر کردن کارت‌های معتبر
    const valid = parsed.filter(c => c && c.bankName && c.bankName.trim() !== '');
    
    if (valid.length > 0) {
      bankCards = valid;
      DataManager.saveBankCards(valid);
      renderBankCards();
      console.log('🔄 کارت‌ها بازیابی شدند:', valid.length);
      showToast(`✅ ${valid.length} کارت بازیابی شد`, 'success');
      return true;
    }
    return false;
  } catch (e) {
    console.error('❌ خطا در بازیابی کارت‌ها:', e);
    return false;
  }
}

// هر ۵ ثانیه یکبار چک کن که کارت‌ها ناپدید نشده باشند
setInterval(() => {
  if (bankCards.length === 0) {
    const saved = DataManager.getBankCards();
    if (saved && saved.length > 0) {
      console.warn('⚠️ کارت‌ها ناپدید شدند، بازیابی می‌شوند...');
      bankCards = saved;
      renderBankCards();
    }
  }
}, 5000);
// =========================================================
// پایان مدیریت سرمایه
// =========================================================
setTimeout(debugDateSelects, 2000);