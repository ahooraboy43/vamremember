const SUPABASE_URL = "https://yfgyauzuzznlhradsrbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A";
const TABLE_NAME="expenses";
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

function fillDebtDateSelects(){
  const daySel = $("debtDueDay"), monthSel = $("debtDueMonth");
  if(daySel && !daySel.options.length){
    for(let d=1; d<=31; d++){
      const op = document.createElement("option");
      op.value = d; op.textContent = d.toLocaleString("fa-IR");
      daySel.appendChild(op);
    }
  }
  if(monthSel && !monthSel.options.length){
    MONTHS.forEach(m=>{
      const op = document.createElement("option");
      op.value = m.key; op.textContent = m.name;
      monthSel.appendChild(op);
    });
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
    refreshButton = $("refresh"),
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

function closeModalEl(modalEl){
    modalEl.classList.remove("open");
    document.body.style.overflow="";
}

closeExpenseModal?.addEventListener("click", closeModal);

closeTransferModal?.addEventListener("click", () => {
  if (transferModal) {
    closeModalEl(transferModal);
  }
});

transferModal
  ?.querySelector(".modal-backdrop")
  ?.addEventListener("click", () => {
    closeModalEl(transferModal);
  });

expenseModal
  ?.querySelector(".modal-backdrop")
  ?.addEventListener("click", closeModal);

async function addTransaction(data){
    return await supabaseRequest(
        TRANSACTION_TABLE,
        {
            method:"POST",
            headers:{
                Prefer:"return=representation"
            },
            body:JSON.stringify(data)
        }
    );
}
function getHeaders(){return{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"}}
async function supabaseRequest(path,options={}){const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...getHeaders(),...(options.headers||{})}});const text=await response.text();if(!response.ok)throw new Error(text||`HTTP ${response.status}`);return text?JSON.parse(text):null}
function toEnglishDigits(value){return String(value).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))}
function getPersianDateParts(){const parts=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date()),v={};for(const p of parts)if(["year","month","day"].includes(p.type))v[p.type]=Number(toEnglishDigits(p.value));return v}
function updatePersianDate(){todayElement.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date());const p=getPersianDateParts();currentMonthIndex=p.month-1;currentMonthKey=MONTHS[currentMonthIndex].key}
function isInstallment(i){
    return i.type==="installment" || Number(i.id)<10000;
}
const DEFAULT_BANKS = ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];

let banks;
try {
  const saved = localStorage.getItem("banks");
  banks = saved ? JSON.parse(saved) : [...DEFAULT_BANKS];
} catch {
  banks = [...DEFAULT_BANKS];
}


function saveBanks() {
  localStorage.setItem("banks", JSON.stringify(banks));
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
  container.innerHTML = banks.map(b =>
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
  banks.push(name);
  saveBanks();
  renderBanks();
  renderPaymentBanks();
  input.value = "";
});

renderBanks();
renderPaymentBanks();

function isExpense(i){
    const id=Number(i.id);
    return i.type==="expense" || (id>=10000 && id<20000);
}

function isIncome(i){
    const id=Number(i.id);
    return i.type==="income" || (id>=20000 && id<30000);
}
function isNullValue(v){return v===null||v===undefined||v===""}
function isClosedValue(v){return String(v||"").trim().toUpperCase()==="CLOSE"}
function isPaidValue(v){return !isNullValue(v)&&!isClosedValue(v)}
function formatMoney(v){return Number(v||0).toLocaleString("fa-IR")+" ریال"}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function getCurrentPersianDay(){return getPersianDateParts().day}
function parseMoney(v){
    if(isNullValue(v) || isClosedValue(v)) return null;
    const n = Number(String(v).split(/\s*-\s*/)[0].replace(/[,\s٬]/g,""));
    return Number.isFinite(n) ? n : null;
}
function getRemainingInstallments(item){
    if (!isInstallment(item)) return 0;

    return Number(item.installment_count || 0);
}

function getPaidCount(item){let n=0;for(const m of MONTHS)if(isPaidValue(item[m.key]))n++;return n}
function getLatestExpenseAmount(item){for(let i=currentMonthIndex;i>=0;i--){const n=parseMoney(item[MONTHS[i].key]);if(n!==null)return n}for(let i=MONTHS.length-1;i>currentMonthIndex;i--){const n=parseMoney(item[MONTHS[i].key]);if(n!==null)return n}return Number(item.amount||0)}
function getExpenseTotal(item){let total=0;for(const m of MONTHS){const n=parseMoney(item[m.key]);if(n!==null)total+=n}return total}
function extractPaymentDate(v){if(!isPaidValue(v))return "";const s=String(v);const matches=s.match(/[۰-۹0-9]{4}[\/\-][۰-۹0-9]{1,2}[\/\-][۰-۹0-9]{1,2}/g);return matches?.at(-1)||s}
function currentStatus(item){const v=item[currentMonthKey];if(isClosedValue(v))return"بسته";return isPaidValue(v)?"پرداخت‌شده":"پرداخت‌نشده"}

async function loadData(){

    refreshButton.disabled=true;

    statusBox.textContent="در حال دریافت اطلاعات…";
    allStatus.textContent="در حال دریافت اطلاعات…";

    try{

        const data = await supabaseRequest(
            `${TABLE_NAME}?select=*&order=id.asc`
        );

        allExpenses = Array.isArray(data) ? data : [];
        loadIncomeOptions();
        visibleCount = PAGE_SIZE;

        renderDueCards();
        renderAllCards();
        renderReports();
        renderHome();

        statusBox.textContent =
        `${allExpenses.length.toLocaleString("fa-IR")} مورد دریافت شد`;

        allStatus.textContent =
        `${allExpenses.length.toLocaleString("fa-IR")} مورد موجود است`;

    }
    catch(e){

        console.error(e);

        statusBox.textContent =
        `خطا در دریافت اطلاعات: ${e.message}`;

        allStatus.textContent =
        `خطا در دریافت اطلاعات: ${e.message}`;

    }
    finally{

        refreshButton.disabled=false;

    }
}
function getDaysInPersianMonth(monthIndex){
    if(monthIndex <= 5) return 31;   // فروردین تا شهریور
    if(monthIndex <= 10) return 30;  // مهر تا بهمن
    return 29;                        // اسفند
}

