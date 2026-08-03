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
function extractPaymentDate(v){if(!isPaidValue(v))return"";const s=String(v);const matches=s.match(/[۰-۹0-9]{4}[\/\-][۰-۹0-9]{1,2}[\/\-][۰-۹0-9]{1,2}/g);return matches?.at(-1)||s}
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
    if(monthIndex <= 5) return 31;
    if(monthIndex <= 10) return 30;
    return 29;
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

    if (!s) {
      return true;
    }

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

    expenseDueDay.required = false;
expenseInstallments.required = false;

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

document.querySelectorAll(".payment-type-btn")
.forEach(btn => {

    btn.addEventListener("click",()=>{

        document.querySelectorAll(".payment-type-btn")
        .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        const type = btn.dataset.type;

        $("paymentType").value = type;
        fillPaymentItems(type);

        $("paymentModalTitle").textContent =
            type === "income" ? "ثبت دریافت" : "ثبت پرداخت";

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
    const date = $("paymentDate").value;
    const note = $("paymentNote").value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if(!itemId){ alert("حساب را انتخاب کنید."); return; }
    if(!Number.isFinite(amount) || amount<=0){ alert("مبلغ معتبر نیست."); return; }
    if(!selectedPaymentBank){ alert("بانک را انتخاب کنید."); return; }

    const monthKey = monthKeyFromDatePart(date) || currentMonthKey;

    if(submitBtn) submitBtn.disabled = true;

    try{
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

if(
    isInstallment(i)
    &&
    isPaidValue(i[currentMonthKey])
){
    paid += Number(i.amount)||0;
}

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
  if(id==="banksPage") {
    setTimeout(function(){
      if(typeof renderBankCards === 'function'){
        renderBankCards();
      }
    }, 150);
  }

  window.scrollTo({top:0,behavior:"smooth"})
}
refreshButton.addEventListener("click", performFullAppUpdate);
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
========================================================= */


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
// ================= کمکی‌ها (فرمت / ماسک شماره کارت) =================
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
// ================= کارت‌های بانکی (نسخه جدید با اسکرول native) =================
// =========================================================

const BANK_CARDS_KEY = "bankCardsV1";
let bankCards = [];
let currentCardIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

function loadBankCards() {
  try {
    const data = localStorage.getItem(BANK_CARDS_KEY);
    bankCards = data ? JSON.parse(data) : [];
  } catch (e) {
    bankCards = [];
  }
  renderBankCards();
}

function saveBankCards() {
  localStorage.setItem(BANK_CARDS_KEY, JSON.stringify(bankCards));
  renderBankCards();
}



// =========================================================
// ================= رندر کارت‌ها + لیست بانک‌ها =================
// =========================================================

function renderBankCards() {
  const container = document.getElementById("bankCarousel");
  const dotsContainer = document.getElementById("carouselDots");
  const banksListContainer = document.getElementById("banksManagementList");

  if (!container) return;

  // حتماً استایل‌های اسکرول روی خود المان باشه
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";
  container.style.webkitOverflowScrolling = "touch";
  container.style.scrollSnapType = "x proximity";
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
            <button class="btn-sm btn-danger" onclick="deleteBankName(${i})"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
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
    const bgStyle = hasImage
      ? `background-image:url('${card.image}');background-size:cover;background-position:center;`
      : `background:${card.color || '#1a2332'};`;

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

          <div class="bank-card-number" style="">
            <span class="full-value" dir="ltr" style="font-size:14px;">${fullNumber || '••••-••••-••••-••••'}</span>
            <span class="masked-value" dir="ltr" style="font-size:14px;">${masked}</span>
            <button class="copy-btn" data-field="number" data-value="${card.cardNumber || ''}" type="button" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;color:#fff;padding:1px 5px;font-size:8px;cursor:pointer;">📋</button>
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
          <button class="bank-card-delete-btn" data-id="${card.id || i}" type="button" style="position:absolute;top:6px;left:36px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:24px;height:24px;color:#ff3b30;font-size:12px;cursor:pointer;backdrop-filter:blur(4px);z-index:2;display:flex;align-items:center;justify-content:center;">🗑</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;

  // ====== این بخش کلیدی برای اسکرول روی گوشی ======
  // حتماً pointer-events رو active کن
  container.querySelectorAll('.bank-card-item').forEach(card => {
    card.style.pointerEvents = 'auto';
  });

  // کپی کردن
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

  // دکمه‌های حذف
  container.querySelectorAll('.bank-card-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = bankCards.find(c => c.id == id);
      if (!card) return;
      if (!confirm(`حذف کارت "${card.bankName}"؟`)) return;
      bankCards = bankCards.filter(c => c.id != id);
      saveBankCards();
      console.log("بعد از حذف، بانک‌های باقی‌مانده:", bankCards.map(c => c.bankName));
      saveBankCards();
      showToast("کارت حذف شد", "info");
      renderBankCards();
    });
  });

  // دات‌ها
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

  // ====== attach motion (با اولویت اسکرول) ======
  attachCarouselMotion(container);

  // اسکرول به کارت فعلی
  requestAnimationFrame(() => {
    const centerCard = container.querySelector(`.bank-card-item[data-index="${currentCardIndex}"]`);
    if (centerCard) {
      centerCard.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
  });
}

// =========================================================
// ================= موشن نرم کاروسل (اسکرول افقی) =================
// =========================================================

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

  // فقط یک‌بار listenerها رو وصل کن، حتی اگه این تابع چندبار صدا زده بشه
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
// پشتیبانی از درگ با ماوس (دسکتاپ)
    let isDragging = false;
    let dragStartX = 0;
    let scrollStartLeft = 0;

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      container.style.cursor = 'grabbing';
      dragStartX = e.pageX;
      scrollStartLeft = container.scrollLeft;
      container.style.scrollSnapType = 'none'; // موقع درگ، اسنپ رو غیرفعال کن
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
      container.style.scrollSnapType = "x proximity"; // دوباره فعالش کن تا snap بشه
    });

    container.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'grab';
        container.style.scrollSnapType = "x proximity";
      }
    });
  // این خط همیشه اجرا بشه (حتی اگه listener جدید attach نشده)
  // چون بعد از هر render، پوزیشن کارت‌ها عوض شده و باید scale/opacity آپدیت بشه
  updateCardTransforms();
}
// =========================================================