function getDueItems(){
    const today = getCurrentPersianDay();
    const daysInCurrentMonth = getDaysInPersianMonth(currentMonthIndex);

    return allExpenses
        .filter(isInstallment)
        .filter(i =>
            Number.isFinite(Number(i.due_day)) &&
            Number(i.due_day) > 0
        )
        .map(i => {
            const dueDay = Number(i.due_day);
            let diff = dueDay - today;
            let targetMonthIndex = currentMonthIndex;

            if(diff < 0){
                diff += daysInCurrentMonth;
                targetMonthIndex = (currentMonthIndex + 1) % 12;
            }

            return {
                ...i,
                daysRemaining: diff,
                targetMonthKey: MONTHS[targetMonthIndex].key
            };
        })
        .filter(i =>
            isNullValue(i[i.targetMonthKey]) &&
            i.daysRemaining <= 7
        )
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
function renderDueCards(){const items=getDueItems();cards.innerHTML="";if(!items.length){cards.innerHTML='<div class="empty">قسط سررسیدشده یا نزدیک به سررسید وجود ندارد</div>';return}items.forEach(i=>cards.appendChild(createDueCard(i)))}
function setupPaymentPanel(card, item){
    const save    = card.querySelector(".save-payment");
    const cancel  = card.querySelector(".cancel-payment");
    const noteBox = card.querySelector(".payment-note");
    const addDate = card.querySelector(".add-date");
    const confirm = card.querySelector(".confirm-payment");
    let selectedBank = null;

    setupButtonGroup(card, ".bank-tag", btn => {
        selectedBank = btn.dataset.bank;
        let text = noteBox.value;
        (JSON.parse(localStorage.getItem('banks')||'[]'))
        .forEach(b => { text = text.replace(b, ""); });
        text = text.replace(/^\s*-\s*/, "").trim();
        noteBox.value = btn.dataset.bank + (text ? " - " + text : "-");
    });

    cancel.addEventListener("click", () => card.classList.remove("open"));

   save.addEventListener("click", async () => {
    if(!confirm.checked) return alert("لطفاً پرداخت را تأیید کنید");

    const p = getPersianDateParts();
    const dateStr = addDate.checked
        ? `${p.year}/${String(p.month).padStart(2,"0")}/${String(p.day).padStart(2,"0")}`
        : null;

    const note = noteBox.value.trim() || null;

    // مبلغ اصلاً وارد سلول نمی‌شود، فقط note و date
    const cellValue = [note, dateStr]
        .filter(Boolean)
        .join(" - ");

    try {
        await supabaseRequest(
            `${TABLE_NAME}?id=eq.${item.id}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({ [currentMonthKey]: cellValue })
            }
        );

        await registerPaymentTransaction(item, note, selectedBank);

        // پرداخت قسط: تعداد اقساط باقی‌مانده یک واحد کم می‌شود.
        const currentRemaining = Number(item.installment_count);
        if (Number.isFinite(currentRemaining) && currentRemaining > 0) {
            await supabaseRequest(
                `${TABLE_NAME}?id=eq.${item.id}`,
                {
                    method: "PATCH",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify({
                        installment_count: Math.max(0, currentRemaining - 1)
                    })
                }
            );
        }

        card.classList.remove("open");
        await loadData();
    } catch(e) {
        alert("خطا در ثبت پرداخت");
    }
});

}

function setupButtonGroup(parent, selector, callback){

    parent.querySelectorAll(selector).forEach(btn=>{

        btn.addEventListener("click",()=>{

            parent.querySelectorAll(selector)
                .forEach(b=>b.classList.remove("active"));

            btn.classList.add("active");

            if(callback){
                callback(btn);
            }

        });

    });

}
function createDueCard(item){const card=document.createElement("article");card.className="card "+(item.daysRemaining<0?"overdue":"soon");const dayText=item.daysRemaining<0?`${Math.abs(item.daysRemaining).toLocaleString("fa-IR")} روز گذشته`:item.daysRemaining===0?"امروز":`${item.daysRemaining.toLocaleString("fa-IR")} روز مانده`;card.innerHTML=`<div class="card-main"><div class="name">${escapeHtml(item.title)}</div><div class="top"><div class="days">${dayText}</div><div class="installment-badge">${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی مانده</div></div><div class="amount">${formatMoney(item.amount)}</div><div class="meta">سررسید: روز ${Number(item.due_day).toLocaleString("fa-IR")}ام</div></div>${createPaymentPanelHtml()}`;card.querySelector(".card-main").addEventListener("click",()=>{document.querySelectorAll("#cards .card.open").forEach(c=>{if(c!==card)c.classList.remove("open")});card.classList.toggle("open")});setupPaymentPanel(card,item);return card}
function createPaymentPanelHtml(){
  
return`
<div class="payment-panel">

<div class="payment-title">ثبت پرداخت</div>

<textarea class="payment-note" placeholder="توضیح پرداخت..."></textarea>

<div class="quick-tags">
  ${(JSON.parse(localStorage.getItem('banks')||'[]')).map(b=>`<button type="button" class="tag-btn bank-tag" data-bank="${b}">${b}</button>`).join('')}
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
async function registerPaymentTransaction(item, note, account, date){

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

    if (activeFilter === "installment" && !isInstallment(i)) {
      return false;
    }

    if (activeFilter === "expense" && !isExpense(i)) {
      return false;
    }
    if (activeFilter === "income" && !isIncome(i)) {
    return false;
    }

    if(activeStatusFilter==="paid" && !isPaidValue(i[currentMonthKey])){
      return false;
    }

    if(activeStatusFilter==="unpaid" && !isNullValue(i[currentMonthKey])){
      return false;
    }

    // بدون متن جستجو
    if (!s) {
      return true;
    }

    // جستجو
    return (
      String(i.title || "").toLowerCase().includes(s) ||
      String(i.id || "").includes(s) ||
      String(i.note || "").toLowerCase().includes(s)
    );
  });
}function renderAllCards(){const filtered=getFilteredItems(),items=filtered.slice(0,visibleCount);allCards.innerHTML="";if(!items.length){allCards.innerHTML='<div class="empty">موردی پیدا نشد</div>';loadMoreButton.classList.add("hidden");allStatus.textContent="۰ مورد نمایش داده می‌شود";return}items.forEach(i=>allCards.appendChild(createAllItemCard(i)));loadMoreButton.classList.toggle("hidden",visibleCount>=filtered.length);allStatus.textContent=`${filtered.length.toLocaleString("fa-IR")} مورد نمایش داده می‌شود`}
function createAllItemCard(item){
 const expense=isExpense(item);
const income=isIncome(item);
const usesMonthlyAmounts=expense||income;
const card=document.createElement("article");
const v=item[currentMonthKey];
  const cardTypeClass=expense?"expense-card":income?"income-card":(isPaidValue(v)?"paid-card":"");
  card.className=`card compact-card ${cardTypeClass}`;
  const mainAmount=usesMonthlyAmounts?getLatestExpenseAmount(item):Number(item.amount||0);
  const secondary=usesMonthlyAmounts?`جمع کل: ${formatMoney(getExpenseTotal(item))}`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} مانده`;
  const counter=usesMonthlyAmounts?`${getPaidCount(item).toLocaleString("fa-IR")} ${income?"دریافت":"پرداخت"}`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی‌مانده`;
  const amountPrefix=income?"+ ":"";
  card.innerHTML=`<div class="card-main compact-main">
    <div class="compact-head"><div class="compact-amount-wrap"><div class="amount compact-amount ${income?"income-amount":""}">${amountPrefix}${formatMoney(mainAmount)}</div></div><div class="compact-side">${counter}</div><div class="id-badge">ID ${Number(item.id).toLocaleString("fa-IR")}</div></div>
    <div class="compact-foot"><div class="compact-title">${escapeHtml(item.title)}</div><div class="badge-row">
    <span class="${
expense
?"expense-badge"
:income
?"income-badge"
:"installment-badge"
}">
${
expense
?"🧾 هزینه"
:income
?"💰 درآمد"
:"💳 قسط"
}
</span>
    <span class="status-badge">${income?(isPaidValue(v)?"دریافت‌شده":"دریافت‌نشده"):currentStatus(item)}</span></div></div>
    <div class="all-card-actions"><button type="button" class="edit-expense">ویرایش</button></div>
  </div>`;
  card.querySelector(".edit-expense").addEventListener("click",e=>{e.stopPropagation();openEditModal(item)});return card
}
function getExpenseAmount(item){return getLatestExpenseAmount(item)}
function setExpenseType(type){

    expenseType.value = type;

    const amountField = expenseAmount.closest(".field");
    if(amountField){
        amountField.classList.toggle(
            "hidden",
            type === "expense" || type === "income"
        );
    }

    // فعال کردن دکمه نوع
    installmentTypeButton?.classList.toggle(
        "active",
        type === "installment"
    );

    expenseTypeButton?.classList.toggle(
        "active",
        type === "expense"
    );

    incomeTypeButton?.classList.toggle(
        "active",
        type === "income"
    );

    transferTypeButton?.classList.toggle(
        "active",
        type === "transfer"
    );

    // نمایش فرم مربوطه
    installmentFields?.classList.toggle(
        "hidden",
        type !== "installment"
    );

    expenseFields?.classList.toggle(
    "hidden",
    type !== "expense"
);
$("debtTypeButton")?.classList.toggle("active", type === "debt");
$("debtFields")?.classList.toggle("hidden", type !== "debt");
incomeFields?.classList.toggle(
    "hidden",
    type !== "income"
);

    transferFields?.classList.toggle(
        "hidden",
        type !== "transfer"
    );

    // عنوان‌ها
    switch(type){

        case "installment":

expenseTitleLabel.textContent="عنوان قسط";

expenseTitle.classList.remove("hidden");
expenseTitleSelect.classList.add("hidden");
    expenseTitle.placeholder="مثلا وام ازدواج، ویپاد";
startMonthLabel.textContent="ماه شروع";

break;
case "debt":
    fillDebtDateSelects();
    expenseTitleLabel.textContent = "توضیح (اختیاری)";
    expenseTitle.placeholder = "توضیح دلخواه";
    if(!editExpenseId.value && !editingDebtId){
        $("debtDueDay").value = getCurrentPersianDay();
        $("debtDueMonth").value = currentMonthKey;
        $("debtDueYear").value = getPersianDateParts().year;
    }
    break;
case "expense":

expenseTitleLabel.textContent="عنوان هزینه";

expenseTitle.classList.remove("hidden");
expenseTitle.placeholder="مثلا کارواش یا عمومی";
startMonthLabel.textContent="ماه هزینه";

break;

case "income":

    expenseTitleLabel.textContent="عنوان درآمد";
    expenseTitle.placeholder="مثلا حقوق، فروش، سود";
    startMonthLabel.textContent="ماه درآمد";
    break;

case "transfer":

    expenseTitleLabel.textContent="شرح انتقال";
    expenseTitle.placeholder="مثلا انتقال از ملی به رفاه";
    startMonthLabel.textContent="تاریخ انتقال";
    break;

    }

    // اجباری بودن فیلدهای قسط
    expenseDueDay.required = false;
expenseInstallments.required = false;

    // متن دکمه ثبت
    if(editExpenseId.value){

        saveExpenseButton.textContent="ذخیره تغییرات";

    }
    else{

        switch(type){

            case "installment":
                saveExpenseButton.textContent="ثبت قسط";
                break;
                case "debt":
    saveExpenseButton.textContent = "ثبت قرض/دین";
    break;

            case "expense":
                saveExpenseButton.textContent="ثبت هزینه";
                break;

            case "income":
                saveExpenseButton.textContent="ثبت درآمد";
                break;

            case "transfer":
                saveExpenseButton.textContent="ثبت انتقال";
                break;

        }

    }

 // کلاس ظاهری فرم
    const sheet = document.querySelector(".modal-sheet");

    if(sheet){

        sheet.classList.remove(
            "form-income",
            "form-expense",
            "form-installment",
            "form-transfer"
        );

        sheet.classList.add(
            "form-" + type
        );

    }

}
fabCreate.onclick = ()=>{
    openWithType("expense");

};

const paymentModal = $("paymentModal");
const closePaymentModal = $("closePaymentModal");
let selectedPaymentBank = null;

function monthKeyFromDatePart(dateStr){
    const cleaned = toEnglishDigits(dateStr||"").trim();
    const parts = cleaned.split(/[\/\-]/);
    if(parts.length < 2) return null;
    const mm = parseInt(parts[1], 10);
    if(!Number.isFinite(mm) || mm < 1 || mm > 12) return null;
    return MONTHS[mm-1].key;
}

async function updateAccountCellFromPayment(itemId, monthKey, amount){
    if(!itemId || !monthKey) return;

    // مقدار فعلی سلول را پیدا می‌کنیم تا مبلغ جدید به آن اضافه شود، نه جایگزین آن
    const item = allExpenses.find(i => Number(i.id) === Number(itemId));
    const existing = item ? parseMoney(item[monthKey]) : null;
    const total = (existing || 0) + amount;

    await supabaseRequest(
        `${TABLE_NAME}?id=eq.${itemId}`,
        {
            method:"PATCH",
            headers:{ Prefer:"return=representation" },
            body: JSON.stringify({ [monthKey]: total })
        }
    );
}

// تغییر حالت پرداخت / دریافت در مودال
document.querySelectorAll(".payment-type-btn")
.forEach(btn => {

    btn.addEventListener("click",()=>{

        // فعال کردن دکمه انتخاب شده
        document.querySelectorAll(".payment-type-btn")
        .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        const type = btn.dataset.type;

        // ذخیره نوع عملیات
        $("paymentType").value = type;
        fillPaymentItems(type);

        // تغییر عنوان مودال
        $("paymentModalTitle").textContent =
            type === "income" ? "ثبت دریافت" : "ثبت پرداخت";

    });

});

// انتخاب بانک/حساب
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
    const date = $("paymentDate").value;
    const note = $("paymentNote").value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if(!itemId){ alert("حساب را انتخاب کنید."); return; }
    if(!Number.isFinite(amount) || amount<=0){ alert("مبلغ معتبر نیست."); return; }
    if(!selectedPaymentBank){ alert("بانک را انتخاب کنید."); return; }

    const monthKey = monthKeyFromDatePart(date) || currentMonthKey;

    if(submitBtn) submitBtn.disabled = true;

    try{
        // ابتدا خود تراکنش (پرداخت/دریافت) ثبت می‌شود؛ این مهم‌ترین بخش است
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

        // سپس سلول مربوط به ماه/حساب مورد نظر آپدیت می‌شود
        try{
            await updateAccountCellFromPayment(itemId, monthKey, amount);
        }catch(cellErr){
            console.error("خطا در بروزرسانی سلول ماه:", cellErr);
            alert("تراکنش ثبت شد اما بروزرسانی جدول با خطا مواجه شد:\n"+cellErr.message);
        }

        paymentModal.classList.remove("open");
        document.body.style.overflow = "";
        e.target.reset();
        selectedPaymentBank = null;
        document.querySelectorAll(".payment-bank").forEach(b => b.classList.remove("active"));

        await loadData();
    }catch(err){
        console.error("خطا در ثبت تراکنش:", err);
        alert("خطا در ثبت:\n"+err.message);
    }finally{
        if(submitBtn) submitBtn.disabled = false;
    }
});

fabPayment.onclick = ()=>{

    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
    addExpenseButton.classList.remove("active");

    paymentModal.classList.add("open");
    fillPaymentItems($("paymentType").value || "payment");
    document.body.style.overflow="hidden";

    const p = getPersianDateParts();
    $("paymentDate").value =
        `${p.year}/${String(p.month).padStart(2,"0")}/${String(p.day).padStart(2,"0")}`;

};

closePaymentModal.onclick = ()=>closeModalEl(paymentModal);

paymentModal.querySelector(".modal-backdrop").addEventListener("click", ()=>closeModalEl(paymentModal));

fabTransfer.onclick = ()=>{

    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
    addExpenseButton.classList.remove("active");

    transferModal.classList.add("open");
    document.body.style.overflow="hidden";

};
function closeModal(){expenseModal.classList.remove("open");document.body.style.overflow=""}
function resetExpenseForm(){editingDebtId = null;expenseForm.reset();editExpenseId.value="";monthsEditor.classList.add("hidden");monthFields.innerHTML="";expenseStartMonth.value=currentMonthKey;expenseModalTitle.textContent="ثبت مورد جدید";setExpenseType("installment")}
function openNewModal(){resetExpenseForm();openModal()}
function openEditModal(item){
  resetExpenseForm();

  editExpenseId.value=item.id;
  expenseTitle.value=item.title||"";
  expenseNote.value=item.note||"";

 const type =
    isExpense(item)
    ?"expense"
    :isIncome(item)
    ?"income"
    :"installment";

  setExpenseType(type);

  if(type==="installment"){
    expenseAmount.value=item.amount ?? "";
    expenseDueDay.value=item.due_day ?? "";
    expenseInstallments.value=item.installment_count ?? "";
  }
  else{
    expenseAmount.value=getExpenseAmount(item);
  }

  expenseStartMonth.value=findStartMonth(item);

  expenseModalTitle.textContent =
    type==="installment"
    ?"ویرایش قسط"
    :type==="expense"
    ?"ویرایش هزینه"
    :"ویرایش درآمد";

  buildMonthEditor(item);
  monthsEditor.classList.remove("hidden");

  saveExpenseButton.textContent="ذخیره تغییرات";

  openModal();
}
function findStartMonth(item){for(const m of MONTHS)if(!isClosedValue(item[m.key]))return m.key;return currentMonthKey}
function buildMonthEditor(item){monthFields.innerHTML="";for(const m of MONTHS){const w=document.createElement("div");w.className="month-field";w.innerHTML=`<label>${m.name}</label><input type="text" data-month="${m.key}" value="${escapeHtml(item[m.key]??"")}" placeholder="NULL / CLOSE / مقدار پرداخت">`;monthFields.appendChild(w)}}
function getNextId(type){

    let min,max;

    switch(type){

        case "installment":
            min=1;
            max=9999;
            break;

        case "expense":
            min=10000;
            max=19999;
            break;

        case "income":
            min=20000;
            max=29999;
            break;

        default:
            return null;
    }

    const ids = allExpenses
        .map(x=>Number(x.id))
        .filter(id=>id>=min && id<=max);

    return ids.length
        ? Math.max(...ids)+1
        : min;
}
function fillPaymentItems(type) {
    const sel = $("paymentItemSelect");
    if (!sel) return;
    sel.innerHTML = '<option value="">انتخاب کنید</option>';
    const rangeStart = type === "payment" ? 10000 : 20000;
    const rangeEnd   = type === "payment" ? 20000 : 30000;
    allExpenses
        .filter(i => Number(i.id) >= rangeStart && Number(i.id) < rangeEnd)
        .forEach(item => {
            const op = document.createElement("option");
            op.value = item.id;
            op.textContent = item.title;
            sel.appendChild(op);
        });

    const label = $("paymentItemLabel");
    if(label){
        label.textContent = type === "income" ? "انتخاب حساب درآمد" : "انتخاب حساب هزینه";
    }
}

async function saveExpense(e){

    e.preventDefault();

    const type = expenseType.value;
    if(type === "debt"){
    const counterparty = $("debtCounterparty").value.trim();
    const amount = Number(expenseAmount.value);
    const day = Number($("debtDueDay").value);
    const month = $("debtDueMonth").value;
    const year = Number($("debtDueYear").value);
    const direction = $("debtDirection").value || "lent";

    if(!counterparty){ alert("نام طرف حساب را وارد کنید."); return; }
    if(!Number.isFinite(amount) || amount <= 0){ alert("مبلغ معتبر نیست."); return; }
    if(!Number.isFinite(day) || day < 1 || day > 31){ alert("روز موعد تسویه معتبر نیست."); return; }
    if(!month){ alert("ماه موعد تسویه را انتخاب کنید."); return; }
    if(!Number.isFinite(year) || year < 1300){ alert("سال معتبر نیست."); return; }

    const body = {
        direction, counterparty, amount,
        due_day: day, due_month: month, due_year: year,
        note: expenseTitle.value.trim() || null
    };

    saveExpenseButton.disabled = true;
    try{
        const debtPath = editingDebtId
  ? `${DEBT_TABLE}?id=eq.${encodeURIComponent(editingDebtId)}`
  : DEBT_TABLE;

console.log("Saving debt:", {
  editingDebtId,
  method: editingDebtId ? "PATCH" : "POST",
  path: debtPath,
  body
});

const result = await supabaseRequest(
  debtPath,
  {
    method: editingDebtId ? "PATCH" : "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  }
);

console.log("Save debt result:", result);

if(editingDebtId && Array.isArray(result) && result.length === 0){
  alert("ویرایش انجام نشد؛ رکوردی با این شناسه پیدا نشد.");
  console.error("PATCH بدون نتیجه:", editingDebtId, result);
  return;
}

closeModal();
await loadDebts();

    }catch(err){
        alert("خطا:\n"+err.message);
    }finally{
        saveExpenseButton.disabled = false;
        
    }
    return;
}

    // انتقال وجه
    if(type==="transfer"){

        if(!transferFrom.value || !transferTo.value){
            alert("حساب مبدا و مقصد را انتخاب کنید.");
            return;
        }

        if(transferFrom.value===transferTo.value){
            alert("مبدا و مقصد نمی‌توانند یکسان باشند.");
            return;
        }

       const amount = Number(expenseAmount.value);

if(type !== "expense" && type !== "income"){
    if(!Number.isFinite(amount) || amount < 0){
        alert("مبلغ معتبر نیست.");
        return;
    }
}

        saveExpenseButton.disabled=true;

        try{

            await addTransaction({
                expense_id:null,
                title:expenseTitle.value.trim() || "انتقال وجه",
                amount:amount,
                type:"transfer",
                account:null,
                from_account:transferFrom.value,
                to_account:transferTo.value,
                transaction_date:new Date().toISOString(),
                note:expenseNote.value.trim() || null
            });

            closeModal();

            alert("انتقال ثبت شد.");

        }catch(err){

            alert(err.message);

        }finally{

            saveExpenseButton.disabled=false;

        }

        return;
    }

    const editingId =
        editExpenseId.value
        ? Number(editExpenseId.value)
        : null;

    const title = expenseTitle.value.trim();

    const amount =
        Number(expenseAmount.value);

    if(!title){
        alert("عنوان را وارد کنید.");
        return;
    }

    if(type !== "transfer"){
    if(!Number.isFinite(amount) || amount < 0){
        alert("مبلغ معتبر نیست.");
        return;
    }
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


    saveExpenseButton.disabled=true;
    saveExpenseButton.textContent="در حال ذخیره...";

    try{

        let body =
            editingId
            ? buildEditBody(type)
            : buildNewBody(type);

        if(!editingId){
            body.id=getNextId(type);
        }

        await supabaseRequest(
            editingId
            ? `${TABLE_NAME}?id=eq.${editingId}`
            : TABLE_NAME,
            {
                method:editingId?"PATCH":"POST",
                headers:{
                    Prefer:"return=representation"
                },
                body:JSON.stringify(body)
            }
        );
        if(type === "income"){
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

    }catch(err){

        alert("خطا:\n"+err.message);

    }finally{

        saveExpenseButton.disabled=false;

        setExpenseType(expenseType.value);

    }

}
function buildNewBody(type){
  const idx=MONTHS.findIndex(m=>m.key===expenseStartMonth.value);

const body={
    type:type,
    title:expenseTitle.value.trim(),
    note:expenseNote.value.trim()||null
};
  if(type==="installment"){body.amount=Number(expenseAmount.value);body.due_day=expenseDueDay.value.trim()==="" ? null : Number(expenseDueDay.value);body.installment_count=expenseInstallments.value.trim()==="" ? null : Number(expenseInstallments.value);MONTHS.forEach((m,i)=>body[m.key]=i<idx?"CLOSE":null)}
else if(type==="expense" || type==="income"){

    body.amount=null;
    body.due_day=null;
    body.installment_count=null;

    MONTHS.forEach((m,i)=>
        body[m.key]=
        i<idx
        ?"CLOSE"
        :i===idx
        ?Number(expenseAmount.value)
        :null
    );
}

return body}
function buildEditBody(type){

  const body={
    title:expenseTitle.value.trim(),
    note:expenseNote.value.trim()||null
  };

  if(type==="installment"){
    body.amount=Number(expenseAmount.value);
    body.due_day=Number(expenseDueDay.value);
    body.installment_count=Number(expenseInstallments.value);
  }
  else{
    body.amount=null;
    body.due_day=null;
    body.installment_count=null;
  }

  monthFields.querySelectorAll("[data-month]")
  .forEach(input=>{
    body[input.dataset.month]=
      input.value.trim()===""
      ?null
      :input.value.trim();
  });

  return body;
}
function getReportItems(kind){
  const installments=allExpenses.filter(isInstallment),expenses=allExpenses.filter(isExpense),incomes=allExpenses.filter(isIncome);
  if(kind==="month")return installments.filter(i=>!isClosedValue(i[currentMonthKey]));
  if(kind==="paid")return installments.filter(i=>isPaidValue(i[currentMonthKey]));
  if(kind==="remaining")return installments.filter(i=>isNullValue(i[currentMonthKey]));
  if(kind==="expenses")return expenses.filter(i=>parseMoney(i[currentMonthKey])!==null);
  if(kind==="income")return incomes.filter(i=>parseMoney(i[currentMonthKey])!==null);
  if(kind==="all")return [...installments.filter(i=>isPaidValue(i[currentMonthKey])),...expenses.filter(i=>isPaidValue(i[currentMonthKey]))];
  return[];
}
function renderHome(){

const today=getCurrentPersianDay();

const overdue =
allExpenses.filter(i=>
    isInstallment(i)
    &&
    isNullValue(i[currentMonthKey])
    &&
    Number(i.due_day)<today
).length;

const soon=getDueItems().length;

let paid=0;
let expense=0;

allExpenses.forEach(i=>{

// پرداخت اقساط این ماه
if(
    isInstallment(i)
    &&
    isPaidValue(i[currentMonthKey])
){
    paid += Number(i.amount)||0;
}

// هزینه های ماه
if(isExpense(i)){

    const value=parseMoney(i[currentMonthKey]);

    if(value!==null){
        expense+=value;
    }

}

});

$("homeOverdue").textContent=
overdue.toLocaleString("fa-IR");

$("homeSoon").textContent=
soon.toLocaleString("fa-IR");

$("homePaid").textContent=
formatMoney(paid);

$("homeExpense").textContent=
formatMoney(expense);

}
function openReportDetails(kind){
  const titles={month:"اقساط این ماه",paid:"اقساط پرداخت‌شده",remaining:"اقساط باقی‌مانده",expenses:"هزینه‌های این ماه",income:"درآمدهای این ماه",all:"جمع کل پرداختی"};
  const items=getReportItems(kind);reportDetailsTitle.textContent=titles[kind]||"جزئیات گزارش";reportDetailsList.innerHTML="";
  if(!items.length){reportDetailsList.innerHTML='<div class="empty">موردی وجود ندارد</div>'}
  items.forEach(item=>{
    const expense=isExpense(item),income=isIncome(item),paid=isPaidValue(item[currentMonthKey]),row=document.createElement("article");row.className="report-detail-item";
    let detail="";
    if(expense||income)detail=`<span>${formatMoney(parseMoney(item[currentMonthKey])||0)}</span><span>${income?"دریافت شده":"پرداخت شده"}</span>`;
    else if(paid)detail=`<span>${formatMoney(item.amount)}</span><span>تاریخ پرداخت: ${escapeHtml(extractPaymentDate(item[currentMonthKey]))}</span>`;
    else detail=`<span>${formatMoney(item.amount)}</span><span>سررسید: روز ${Number(item.due_day||0).toLocaleString("fa-IR")}ام</span>`;
    row.innerHTML=`<div class="report-detail-title">${escapeHtml(item.title)}</div><div class="report-detail-meta">${detail}</div>`;reportDetailsList.appendChild(row)
  });
  reportDetailsModal.classList.add("open");document.body.style.overflow="hidden"
}
function closeReportModal(){reportDetailsModal.classList.remove("open");document.body.style.overflow=""}

function renderReports(){
  const installments=allExpenses.filter(isInstallment),
        expenses=allExpenses.filter(isExpense),
        incomes=allExpenses.filter(isIncome);

  let monthInstallmentTotal=0,
      paidInstallmentTotal=0,
      remainingInstallmentTotal=0,
      monthExpenseTotal=0,
      monthIncomeTotal=0;

  for(const item of installments){
    const currentValue=item[currentMonthKey],
          amount=Number(item.amount||0);

    if(isClosedValue(currentValue))continue;

    monthInstallmentTotal+=amount;

    if(isPaidValue(currentValue))paidInstallmentTotal+=amount;
    if(isNullValue(currentValue))remainingInstallmentTotal+=amount;
  }

  for(const item of expenses){
    const amount=parseMoney(item[currentMonthKey]);
    if(amount!==null)monthExpenseTotal+=amount;
  }

  for(const item of incomes){
    const amount=parseMoney(item[currentMonthKey]);
    if(amount!==null)monthIncomeTotal+=amount;
  }

  const allPaidTotal=paidInstallmentTotal+monthExpenseTotal;
  const balanceTotal=monthIncomeTotal-allPaidTotal;

  reportMonthTotal.textContent=formatMoney(monthInstallmentTotal);
  reportPaidTotal.textContent=formatMoney(paidInstallmentTotal);
  reportRemainingTotal.textContent=formatMoney(remainingInstallmentTotal);
  reportExpensesTotal.textContent=formatMoney(monthExpenseTotal);
  reportAllTotal.textContent=formatMoney(allPaidTotal);

  if(reportIncomeTotal)reportIncomeTotal.textContent=formatMoney(monthIncomeTotal);

  if(reportBalanceTotal){
    reportBalanceTotal.textContent=(balanceTotal<0?"− ":"")+formatMoney(Math.abs(balanceTotal));
    reportBalanceTotal.style.color=balanceTotal<0?"var(--danger)":"var(--success)";
  }

  // نمودار اقساط پرداخت‌شده / باقی‌مانده
  const chartTotal=paidInstallmentTotal+remainingInstallmentTotal;

  const paidPercentage=chartTotal
    ? Math.round(paidInstallmentTotal/chartTotal*100)
    : 0;

  const remainingPercentage=chartTotal
    ? Math.round(remainingInstallmentTotal/chartTotal*100)
    : 0;

 if (paidPercent) {
  paidPercent.textContent =
    `${paidPercentage.toLocaleString("fa-IR")}٪`;
}

if (remainingPercent) {
  remainingPercent.textContent =
    `${remainingPercentage.toLocaleString("fa-IR")}٪`;
}

if (paidBar) {
  paidBar.style.width = `${paidPercentage}%`;
}

if (remainingBar) {
  remainingBar.style.width = `${remainingPercentage}%`;
}

  // نمودار درآمد / قسط پرداخت‌شده / هزینه / قسط پرداخت‌نشده
  const incomeChartTotal =
    monthIncomeTotal +
    paidInstallmentTotal +
    monthExpenseTotal +
    remainingInstallmentTotal;

  const incomePercentage = incomeChartTotal
    ? Math.round((monthIncomeTotal / incomeChartTotal) * 100)
    : 0;

  const paidInstallmentPercentage = incomeChartTotal
    ? Math.round((paidInstallmentTotal / incomeChartTotal) * 100)
    : 0;

  const expensePercentage = incomeChartTotal
    ? Math.round((monthExpenseTotal / incomeChartTotal) * 100)
    : 0;

  const unpaidInstallmentPercentage = incomeChartTotal
    ? Math.max(0, 100 - incomePercentage - paidInstallmentPercentage - expensePercentage)
    : 0;

  if(incomePercent){
    incomePercent.textContent=`${incomePercentage.toLocaleString("fa-IR")}٪`;
  }

  if($("paidInstallmentPercent")){
    $("paidInstallmentPercent").textContent=`${paidInstallmentPercentage.toLocaleString("fa-IR")}٪`;
  }

  if($("expensePercent")){
    $("expensePercent").textContent=`${expensePercentage.toLocaleString("fa-IR")}٪`;
  }

  if($("unpaidInstallmentPercent")){
    $("unpaidInstallmentPercent").textContent=`${unpaidInstallmentPercentage.toLocaleString("fa-IR")}٪`;
  }

  if(incomeBar){
    incomeBar.style.width=`${incomePercentage}%`;
  }

  if($("paidInstallmentBar")){
    $("paidInstallmentBar").style.width=`${paidInstallmentPercentage}%`;
  }

  if($("expenseBar")){
    $("expenseBar").style.width=`${expensePercentage}%`;
  }

  if($("unpaidInstallmentBar")){
    $("unpaidInstallmentBar").style.width=`${unpaidInstallmentPercentage}%`;
  }
}
async function loadDebts(){
  try{
    const data = await supabaseRequest(`${DEBT_TABLE}?select=*&order=due_year.asc`);
    allDebts = Array.isArray(data) ? data : [];
  }catch(e){
    console.error("خطا در دریافت قرض و دیون", e);
    allDebts = [];
  }
  renderDebtsPanel();
}

function renderDebtsPanel(){
    
  const container = $("debtsPanel");
  if(!container) return;

  if(!allDebts.length){
    container.innerHTML = '<div class="empty">قرض یا دینی ثبت نشده</div>';
    return;
  }
  

  const sorted = [...allDebts].sort((a,b)=>{
    const am = MONTHS.findIndex(m=>m.key === a.due_month);
    const bm = MONTHS.findIndex(m=>m.key === b.due_month);
    return (Number(a.due_year) - Number(b.due_year)) ||
           (am - bm) ||
           (Number(a.due_day) - Number(b.due_day));
  });

  container.innerHTML = "";

  sorted.forEach(d=>{
    const monthName = MONTHS.find(m=>m.key === d.due_month)?.name || "";

    const row = document.createElement("article");
    row.className = `debt-row ${d.direction === "lent" ? "debt-lent" : "debt-borrowed"}`;
    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");

    row.innerHTML = `
      <div class="debt-card-summary">
        <div class="debt-card-top">
          <div class="debt-title">${escapeHtml(d.counterparty || "بدون نام")}</div>
          <div class="debt-amount">${formatMoney(d.amount)}</div>
        </div>

        <div class="debt-card-bottom">
          سررسید: ${Number(d.due_day || 0).toLocaleString("fa-IR")} ${monthName} ${Number(d.due_year || 0).toLocaleString("fa-IR")}
        </div>
      </div>
    `;

    row.addEventListener("click", ()=>openDebtDetailsModal(d));

    row.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        openDebtDetailsModal(d);
      }
    });

    container.appendChild(row);
  });
}
let activeDebtDetails = null;

function openDebtDetailsModal(d){
  activeDebtDetails = d;

  const modal = $("debtDetailsModal");
  const body = $("debtDetailsBody");
  const title = $("debtDetailsTitle");

  // پشتیبانی از هر دو مدل ID برای جلوگیری از خراب شدن
  const editBtn =
    $("editDebtDetailsBtn") ||
    $("debtDetailsEditBtn");

  const deleteBtn =
    $("deleteDebtDetailsBtn") ||
    $("debtDetailsDeleteBtn");

  if(!modal){
    console.error("debtDetailsModal پیدا نشد");
    return;
  }

  if(!body){
    console.error("debtDetailsBody پیدا نشد");
    return;
  }

  if(title){
    title.textContent = d.counterparty || "جزئیات قرض / دین";
  }

  const monthName = MONTHS.find(m => m.key === d.due_month)?.name || "";
  const directionText = d.direction === "lent" ? "طلب از او" : "بدهی به او";

  body.innerHTML = `
    <div class="debt-detail-list">

      <div class="debt-detail-item">
        <span>طرف حساب</span>
        <strong>${escapeHtml(d.counterparty || "-")}</strong>
      </div>

      <div class="debt-detail-item">
        <span>نوع</span>
        <strong>${directionText}</strong>
      </div>

      <div class="debt-detail-item">
        <span>مبلغ</span>
        <strong>${formatMoney(d.amount)}</strong>
      </div>

      <div class="debt-detail-item">
        <span>سررسید</span>
        <strong>
          ${Number(d.due_day || 0).toLocaleString("fa-IR")}
          ${monthName}
          ${Number(d.due_year || 0).toLocaleString("fa-IR")}
        </strong>
      </div>

      <div class="debt-detail-item">
        <span>عنوان / توضیح</span>
        <strong>${escapeHtml(d.note || "-")}</strong>
      </div>

    </div>
  `;

  if(editBtn){
    editBtn.onclick = (event)=>{
      event.preventDefault();
      event.stopPropagation();

      closeDebtDetailsModal();
      openEditDebtModal(d);
    };
  } else {
    console.error("دکمه ویرایش مودال جزئیات پیدا نشد");
  }

  if(deleteBtn){
   deleteBtn.onclick = async event => {
  event.preventDefault();
  event.stopPropagation();

  console.log("Debt selected for delete:", d);

  await deleteDebt(d.id);
};

  } else {
    console.error("دکمه حذف مودال جزئیات پیدا نشد");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDebtDetailsModal(){
  const modal = $("debtDetailsModal");
  if(!modal) return;
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
    console.log("Deleting debt:", id);

    const result = await supabaseRequest(
      `${DEBT_TABLE}?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=representation"
        }
      }
    );

    console.log("Delete debt result:", result);

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error(
        `رکورد با شناسه ${id} حذف نشد. Policy مربوط به DELETE را بررسی کنید.`
      );
    }

    closeDebtDetailsModal();
    await loadDebts();

  } catch (err) {
    console.error("Delete debt failed:", err);
    alert("خطا در حذف:\n" + err.message);
  }
}



function openEditDebtModal(d){
  if(!d || !d.id){
    alert("شناسه این مورد برای ویرایش پیدا نشد.");
    console.error("openEditDebtModal بدون id:", d);
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

  document.querySelectorAll(".debt-direction-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.direction === d.direction);
  });

  $("debtDirection").value = d.direction || "lent";

  expenseModalTitle.textContent = "ویرایش قرض/دین";
  saveExpenseButton.textContent = "ذخیره تغییرات";

  openModal();
}

function openPage(id,title){
  pages.forEach(p=>p.classList.toggle("active",p.id===id));
  navButtons.forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  pageTitle.textContent=title;

  if(id==="homePage") renderHome();
  if(id==="allPage") renderAllCards();
  if(id==="reportPage") renderReports();

  window.scrollTo({top:0,behavior:"smooth"})
}
refreshButton.addEventListener("click", performFullAppUpdate);
navButtons.forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.page,b.dataset.title)));
searchInput.addEventListener("input",()=>{visibleCount=PAGE_SIZE;renderAllCards()});
function updateStatusFilterLabels(filter){
  const paidBtn=$("statusFilterPaid"),unpaidBtn=$("statusFilterUnpaid");
  if(!paidBtn||!unpaidBtn)return;
  if(filter==="income"){
    paidBtn.textContent="دریافت‌شده این ماه";
    unpaidBtn.textContent="دریافت‌نشده این ماه";
  }else{
    paidBtn.textContent="پرداخت‌شده این ماه";
    unpaidBtn.textContent="پرداخت‌نشده این ماه";
  }
}
typeFilters.forEach(b=>b.addEventListener("click",()=>{typeFilters.forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;updateStatusFilterLabels(activeFilter);visibleCount=PAGE_SIZE;renderAllCards()}));
statusFilters.forEach(b=>b.addEventListener("click",()=>{statusFilters.forEach(x=>x.classList.remove("active"));b.classList.add("active");activeStatusFilter=b.dataset.status;visibleCount=PAGE_SIZE;renderAllCards()}));
loadMoreButton.addEventListener("click",()=>{visibleCount+=PAGE_SIZE;renderAllCards()});
document.querySelectorAll(".report-card[data-report]").forEach(c=>c.addEventListener("click",()=>openReportDetails(c.dataset.report)));
closeReportDetails.addEventListener("click",closeReportModal);reportDetailsModal.querySelector(".modal-backdrop").addEventListener("click",closeReportModal);
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
function openModal(){

    expenseModal.classList.add("open");

    document.body.style.overflow="hidden";

}
function loadIncomeOptions(){
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


// بستن منو با کلیک خارج از آن
document.addEventListener("click", e => {
  if (!$("fabContainer").contains(e.target)) {
    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
    addExpenseButton.classList.remove("active");
  }
});


installmentTypeButton.addEventListener("click",()=>setExpenseType("installment"));
setupTransferButtons();
$("debtTypeButton")?.addEventListener("click", ()=>setExpenseType("debt"));
setupButtonGroup(document, ".debt-direction-btn", btn=>{
    $("debtDirection").value = btn.dataset.direction;
});
expenseTypeButton.addEventListener("click",()=>setExpenseType("expense"));
if(transferTypeButton){
    transferTypeButton.addEventListener(
        "click",
        ()=>setExpenseType("transfer")
    );
}
if(incomeTypeButton){
    incomeTypeButton.addEventListener(
        "click",
        ()=>setExpenseType("income")
    );
    document.querySelectorAll(".income-bank")
    
.forEach(btn=>{

    btn.addEventListener("click",()=>{

        document
        .querySelectorAll(".income-bank")
        .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        selectedIncomeBank = btn.dataset.bank;

    });

});
}
document.querySelectorAll(".transfer-from")
.forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".transfer-from")
.forEach(b=>b.classList.remove("active"));

btn.classList.add("active");

$("transferFromModal").value = btn.dataset.bank;

});

});

document.querySelectorAll(".transfer-to")
.forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".transfer-to")
.forEach(b=>b.classList.remove("active"));

btn.classList.add("active");

$("transferToModal").value = btn.dataset.bank;

});

});
expenseForm.addEventListener("submit",saveExpense);
updatePersianDate();
expenseStartMonth.value=currentMonthKey;
setExpenseType("installment");
$("transferForm").addEventListener("submit", async e=>{

e.preventDefault();

const from=$("transferFromModal").value;
const to=$("transferToModal").value;
const amount=Number($("transferAmount").value);

if(!from || !to){
    alert("حساب مبدا و مقصد را انتخاب کنید");
    return;
}

if(from===to){
    alert("مبدا و مقصد یکسان است");
    return;
}

await addTransaction({

expense_id:null,
title:"انتقال وجه",
amount:amount,
type:"transfer",
account:null,
from_account:from,
to_account:to,
transaction_date:new Date().toISOString(),
note:$("transferNote").value || null

});

transferModal.classList.remove("open");

document.body.style.overflow="";

alert("انتقال ثبت شد");

});
loadData().then(()=>{
    openPage("duePage","⏰ سررسید اقساط");
    loadDebts();
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


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        swRegistration = reg;
        console.log("Service Worker registered:", reg.scope);

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      })
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

async function fetchGithubVersion() {
  try {
    const res = await fetch("https://api.github.com/repos/ahooraboy43/vamremember/commits/main", {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.commit?.committer?.date || null;
  } catch (e) {
    console.error("خطا در دریافت نسخه گیت‌هاب", e);
    return null;
  }
}

function updateAppVersionText(text) {
  currentAppVersionText = text;
  const el = $("appVersionText");
  if (el) el.textContent = text;
}

async function performFullAppUpdate() {
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "⏳";
  }

  if (statusBox) statusBox.textContent = "در حال بررسی بروزرسانی…";
  if (allStatus) allStatus.textContent = "در حال بررسی بروزرسانی…";
  showToast("در حال بررسی بروزرسانی", "info");

  try {
    const versionDate = await fetchGithubVersion();

    if (!versionDate) {
      showToast("نسخه جدیدی یافت نشد", "info");
      updateAppVersionText("نسخه جدیدی یافت نشد");
      if (statusBox) statusBox.textContent = "نسخه جدیدی یافت نشد";
      if (allStatus) allStatus.textContent = "نسخه جدیدی یافت نشد";
      return;
    }

    const faDate = new Date(versionDate).toLocaleString("fa-IR");

    await loadData();

    updateAppVersionText(`نسخه جدید دریافت شد: ${faDate}`);
    showToast(`نسخه جدید ${faDate} دریافت شد`, "success");

    if (statusBox) statusBox.textContent = `نسخه جدید ${faDate} دریافت شد`;
    if (allStatus) allStatus.textContent = `نسخه جدید ${faDate} دریافت شد`;

    if (swRegistration) {
      await swRegistration.update();
    }
  } catch (e) {
    console.error(e);
    showToast(`خطا در بروزرسانی: ${e.message}`, "error");
    if (statusBox) statusBox.textContent = `خطا در بروزرسانی: ${e.message}`;
    if (allStatus) allStatus.textContent = `خطا در بروزرسانی: ${e.message}`;
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄";
    }
  }
}



// ================= تنظیمات (Settings) =================

const SETTINGS_KEY = "appSettingsV1";

function loadSettings(){
  try{
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  }catch(e){
    return {};
  }
}

function saveSettings(settings){
  try{
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }catch(e){
    console.error("خطا در ذخیره تنظیمات", e);
  }
}

let appSettings = loadSettings();

// هش ساده برای رمز عبور (فقط جهت جلوگیری از دیدن ساده رمز، امنیت بالا نیست)
function simpleHash(str){
  let hash = 0;
  const s = String(str || "");
  for(let i=0; i<s.length; i++){
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return String(hash);
}

function toPersianDigits(str){
  return String(str).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function applyTheme(theme){
  const finalTheme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", finalTheme);
  document.querySelectorAll(".theme-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.theme === finalTheme);
  });
}

function applyAppIcon(dataUrl){
  if(!dataUrl) return;

  let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if(!touchIcon){
    touchIcon = document.createElement("link");
    touchIcon.rel = "apple-touch-icon";
    document.head.appendChild(touchIcon);
  }
  touchIcon.href = dataUrl;

  let favicon = document.querySelector('link[rel="icon"]');
  if(!favicon){
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.href = dataUrl;

  fetch("./manifest.json")
    .then(r => r.json())
    .then(manifest => {
      const updated = {
        ...manifest,
        icons: [
          { src: dataUrl, sizes: "192x192", type: "image/png" },
          { src: dataUrl, sizes: "512x512", type: "image/png" }
        ]
      };
      const blob = new Blob([JSON.stringify(updated)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if(manifestLink) manifestLink.href = url;
    })
    .catch(() => {});

  const preview = $("appIconPreview");
  if(preview) preview.src = dataUrl;
}

function resetAppIcon(){
  delete appSettings.icon;
  saveSettings(appSettings);

  const preview = $("appIconPreview");
  if(preview) preview.src = "assets/book.png";

  const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if(touchIcon) touchIcon.remove();

  const favicon = document.querySelector('link[rel="icon"]');
  if(favicon) favicon.remove();

  const manifestLink = document.querySelector('link[rel="manifest"]');
  if(manifestLink) manifestLink.href = "./manifest.json";
}

function initSettingsUI(){
  applyTheme(appSettings.theme || "dark");

  if(appSettings.icon){
    applyAppIcon(appSettings.icon);
  }

  const lockToggle = $("settingsLockEnabled");
  if(lockToggle) lockToggle.checked = !!appSettings.lockEnabled;

  const versionEl = $("appVersionText");
  if(versionEl) versionEl.textContent = currentAppVersionText;
}


document.querySelectorAll(".theme-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    appSettings.theme = btn.dataset.theme;
    saveSettings(appSettings);
    applyTheme(appSettings.theme);
  });
});

const settingsButton = $("settingsButton");
const settingsLockModal = $("settingsLockModal");
const settingsLockForm = $("settingsLockForm");
const settingsLockInput = $("settingsLockInput");
const closeSettingsLockModal = $("closeSettingsLockModal");

function openSettingsPage(){
  openPage("settingsPage", "⚙️ تنظیمات");
}

function openSettingsLockModal(){
  if(!settingsLockModal) return;
  settingsLockModal.classList.add("open");
  document.body.style.overflow = "hidden";
  if(settingsLockInput){
    settingsLockInput.value = "";
    setTimeout(()=>settingsLockInput.focus(), 100);
  }
}

function closeSettingsLockModalFn(){
  if(!settingsLockModal) return;
  settingsLockModal.classList.remove("open");
  document.body.style.overflow = "";
}

if(settingsButton){
  settingsButton.addEventListener("click", ()=>{
    if(appSettings.lockEnabled && appSettings.passwordHash){
      openSettingsLockModal();
    }else{
      openSettingsPage();
    }
  });
}

if(settingsLockForm){
  settingsLockForm.addEventListener("submit", e=>{
    e.preventDefault();
    const val = settingsLockInput ? settingsLockInput.value : "";
    if(simpleHash(val) === appSettings.passwordHash){
      closeSettingsLockModalFn();
      openSettingsPage();
    }else{
      alert("رمز عبور اشتباه است");
    }
  });
}

if(closeSettingsLockModal){
  closeSettingsLockModal.addEventListener("click", closeSettingsLockModalFn);
}
if(settingsLockModal){
  settingsLockModal.querySelector(".modal-backdrop")?.addEventListener("click", closeSettingsLockModalFn);
}

const saveSettingsPasswordButton = $("saveSettingsPasswordButton");
if(saveSettingsPasswordButton){
  saveSettingsPasswordButton.addEventListener("click", ()=>{
    const input = $("newSettingsPassword");
    const val = input ? input.value : "";
    if(!val){
      alert("رمز عبور را وارد کنید");
      return;
    }
    appSettings.passwordHash = simpleHash(val);
    saveSettings(appSettings);
    if(input) input.value = "";
    alert("رمز عبور ذخیره شد");
  });
}

const settingsLockEnabledInput = $("settingsLockEnabled");
if(settingsLockEnabledInput){
  settingsLockEnabledInput.addEventListener("change", ()=>{
    if(settingsLockEnabledInput.checked && !appSettings.passwordHash){
      alert("ابتدا یک رمز عبور تنظیم و ذخیره کنید");
      settingsLockEnabledInput.checked = false;
      return;
    }
    appSettings.lockEnabled = settingsLockEnabledInput.checked;
    saveSettings(appSettings);
  });
}

const appIconInput = $("appIconInput");
if(appIconInput){
  appIconInput.addEventListener("change", ()=>{
    const file = appIconInput.files && appIconInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      appSettings.icon = reader.result;
      saveSettings(appSettings);
      applyAppIcon(appSettings.icon);
    };
    reader.readAsDataURL(file);
  });
}

const resetAppIconButton = $("resetAppIconButton");
if(resetAppIconButton){
  resetAppIconButton.addEventListener("click", resetAppIcon);
}

updateStatusFilterLabels(activeFilter);

// ================= قفل کل اپلیکیشن (App Lock) =================

const APP_LOCK_SESSION_KEY = "appUnlockedV1";

function ensureDefaultAppLock(){
  if(appSettings.appLockEnabled === undefined){
    appSettings.appLockEnabled = true;
    appSettings.appLockPasswordHash = simpleHash("83242433");
    saveSettings(appSettings);
  }
}
/* =========================================================
   iOS VIEWPORT HEIGHT
   فقط یک بار در کل app.js
========================================================= */

(function () {

  function setAppHeight() {
    const vv = window.visualViewport;

    const height = vv
      ? Math.round(vv.height)
      : window.innerHeight;

    document.documentElement.style.setProperty(
      '--app-vh',
      height + 'px'
    );
  }

  /* رفع باگ فاصله نوار پایین (bottom-nav) از کف صفحه در اولین
     لود در iOS Safari: نوار fixed تا وقتی صفحه یک اسکرول
     نخورده باشد نسبت به viewport اشتباه (بزرگ‌تر از واقعی،
     قبل از جمع‌شدن نوار آدرس) رندر می‌شود. این تابع همان
     اسکرول را به‌صورت یک‌پیکسلی و کاملاً نامرئی شبیه‌سازی
     می‌کند تا وبکیت موقعیت را فوراً دوباره محاسبه کند. */
  function nudgeScroll() {
    const y = window.scrollY || window.pageYOffset || 0;
    window.scrollTo(0, y + 1);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  function refresh() {
    setAppHeight();
    nudgeScroll();
  }

  // اجرای اولیه
  refresh();

  // مخصوص اولین اجرای PWA / Standalone
  requestAnimationFrame(() => {
    refresh();

    requestAnimationFrame(() => {
      refresh();
    });
  });

  setTimeout(refresh, 150);
  setTimeout(refresh, 500);
  setTimeout(refresh, 1000);

  window.addEventListener('load', function () {
    setTimeout(refresh, 50);
    setTimeout(refresh, 400);
    setTimeout(refresh, 1000);
  }, { passive: true });

  // مخصوص باز شدن اپ از حالت PWA/Standalone (Home Screen)
  window.addEventListener('pageshow', function () {
    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 800);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      refresh();
      setTimeout(refresh, 300);
    }
  }, { passive: true });

  // تغییر اندازه صفحه
  window.addEventListener('resize', setAppHeight, { passive: true });

  // چرخش گوشی
  window.addEventListener('orientationchange', function () {
    requestAnimationFrame(refresh);
    setTimeout(refresh, 100);
  }, { passive: true });

  // مخصوص Safari / iOS
  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      'resize',
      refresh,
      { passive: true }
    );
  }

})();

function isAppLocked(){
  return !!(
    appSettings.appLockEnabled &&
    appSettings.appLockPasswordHash &&
    !sessionStorage.getItem(APP_LOCK_SESSION_KEY)
  );
}

function showAppLockScreen(){
  const el = $("appLockScreen");
  if(el) el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const input = $("appLockInput");
  if(input){
    input.value = "";
    setTimeout(()=>input.focus(), 150);
  }
}

function hideAppLockScreen(){
  const el = $("appLockScreen");
  if(el) el.classList.add("hidden");
  document.body.style.overflow = "";
}

function initAppLock(){
  ensureDefaultAppLock();
  const toggle = $("appLockEnabledToggle");
  if(toggle) toggle.checked = !!appSettings.appLockEnabled;

  if(isAppLocked()){
    showAppLockScreen();
  }else{
    hideAppLockScreen();
  }
}

const appLockForm = $("appLockForm");
if(appLockForm){
  appLockForm.addEventListener("submit", e=>{
    e.preventDefault();
    const input = $("appLockInput");
    const val = input ? input.value : "";
    const errEl = $("appLockError");
    if(simpleHash(val) === appSettings.appLockPasswordHash){
      sessionStorage.setItem(APP_LOCK_SESSION_KEY, "1");
      if(errEl) errEl.classList.add("hidden");
      hideAppLockScreen();
    }else{
      if(errEl) errEl.classList.remove("hidden");
      if(input){
        input.value = "";
        input.focus();
      }
    }
  });
}

const appLockEnabledToggle = $("appLockEnabledToggle");
if(appLockEnabledToggle){
  appLockEnabledToggle.addEventListener("change", ()=>{
    if(appLockEnabledToggle.checked && !appSettings.appLockPasswordHash){
      appSettings.appLockPasswordHash = simpleHash("83242433");
    }
    appSettings.appLockEnabled = appLockEnabledToggle.checked;
    saveSettings(appSettings);
  });
}

const saveAppLockPasswordButton = $("saveAppLockPasswordButton");
if(saveAppLockPasswordButton){
  saveAppLockPasswordButton.addEventListener("click", ()=>{
    const input = $("newAppLockPassword");
    const val = input ? input.value : "";
    if(!val){
      alert("رمز عبور را وارد کنید");
      return;
    }
    appSettings.appLockPasswordHash = simpleHash(val);
    saveSettings(appSettings);
    if(input) input.value = "";
    alert("رمز عبور اپلیکیشن ذخیره شد");
  });
}
// =========================================================
// ================= بخش جدید: کارت‌های بانکی =================
// =========================================================

const BANK_CARDS_KEY = "bankCardsV1";
let bankCards = [];
let currentCardIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

// بارگذاری کارت‌ها از لوکال استوریج
function loadBankCards() {
  try {
    const data = localStorage.getItem(BANK_CARDS_KEY);
    bankCards = data ? JSON.parse(data) : [];
  } catch (e) {
    bankCards = [];
  }
  renderBankCards();
}

// ذخیره کارت‌ها در لوکال استوریج
function saveBankCards() {
  localStorage.setItem(BANK_CARDS_KEY, JSON.stringify(bankCards));
  renderBankCards();
}

// نمایش کارت‌ها با افکت چرخ فلک
function renderBankCards() {
  const container = document.getElementById("bankCarousel");
  const dotsContainer = document.getElementById("carouselDots");
  if (!container) return;

  if (bankCards.length === 0) {
    container.innerHTML = `
      <div class="empty-bank-state">
        <div class="empty-icon">💳</div>
        <p>هیچ کارت بانکی ثبت نشده است</p>
        <button class="primary-button" id="emptyAddBankBtn" type="button">افزودن کارت</button>
      </div>
    `;
    if (dotsContainer) dotsContainer.innerHTML = "";
    const emptyBtn = document.getElementById("emptyAddBankBtn");
    if (emptyBtn) emptyBtn.addEventListener("click", openBankCardModal);
    return;
  }

  if (currentCardIndex >= bankCards.length) currentCardIndex = 0;
  if (currentCardIndex < 0) currentCardIndex = 0;

  const total = bankCards.length;
  const centerIndex = currentCardIndex;

  let cardsHtml = '';
  for (let i = 0; i < total; i++) {
    let offset = i - centerIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    
    const card = bankCards[i];
    const isCenter = i === centerIndex;
    
    const translateX = offset * 120;
    const scale = 1 - Math.abs(offset) * 0.08;
    const opacity = 1 - Math.abs(offset) * 0.3;
    const zIndex = isCenter ? 10 : 10 - Math.abs(offset);
    
    const maskedNumber = card.cardNumber ? '****' + card.cardNumber.slice(-4) : '•••• •••• •••• ••••';
    const maskedCvv = card.cvv ? '•••' : '•••';
    const maskedExpiry = card.expiry || '••/••';
    
    cardsHtml += `
      <div class="bank-card-item" 
           data-index="${i}"
           style="
             transform: translateX(${translateX}px) scale(${scale});
             opacity: ${opacity};
             z-index: ${zIndex};
             background: ${card.color || '#1a2332'};
             pointer-events: ${isCenter ? 'auto' : 'none'};
           ">
        <div class="bank-card-inner">
          <div class="bank-card-top">
            <span class="bank-card-chip">💳</span>
            <span class="bank-card-type">${card.bankName || 'بانک'}</span>
          </div>
          <div class="bank-card-number" data-field="number">
            <span>${isCenter ? card.cardNumber || '•••• •••• •••• ••••' : maskedNumber}</span>
            <button class="copy-btn" data-field="number" data-value="${card.cardNumber || ''}" type="button">📋</button>
          </div>
          <div class="bank-card-bottom">
            <div class="bank-card-expiry" data-field="expiry">
              <span>${isCenter ? card.expiry || '••/••' : maskedExpiry}</span>
              <button class="copy-btn" data-field="expiry" data-value="${card.expiry || ''}" type="button">📋</button>
            </div>
            <div class="bank-card-cvv" data-field="cvv">
              <span>${isCenter ? card.cvv || '•••' : maskedCvv}</span>
              <button class="copy-btn" data-field="cvv" data-value="${card.cvv || ''}" type="button">📋</button>
            </div>
          </div>
          <div class="bank-card-iban" data-field="iban">
            <span>${isCenter ? card.iban || 'شبا ثبت نشده' : '•••• •••• •••• ••••'}</span>
            <button class="copy-btn" data-field="iban" data-value="${card.iban || ''}" type="button">📋</button>
          </div>
          <div class="bank-card-balance">
            ${card.balance ? Number(card.balance).toLocaleString('fa-IR') + ' ریال' : 'موجودی: ۰ ریال'}
          </div>
          <button class="bank-card-edit-btn" data-id="${card.id || i}" type="button">✎</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = cardsHtml;

  // دکمه‌های کپی
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

  // دکمه‌های ویرایش
  container.querySelectorAll('.bank-card-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = bankCards.find(c => c.id == id);
      if (card) openBankCardModal(card);
    });
  });

  // دایره‌های ناوبری
  if (dotsContainer) {
    dotsContainer.innerHTML = bankCards.map((_, i) => 
      `<span class="dot ${i === currentCardIndex ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');
    
    dotsContainer.querySelectorAll('.dot').forEach(dot => {
      dot.addEventListener('click', () => {
        currentCardIndex = parseInt(dot.dataset.index);
        renderBankCards();
      });
    });
  }
}

// پشتیبانی از لمس برای چرخش کارت‌ها
function initCarouselTouch() {
  const container = document.getElementById("bankCarousel");
  if (!container) return;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentCardIndex < bankCards.length - 1) {
        currentCardIndex++;
        renderBankCards();
      } else if (diff > 0 && currentCardIndex > 0) {
        currentCardIndex--;
        renderBankCards();
      } else if (diff < 0 && currentCardIndex === bankCards.length - 1) {
        currentCardIndex = 0;
        renderBankCards();
      } else if (diff > 0 && currentCardIndex === 0) {
        currentCardIndex = bankCards.length - 1;
        renderBankCards();
      }
    }
  }, { passive: true });

  // پشتیبانی از ماوس
  let mouseDown = false;
  let mouseStartX = 0;

  container.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mouseStartX = e.screenX;
    e.preventDefault();
  });

  container.addEventListener('mouseup', (e) => {
    if (!mouseDown) return;
    mouseDown = false;
    const diff = e.screenX - mouseStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentCardIndex < bankCards.length - 1) {
        currentCardIndex++;
        renderBankCards();
      } else if (diff > 0 && currentCardIndex > 0) {
        currentCardIndex--;
        renderBankCards();
      } else if (diff < 0 && currentCardIndex === bankCards.length - 1) {
        currentCardIndex = 0;
        renderBankCards();
      } else if (diff > 0 && currentCardIndex === 0) {
        currentCardIndex = bankCards.length - 1;
        renderBankCards();
      }
    }
  });

  container.addEventListener('mouseleave', () => {
    mouseDown = false;
  });
}

// باز کردن مودال کارت بانکی
function openBankCardModal(card = null) {
  const modal = document.getElementById("bankCardModal");
  const form = document.getElementById("bankCardForm");
  const title = document.getElementById("bankCardModalTitle");
  const idField = document.getElementById("editBankCardId");
  const nameField = document.getElementById("bankCardName");
  const numberField = document.getElementById("bankCardNumber");
  const ibanField = document.getElementById("bankCardIban");
  const expiryField = document.getElementById("bankCardExpiry");
  const cvvField = document.getElementById("bankCardCvv");
  const balanceField = document.getElementById("bankCardBalance");
  const colorField = document.getElementById("bankCardColor");

  if (!modal) return;
  form.reset();
  idField.value = "";

  if (card) {
    title.textContent = "ویرایش کارت بانکی";
    idField.value = card.id || "";
    nameField.value = card.bankName || "";
    numberField.value = card.cardNumber || "";
    ibanField.value = card.iban || "";
    expiryField.value = card.expiry || "";
    cvvField.value = card.cvv || "";
    balanceField.value = card.balance || "";
    colorField.value = card.color || "#1a2332";
  } else {
    title.textContent = "ثبت کارت بانکی جدید";
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

// بستن مودال کارت بانکی
function closeBankCardModal() {
  const modal = document.getElementById("bankCardModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

// ذخیره کارت بانکی
document.getElementById("bankCardForm")?.addEventListener("submit", function(e) {
  e.preventDefault();
  
  const idField = document.getElementById("editBankCardId");
  const nameField = document.getElementById("bankCardName");
  const numberField = document.getElementById("bankCardNumber");
  const ibanField = document.getElementById("bankCardIban");
  const expiryField = document.getElementById("bankCardExpiry");
  const cvvField = document.getElementById("bankCardCvv");
  const balanceField = document.getElementById("bankCardBalance");
  const colorField = document.getElementById("bankCardColor");

  const cardData = {
    id: idField.value || Date.now().toString(),
    bankName: nameField.value.trim(),
    cardNumber: numberField.value.trim(),
    iban: ibanField.value.trim(),
    expiry: expiryField.value.trim(),
    cvv: cvvField.value.trim(),
    balance: parseFloat(balanceField.value) || 0,
    color: colorField.value || "#1a2332",
    createdAt: new Date().toISOString()
  };

  if (!cardData.bankName) {
    showToast("نام بانک را وارد کنید", "error");
    return;
  }

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
});

// دکمه‌های بستن مودال
document.getElementById("closeBankCardModal")?.addEventListener("click", closeBankCardModal);
document.getElementById("bankCardModal")?.querySelector(".modal-backdrop")?.addEventListener("click", closeBankCardModal);
document.getElementById("addBankCardBtn")?.addEventListener("click", () => openBankCardModal());

// =========================================================
// ================= منوی همبرگری =================
// =========================================================

function createHamburgerPanel() {
  const panel = document.createElement("div");
  panel.id = "hamburgerPanel";
  panel.className = "hamburger-panel hidden";
  panel.innerHTML = `
    <div class="hamburger-backdrop"></div>
    <div class="hamburger-sheet">
      <div class="hamburger-header">
        <h3>📋 منو</h3>
        <button id="closeHamburgerBtn" type="button">✕</button>
      </div>
      <div class="hamburger-items">
        <button class="hamburger-item" data-action="refresh">
          <span>🔄</span> بروزرسانی
        </button>
        <button class="hamburger-item" data-action="banks">
          <span>🏦</span> بانک‌ها
        </button>
        <button class="hamburger-item" data-action="settings">
          <span>⚙️</span> تنظیمات
        </button>
        <button class="hamburger-item" data-action="profile">
          <span>👤</span> پروفایل
        </button>
      </div>
      <div class="hamburger-profile">
        <div class="profile-avatar" id="profileAvatar">
          <img id="profileAvatarImg" src="assets/default-avatar.png" alt="پروفایل">
        </div>
        <div class="profile-name" id="profileName">کاربر</div>
        <button class="profile-upload-btn" id="profileUploadBtn" type="button">📷 تغییر عکس</button>
        <input type="file" id="profileImageInput" accept="image/*" style="display:none">
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // باز و بسته کردن منو
  document.getElementById("hamburgerMenuBtn")?.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    document.body.style.overflow = panel.classList.contains("hidden") ? "" : "hidden";
  });

  document.getElementById("closeHamburgerBtn")?.addEventListener("click", () => {
    panel.classList.add("hidden");
    document.body.style.overflow = "";
  });

  panel.querySelector(".hamburger-backdrop")?.addEventListener("click", () => {
    panel.classList.add("hidden");
    document.body.style.overflow = "";
  });

  // دکمه‌های منو
  panel.querySelectorAll(".hamburger-item").forEach(item => {
    item.addEventListener("click", () => {
      const action = item.dataset.action;
      panel.classList.add("hidden");
      document.body.style.overflow = "";
      
      switch(action) {
        case "refresh":
          performFullAppUpdate();
          break;
        case "banks":
          openPage("banksPage", "🏦 بانک‌ها");
          setTimeout(renderBankCards, 100);
          break;
        case "settings":
          openPage("settingsPage", "⚙️ تنظیمات");
          break;
        case "profile":
          showToast("پروفایل در منو قابل مشاهده است", "info");
          break;
      }
    });
  });

  // آپلود عکس پروفایل
  document.getElementById("profileUploadBtn")?.addEventListener("click", () => {
    document.getElementById("profileImageInput")?.click();
  });

  document.getElementById("profileImageInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById("profileAvatarImg");
      if (img) img.src = ev.target.result;
      localStorage.setItem("profileImage", ev.target.result);
      showToast("عکس پروفایل تغییر کرد", "success");
    };
    reader.readAsDataURL(file);
  });

  // بارگذاری عکس پروفایل ذخیره شده
  const savedImage = localStorage.getItem("profileImage");
  if (savedImage) {
    const img = document.getElementById("profileAvatarImg");
    if (img) img.src = savedImage;
  }
}

// =========================================================
// ================= مقداردهی اولیه =================
// =========================================================

// تابع مقداردهی اولیه همه چیز
function initNewFeatures() {
  createHamburgerPanel();
  loadBankCards();
  initCarouselTouch();
  
  // دکمه افزودن کارت از حالت خالی
  document.addEventListener("click", (e) => {
    if (e.target.id === "emptyAddBankBtn") {
      openBankCardModal();
    }
  });
}

// اجرا بعد از لود شدن صفحه
setTimeout(initNewFeatures, 200);

// همچنین وقتی صفحه بانک‌ها باز میشه، کارت‌ها رو رندر کن
const originalOpenPageFn = openPage;
openPage = function(id, title) {
  originalOpenPageFn(id, title);
  if (id === "banksPage") {
    setTimeout(renderBankCards, 150);
  }
};

//جدید

// =========================================================
// ================= تلفیق بانک‌ها و کارت‌ها =================
// =========================================================

// بارگذاری بانک‌ها از لوکال استوریج (همون بانک‌های قبلی)
function loadBanksFromStorage() {
  try {
    const saved = localStorage.getItem("banks");
    return saved ? JSON.parse(saved) : ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
  } catch {
    return ["بانک ملی", "بانک رفاه", "ویپاد", "بلو بانک"];
  }
}