// =========================================================
// ================= پنل دیباگ تب‌دار =================
// =========================================================

function openAdminPanel() {
  const pass = prompt("رمز عبور مدیریت:");
  if (pass !== "1234") {
    if (pass !== null) alert("رمز اشتباه است");
    return;
  }

  let panel = document.getElementById('admin-panel');
  if (panel) panel.remove(); // همیشه از نو بساز تا مطمئن باشیم ساختار درسته

  panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div class="admin-glass" style="width:100%;max-width:480px;max-height:80vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;">
      <div class="admin-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;">
        <h3 style="margin:0;font-size:15px;">پنل دیباگ</h3>
        <button onclick="closeAdminPanel()" class="close-btn" style="border:none;background:none;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div class="admin-tabs" id="admin-tabs" style="display:flex;border-bottom:1px solid #eee;overflow-x:auto;">
        <button class="admin-tab" data-tab="banks" style="flex:1;padding:10px;border:none;background:none;cursor:pointer;font-size:13px;border-bottom:2px solid #007AFF;">🏦 بانک‌ها</button>
        <button class="admin-tab" data-tab="raw" style="flex:1;padding:10px;border:none;background:none;cursor:pointer;font-size:13px;border-bottom:2px solid transparent;">🗄 داده خام</button>
      </div>
      <div id="admin-body" style="overflow-y:auto;padding:14px 16px;flex:1;"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.style.display = 'flex';
  panel.style.position = 'fixed';
  panel.style.inset = '0';
  panel.style.zIndex = '9999999';
  panel.style.background = 'rgba(0,0,0,0.6)';
  panel.style.backdropFilter = 'blur(10px)';
  panel.style.webkitBackdropFilter = 'blur(10px)';
  panel.style.alignItems = 'center';
  panel.style.justifyContent = 'center';
  panel.style.padding = '20px';

  panel.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.admin-tab').forEach(t => t.style.borderBottomColor = 'transparent');
      tab.style.borderBottomColor = '#007AFF';
      renderAdminTab(tab.dataset.tab);
    });
  });

  renderAdminTab('banks');
}

function closeAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'none';
}

function renderAdminTab(tab) {
  const body = document.getElementById('admin-body');
  if (!body) return;
  if (tab === 'banks') renderAdminBanksTab(body);
  else renderAdminRawTab(body);
}