// ذخیره بانک‌ها
function saveBanksToStorage(banks) {
  localStorage.setItem("banks", JSON.stringify(banks));
}

// بارگذاری کارت‌های بانکی
function loadBankCards() {
  try {
    const data = localStorage.getItem("bankCardsV1");
    bankCards = data ? JSON.parse(data) : [];
  } catch (e) {
    bankCards = [];
  }
  renderBankCards();
}

// نمایش بانک‌ها و کارت‌ها با هم
function renderBankCards() {
  const container = document.getElementById("bankCarousel");
  const dotsContainer = document.getElementById("carouselDots");
  const banksListContainer = document.getElementById("banksManagementList");
  
  if (!container) return;

  // ===== بخش مدیریت بانک‌ها =====
  if (banksListContainer) {
    const banks = loadBanksFromStorage();
    banksListContainer.innerHTML = banks.map((b, i) => `
      <div class="bank-manage-item">
        <span>🏦 ${b}</span>
        <div class="bank-manage-actions">
          <button class="btn-sm" onclick="editBankName(${i})">✎</button>
          <button class="btn-sm btn-danger" onclick="deleteBankName(${i})">✕</button>
          <button class="btn-sm btn-primary" onclick="addCardToBank('${b}')">➕ کارت</button>
        </div>
      </div>
    `).join('');
  }

  // ===== بخش کارت‌ها =====
  if (bankCards.length === 0) {
    container.innerHTML = `
      <div class="empty-bank-state">
        <div class="empty-icon">💳</div>
        <p>هیچ کارت بانکی ثبت نشده است</p>
        <p style="font-size:12px;color:var(--muted);">ابتدا یک بانک تعریف کنید، سپس کارت آن را ثبت کنید</p>
        <button class="primary-button" id="emptyAddBankBtn" type="button">➕ افزودن بانک</button>
      </div>
    `;
    if (dotsContainer) dotsContainer.innerHTML = "";
    const emptyBtn = document.getElementById("emptyAddBankBtn");
    if (emptyBtn) emptyBtn.addEventListener("click", () => openAddBankModal());
    return;
  }

  // ... ادامه کد کارت‌ها (همون کد قبلی)
}