// ---------- تب بانک‌ها ----------
function renderAdminBanksTab(body) {
  const banks = loadBanksFromStorage();
  const cards = JSON.parse(localStorage.getItem(BANK_CARDS_KEY) || "[]");

  let html = `<h4 style="font-size:13px;color:#666;margin:0 0 8px;">بانک‌ها (${banks.length})</h4>`;
  banks.forEach((b, i) => {
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#f9f9f9;border-radius:8px;margin-bottom:6px;">
        <span style="font-size:13px;">🏦 ${b}</span>
        <div style="display:flex;gap:6px;">
          <button onclick="editBankName(${i});renderAdminBanksTab(document.getElementById('admin-body'))" style="border:none;background:#eee;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">ویرایش</button>
          <button onclick="deleteBankName(${i});renderAdminBanksTab(document.getElementById('admin-body'))" style="border:none;background:#ffdddd;color:#c00;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">حذف</button>
        </div>
      </div>`;
  });

  html += `<h4 style="font-size:13px;color:#666;margin:16px 0 8px;">کارت‌های ثبت‌شده (${cards.length})</h4>`;
  if (cards.length === 0) {
    html += `<p style="font-size:12px;color:#999;">هیچ کارتی ثبت نشده.</p>`;
  }
  cards.forEach(c => {
    html += `
      <div style="padding:10px;background:#f9f9f9;border-radius:8px;margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:bold;">${c.bankName}</span>
          <div style="display:flex;gap:6px;">
            <button data-edit-card="${c.id}" style="border:none;background:#eee;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">ویرایش</button>
            <button data-del-card="${c.id}" style="border:none;background:#ffdddd;color:#c00;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">حذف</button>
          </div>
        </div>
        <span style="font-size:11px;color:#666;direction:ltr;display:block;">${maskCardNumber(c.cardNumber)}</span>
      </div>`;
  });

  body.innerHTML = html;

  body.querySelectorAll('[data-edit-card]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = bankCards.find(c => c.id === btn.dataset.editCard);
      closeAdminPanel();
      if (card) openBankCardModal(card);
    });
  });
  body.querySelectorAll('[data-del-card]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm("این کارت حذف بشه؟")) return;
      bankCards = bankCards.filter(c => c.id !== btn.dataset.delCard);
      saveBankCards();
      renderAdminBanksTab(body);
    });
  });
}

// ---------- تب داده خام (برای بقیه صفحه‌ها) ----------
function renderAdminRawTab(body) {
  if (localStorage.length === 0) {
    body.innerHTML = '<p style="font-size:12px;color:#999;">هیچ داده‌ای ذخیره نشده.</p>';
    return;
  }
  let html = '';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = localStorage.getItem(key);
    let pretty = val;
    try { pretty = JSON.stringify(JSON.parse(val), null, 2); } catch (e) {}
    html += `
      <div style="margin-bottom:14px;background:#f9f9f9;padding:10px;border-radius:10px;">
        <span style="font-weight:bold;color:#007AFF;display:block;margin-bottom:6px;font-size:12px;direction:ltr;text-align:left;">${key}</span>
        <textarea data-raw-key="${key}" style="width:100%;height:100px;border-radius:8px;border:1px solid #ddd;padding:8px;font-family:monospace;font-size:11px;direction:ltr;text-align:left;">${pretty}</textarea>
        <div style="margin-top:6px;display:flex;gap:8px;">
          <button data-raw-save="${key}" style="background:#34c759;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;">ذخیره</button>
          <button data-raw-del="${key}" style="background:#ff3b30;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;">حذف</button>
        </div>
      </div>`;
  }
  body.innerHTML = html;

  body.querySelectorAll('[data-raw-save]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.rawSave;
      const val = body.querySelector(`[data-raw-key="${key}"]`).value;
      try {
        JSON.parse(val);
        localStorage.setItem(key, val);
        alert('ذخیره شد.');
        if (key === BANK_CARDS_KEY) loadBankCards();
      } catch (e) {
        alert('فرمت JSON اشتباه است.');
      }
    });
  });
  body.querySelectorAll('[data-raw-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.rawDel;
      if (!confirm(`حذف ${key}؟`)) return;
      localStorage.removeItem(key);
      if (key === BANK_CARDS_KEY) loadBankCards();
      renderAdminRawTab(body);
    });
  });
}


// ================= مدیریت بانک‌ها =================
// =========================================================

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

    // نام بانک روی کارت مرتبط هم آپدیت بشه
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

// =========================================================
// ================= مودال ثبت/ویرایش کارت =================
// =========================================================

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
  if (imagePreview) { imagePreview.style.display = "none"; imagePreview.src = ""; }

  if (prefillBank) {
    nameField.value = prefillBank;
  }

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
      if (imagePreview) { imagePreview.src = card.image; imagePreview.style.display = "block"; }
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

// فرمت خودکار شماره کارت هنگام تایپ
document.getElementById("bankCardNumber")?.addEventListener("input", function(e) {
  const cursorWasAtEnd = e.target.selectionStart === e.target.value.length;
  e.target.value = formatCardNumber(e.target.value);
  if (cursorWasAtEnd) {
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
  }
});

// آپلود عکس پس‌زمینه کارت
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
  if (preview) { preview.style.display = "none"; preview.src = ""; }
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

  if (!bankName) {
    showToast("نام بانک را وارد کنید", "error");
    return;
  }

  // هر بانک فقط یک کارت
  const duplicate = bankCards.find(c => c.bankName === bankName && (!isEditing || c.id !== idField.value));
  if (duplicate) {
    showToast("برای این بانک قبلاً یک کارت ثبت شده است", "error");
    return;
  }

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
document.addEventListener("click", function (e) {if (e.target.closest("#addBankCardBtn")){openBankCardModal();}});
document.getElementById("addBankBtn")?.addEventListener("click", openAddBankModal);

// =========================================================
// ================= منوی همبرگری =================
// =========================================================
// =========================================================
// ================= منوی همبرگری و دیباگ =================
// =========================================================

function createHamburgerPanel() {
  // ۱. پیشگیری از ساخت چندباره منو در صفحه
  if (document.getElementById("hamburgerPanel")) return;

  const panel = document.createElement("div");
  panel.id = "hamburgerPanel";
  panel.className = "hamburger-popup hidden";
  panel.innerHTML = `
    <div class="hamburger-items">
      <button class="hamburger-item" data-action="refresh" type="button">
        <span>🔄</span> بروزرسانی
      </button>
      <button class="hamburger-item" data-action="banks" type="button">
        <span>🏦</span> بانک‌ها
      </button>
      <button class="hamburger-item" data-action="settings" type="button">
        <span>⚙️</span> تنظیمات
      </button>
      <button class="hamburger-item" data-action="admin" type="button">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EA3323">
            <path d="M480-212q66 0 107-46.71 41-46.7 41-112.29v-137q0-66.41-41-113.71Q546-669 480-669t-107 47.29q-41 47.3-41 113.71v137q0 65.59 41 112.29Q414-212 480-212Zm-80-100h160v-96H400v96Zm0-160h160v-96H400v96Zm80 31Zm.06 355Q404-86 339-125.5T238-232H126v-96h83q-2.25-15.67-2.62-31.33Q206-375 206-392h-80v-96h80q0-17 .38-32.67.37-15.66 2.62-31.33h-83v-96h117q10-27 29-48.5t43-38.5l-66-66 69-68 86 86q34-15 70.5-16t70.5 13l90-89 68 68-64 64q29 19 50 45t34 58h111v88h-83q2.25 15.67 2.63 31.33Q754-505 754-488h80v96h-80q0 17-1 32.5t-3 31.5h84v96H722q-36 67-100.94 106.5t-141 39.5Z"/>
          </svg>
        </span>
        دیباگ
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

  // بستن منو با کلیک روی هر جای دیگر صفحه
  document.addEventListener("click", function(e) {
    if (!panel.classList.contains("hidden") &&
        !panel.contains(e.target) &&
        e.target !== menuBtn) {
      panel.classList.add("hidden");
    }
  });

  // مدیریت رویداد کلیک روی آیتم‌های منو
  panel.querySelectorAll(".hamburger-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const action = this.dataset.action;
      panel.classList.add("hidden");

      switch (action) {
        case "refresh":
          if (typeof performFullAppUpdate === 'function') {
            performFullAppUpdate();
          } else {
            window.location.reload();
          }
          break;

        case "banks":
          if (typeof openPage === "function") {
            openPage("banksPage", "🏦 بانک‌ها");
            setTimeout(function () {
              if (typeof renderBankCards === "function") {
                renderBankCards();
              }
            }, 200);
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
            console.error("تابع openAdminPanel در سطح فایل تعریف نشده یا در دسترس نیست.");
            alert("خطا: تابع پنل دیباگ پیدا نشد. مطمئن شوید کدهای جاوااسکریپت مربوط به ادمین را به انتهای app.js اضافه کرده‌اید.");
          }
          break;
      }
    });
  });
}

// =========================================================
// ================= مقداردهی اولیه =================
// =========================================================

function initNewFeatures() {
  createHamburgerPanel();
  
  if (typeof loadBankCards === 'function') {
    loadBankCards();
  }

  document.addEventListener("click", (e) => {
    if (e.target.id === "emptyAddBankBtn") {
      if (typeof openBankCardModal === 'function') {
        openBankCardModal();
      }
    }
  });
}

// اطمینان از مقداردهی پس از لود شدن کامل
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initNewFeatures, 300);
  });
} else {
  setTimeout(initNewFeatures, 300);
}

// صدا زدن توابع امنیتی پیش‌فرض
if (typeof initAppLock === 'function') initAppLock();
if (typeof initSettingsUI === 'function') initSettingsUI();