// ===== توابع مدیریت بانک‌ها =====
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
  const newName = prompt("نام جدید:", banks[index]);
  if (newName && newName.trim()) {
    banks[index] = newName.trim();
    saveBanksToStorage(banks);
    renderBankCards();
    showToast("نام بانک تغییر کرد", "success");
  }
}

function deleteBankName(index) {
  const banks = loadBanksFromStorage();
  if (!confirm(`حذف "${banks[index]}"؟`)) return;
  banks.splice(index, 1);
  saveBanksToStorage(banks);
  renderBankCards();
  showToast("بانک حذف شد", "info");
}

function addCardToBank(bankName) {
  // باز کردن مودال با نام بانک پر شده
  openBankCardModal(null, bankName);
}

// ===== اصلاح مودال کارت =====
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
  const balanceField = document.getElementById("bankCardBalance");
  const colorField = document.getElementById("bankCardColor");
  const designField = document.getElementById("bankCardDesign");

  if (!modal) return;
  form.reset();
  idField.value = "";

  // اگر نام بانک از قبل مشخص شده
  if (prefillBank) {
    nameField.value = prefillBank;
  }

  if (card) {
    title.textContent = "ویرایش کارت بانکی";
    idField.value = card.id || "";
    nameField.value = card.bankName || "";
    numberField.value = card.cardNumber || "";
    ibanField.value = card.iban || "";
    expiryField.value = card.expiry || "";
    cvvField.value = card.cvv || "";
    balanceField.value = card.balance || "";
    colorField.value = card.color || "#1a2332";
    if (designField) designField.value = card.design || "0";
  } else {
    title.textContent = "ثبت کارت بانکی جدید";
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
// =========================================================
// ================= منوی همبرگری =================
// =========================================================

function createHamburgerPanel() {
  const panel = document.createElement("div");
  panel.id = "hamburgerPanel";
  panel.className = "hamburger-panel hidden";
  panel.innerHTML = `
    <div class="hamburger-backdrop"></div>
    <div class="hamburger-sheet">
      <div class="hamburger-header">
        <h3>📋 منو</h3>
        <button id="closeHamburgerBtn" type="button">✕</button>
      </div>
      <div class="hamburger-items">
        <button class="hamburger-item" data-action="refresh">
          <span>🔄</span> بروزرسانی
        </button>
        <button class="hamburger-item" data-action="banks">
          <span>🏦</span> بانک‌ها
        </button>
        <button class="hamburger-item" data-action="settings">
          <span>⚙️</span> تنظیمات
        </button>
        <button class="hamburger-item" data-action="profile">
          <span>👤</span> پروفایل
        </button>
      </div>
      <div class="hamburger-profile">
        <div class="profile-avatar">
          <img id="profileAvatarImg" src="assets/default-avatar.png" alt="پروفایل">
        </div>
        <div class="profile-name">کاربر</div>
        <button class="profile-upload-btn" id="profileUploadBtn" type="button">📷 تغییر عکس</button>
        <input type="file" id="profileImageInput" accept="image/*" style="display:none">
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // باز و بسته کردن منو
  const menuBtn = document.getElementById("hamburgerMenuBtn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      panel.classList.toggle("hidden");
      document.body.style.overflow = panel.classList.contains("hidden") ? "" : "hidden";
    });
  }

  const closeBtn = document.getElementById("closeHamburgerBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function() {
      panel.classList.add("hidden");
      document.body.style.overflow = "";
    });
  }

  const backdrop = panel.querySelector(".hamburger-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", function() {
      panel.classList.add("hidden");
      document.body.style.overflow = "";
    });
  }

  // دکمه‌های منو
  panel.querySelectorAll(".hamburger-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const action = this.dataset.action;
      panel.classList.add("hidden");
      document.body.style.overflow = "";
      
      switch(action) {
        case "refresh":
          if (typeof performFullAppUpdate === 'function') {
            performFullAppUpdate();
          } else {
            window.location.reload();
          }
          break;
        case "banks":
          if (typeof openPage === 'function') {
            openPage("banksPage", "🏦 بانک‌ها");
            setTimeout(function() {
              if (typeof renderBankCards === 'function') {
                renderBankCards();
              }
            }, 200);
          }
          break;
        case "settings":
          if (typeof openPage === 'function') {
            openPage("settingsPage", "⚙️ تنظیمات");
          }
          break;
        case "profile":
          if (typeof showToast === 'function') {
            showToast("پروفایل در منو قابل مشاهده است", "info");
          }
          break;
      }
    });
  });

  // عکس پروفایل
  const uploadBtn = document.getElementById("profileUploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", function() {
      document.getElementById("profileImageInput")?.click();
    });
  }

  const imageInput = document.getElementById("profileImageInput");
  if (imageInput) {
    imageInput.addEventListener("change", function(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const img = document.getElementById("profileAvatarImg");
        if (img) img.src = ev.target.result;
        localStorage.setItem("profileImage", ev.target.result);
        if (typeof showToast === 'function') {
          showToast("عکس پروفایل تغییر کرد", "success");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // بارگذاری عکس ذخیره شده
  const savedImage = localStorage.getItem("profileImage");
  if (savedImage) {
    const img = document.getElementById("profileAvatarImg");
    if (img) img.src = savedImage;
  }
}

// اجرای منو بعد از لود کامل
setTimeout(createHamburgerPanel, 300);

// اصلاح openPage برای پشتیبانی از بانک‌ها
if (typeof openPage === 'function') {
  const originalOpenPage = openPage;
  openPage = function(id, title) {
    originalOpenPage(id, title);
    if (id === "banksPage") {
      setTimeout(function() {
        if (typeof renderBankCards === 'function') {
          renderBankCards();
        }
      }, 200);
    }
  };
}
// =========================================================
// ================= تنظیم خودکار منوی پایین ===============
// =========================================================
// ================= منوی پایین با sticky =================
// =========================================================

function createStickyNav() {
    // منوی موجود رو پیدا کن
    const oldNav = document.querySelector('.bottom-nav');
    if (oldNav) {
        // منوی قدیمی رو مخفی کن
        oldNav.style.display = 'none';
    }
    
    // یه منوی جدید بساز
    const newNav = document.createElement('nav');
    newNav.id = 'stickyNav';
    newNav.innerHTML = `
        <button class="nav-btn" data-page="duePage">
            <img src="assets/book.png" alt="" style="width:24px;height:24px;">
            <small>سررسیدها</small>
        </button>
        <button class="nav-btn" data-page="banksPage">
            <img src="assets/bank.png" alt="" style="width:24px;height:24px;">
            <small>بانک‌ها</small>
        </button>
        <button class="nav-btn home-btn" data-page="homePage">
            <img src="assets/home.png" alt="" style="width:32px;height:32px;">
        </button>
        <button class="nav-btn" data-page="allPage">
            <img src="assets/vam.png" alt="" style="width:24px;height:24px;">
            <small>اقساط</small>
        </button>
        <button class="nav-btn" data-page="reportPage">
            <img src="assets/fin.png" alt="" style="width:24px;height:24px;">
            <small>گزارش</small>
        </button>
    `;
    
    // استایل منو جدید
    newNav.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: min(100%, 620px);
        height: 68px;
        z-index: 99999;
        background: rgba(17, 24, 39, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255,255,255,0.08);
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        align-items: center;
        justify-items: center;
        padding: 0 8px;
        padding-bottom: env(safe-area-inset-bottom);
        box-shadow: 0 -4px 30px rgba(0,0,0,0.5);
        border-radius: 0;
    `;
    
    // استایل دکمه‌ها
    const style = document.createElement('style');
    style.textContent = `
        #stickyNav .nav-btn {
            background: none;
            border: none;
            color: #8b94a3;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-size: 10px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 12px;
            transition: all 0.2s;
            width: 100%;
            height: 100%;
        }
        #stickyNav .nav-btn.active {
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.1);
        }
        #stickyNav .home-btn {
            margin-top: -25px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(145deg, #38bdf8, #0284c7);
            box-shadow: 0 8px 25px rgba(2,132,199,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            font-size: 20px;
        }
        #stickyNav .home-btn.active {
            transform: scale(1.05);
            box-shadow: 0 12px 35px rgba(2,132,199,0.5);
        }
        #stickyNav .nav-btn small {
            font-size: 9px;
        }
        @media(max-width: 480px) {
            #stickyNav { height: 62px; }
            #stickyNav .home-btn { width: 54px; height: 54px; margin-top: -20px; }
        }
        @media(max-width: 375px) {
            #stickyNav { height: 56px; }
            #stickyNav .home-btn { width: 48px; height: 48px; margin-top: -16px; }
        }
    `;
    document.head.appendChild(style);
    
    // اضافه کردن به صفحه
    document.body.appendChild(newNav);
    
    // رویداد کلیک
    newNav.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            if (typeof openPage === 'function') {
                openPage(page, this.textContent.trim());
            }
            // فعال کردن
            newNav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // فضای خالی
    const app = document.querySelector('.app');
    if (app) {
        app.style.paddingBottom = '85px';
    }
    
    console.log("✅ منوی جدید ساخته شد");
}

// اجرا
if (document.readyState === 'complete') {
    createStickyNav();
} else {
    window.addEventListener('load', function() {
        setTimeout(createStickyNav, 100);
    });
}
//آخر جدید
initAppLock();
initSettingsUI();