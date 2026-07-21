const SUPABASE_URL = "https://yfgyauzuzznlhradsrbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A";
const TABLE_NAME="expenses";
const TRANSACTION_TABLE = "transactions";
const MONTHS=[{key:"farvardin",name:"فروردین"},{key:"ordibehesht",name:"اردیبهشت"},{key:"khordad",name:"خرداد"},{key:"tir",name:"تیر"},{key:"mordad",name:"مرداد"},{key:"shahrivar",name:"شهریور"},{key:"mehr",name:"مهر"},{key:"aban",name:"آبان"},{key:"azar",name:"آذر"},{key:"dey",name:"دی"},{key:"bahman",name:"بهمن"},{key:"esfand",name:"اسفند"}];
const PAGE_SIZE=10;
let allExpenses=[],visibleCount=PAGE_SIZE,activeFilter="all",activeStatusFilter="all",currentMonthKey=null,currentMonthIndex=0;
const $=id=>document.getElementById(id);
const cards=$("cards"),statusBox=$("status"),refreshButton=$("refresh"),todayElement=$("today");
const pages=document.querySelectorAll(".page"),navButtons=document.querySelectorAll(".nav-button"),pageTitle=$("pageTitle");
const allCards=$("allCards"),allStatus=$("allStatus"),searchInput=$("searchInput"),loadMoreButton=$("loadMore");
const typeFilters=document.querySelectorAll(".type-filter"),statusFilters=document.querySelectorAll(".status-filter"),addExpenseButton=$("addExpenseButton");
const expenseModal = document.getElementById("expenseModal");
const closeExpenseModal = document.getElementById("closeExpenseModal");
const accounts = [
    {
        id:1,
        title:"بانک ملی",
        type:"bank"
    },
    {
        id:2,
        title:"بانک رفاه",
        type:"bank"
    },
    {
        id:3,
        title:"ویپاد",
        type:"bank"
    },
    {
        id:4,
        title:"بلو بانک",
        type:"bank"
    },
    {
        id:5,
        title:"وجه نقد",
        type:"cash"
    }
];

const editExpenseId=$("editExpenseId"),expenseType=$("expenseType"),installmentTypeButton=$("installmentTypeButton"),expenseTypeButton=$("expenseTypeButton");
const expenseTitleLabel=$("expenseTitleLabel"),expenseTitle=$("expenseTitle"),expenseAmount=$("expenseAmount"),expenseTitleSelect=$("expenseTitleSelect"),expenseDueDay=$("expenseDueDay"),expenseInstallments=$("expenseInstallments"),installmentFields=$("installmentFields"),startMonthLabel=$("startMonthLabel"),expenseStartMonth=$("expenseStartMonth"),expenseNote=$("expenseNote"),monthsEditor=$("monthsEditor"),monthFields=$("monthFields"),saveExpenseButton=$("saveExpenseButton");
const reportMonthTotal=$("reportMonthTotal"),reportPaidTotal=$("reportPaidTotal"),reportRemainingTotal=$("reportRemainingTotal"),reportExpensesTotal=$("reportExpensesTotal"),reportAllTotal=$("reportAllTotal"),paidPercent=$("paidPercent"),remainingPercent=$("remainingPercent"),paidBar=$("paidBar"),remainingBar=$("remainingBar");
const transferTypeButton = $("transferTypeButton");
const transferFrom = $("transferFrom");
const transferTo = $("transferTo");
const expenseFields = $("expenseFields");
const transferFields = $("transferFields");
const incomeTypeButton = $("incomeTypeButton");
let selectedIncomeBank = null;let selectedExpenseBank = null;
const incomeFields = $("incomeFields");
const transferModal = $("transferModal");
const closeTransferModal = $("closeTransferModal");
const transferForm = $("transferForm");
let transferFromAccount = null;
let transferToAccount = null;
const incomeBankButtons = document.querySelectorAll(".income-bank");
const reportDetailsModal=$("reportDetailsModal"),reportDetailsTitle=$("reportDetailsTitle"),reportDetailsList=$("reportDetailsList"),closeReportDetails=$("closeReportDetails");

closeExpenseModal.addEventListener("click", closeModal);
closeTransferModal.addEventListener("click",()=>{

transferModal.classList.remove("open");
document.body.style.overflow="";

});


transferModal.querySelector(".modal-backdrop")
.addEventListener("click",()=>{

transferModal.classList.remove("open");
document.body.style.overflow="";

});


expenseModal.querySelector(".modal-backdrop")
.addEventListener("click", () => {
    closeModal();
});

async function addTransaction(data){
    console.log("SENDING TRANSACTION:", data);

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
async function getTransactions(){
    return await supabaseRequest(
        `${TRANSACTION_TABLE}?select=*&order=id.desc`,
        {
            method:"GET"
        }
    );
}

function setupActiveButtons(selector){

    document.querySelectorAll(selector).forEach(btn=>{

        btn.addEventListener("click",()=>{

            btn.parentElement
                .querySelectorAll(selector)
                .forEach(b=>b.classList.remove("active"));

            btn.classList.add("active");

        });

    });

}
function getHeaders(){return{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"}}
async function supabaseRequest(path,options={}){const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...getHeaders(),...(options.headers||{})}});const text=await response.text();if(!response.ok)throw new Error(text||`HTTP ${response.status}`);return text?JSON.parse(text):null}
function toEnglishDigits(value){return String(value).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))}
function getPersianDateParts(){const parts=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date()),v={};for(const p of parts)if(["year","month","day"].includes(p.type))v[p.type]=Number(toEnglishDigits(p.value));return v}
function updatePersianDate(){todayElement.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date());const p=getPersianDateParts();currentMonthIndex=p.month-1;currentMonthKey=MONTHS[currentMonthIndex].key}
function isInstallment(i){
    return i.type==="installment" || Number(i.id)<10000;
}


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
function fillExpenseTitles(type){

    if(!expenseTitleSelect) return;


    expenseTitleSelect.innerHTML =
    `<option value="">انتخاب کنید</option>`;


    let items=[];


    if(type==="expense"){

        items = allExpenses.filter(i=>{
            let id=Number(i.id);
            return id>=10000 && id<20000;
        });

    }


    if(type==="income"){

        items = allExpenses.filter(i=>{
            let id=Number(i.id);
            return id>=20000 && id<30000;
        });

    }


    items.forEach(item=>{

        const op=document.createElement("option");

        op.value=item.title;
        op.textContent=item.title;

        expenseTitleSelect.appendChild(op);

    });

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
        ["بانک ملی","بانک رفاه","ویپاد","بلو بانک","بانک ملت"]
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
function createDueCard(item){const card=document.createElement("article");card.className="card "+(item.daysRemaining<0?"overdue":"soon");const dayText=item.daysRemaining<0?`${Math.abs(item.daysRemaining).toLocaleString("fa-IR")} روز گذشته`:item.daysRemaining===0?"امروز":`${item.daysRemaining.toLocaleString("fa-IR")} روز مانده`;card.innerHTML=`<div class="card-main"><div class="top"><div class="name">${escapeHtml(item.title)}</div><div class="days">${dayText}</div></div><div class="amount">${formatMoney(item.amount)}</div><div class="meta">سررسید: روز ${Number(item.due_day).toLocaleString("fa-IR")}ام</div><div class="installment-badge">${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی مانده</div></div>${createPaymentPanelHtml()}`;card.querySelector(".card-main").addEventListener("click",()=>{document.querySelectorAll("#cards .card.open").forEach(c=>{if(c!==card)c.classList.remove("open")});card.classList.toggle("open")});setupPaymentPanel(card,item);return card}
function extractBank(text){

    const banks=[
        "بانک ملی",
        "بانک رفاه",
        "ویپاد",
        "بلو بانک",
        "بانک ملت"
    ];


    return banks.find(
        b=>String(text).includes(b)
    ) || null;

}
function createPaymentPanelHtml(){
  
return`
<div class="payment-panel">

<div class="payment-title">ثبت پرداخت</div>


<textarea class="payment-note" placeholder="توضیح پرداخت..."></textarea>

<div class="quick-tags">
<button type="button" class="tag-btn bank-tag" data-bank="بانک ملی">بانک ملی</button>
<button type="button" class="tag-btn bank-tag" data-bank="بانک رفاه">بانک رفاه</button>
<button type="button" class="tag-btn bank-tag" data-bank="ویپاد">ویپاد</button>
<button type="button" class="tag-btn bank-tag" data-bank="بلو بانک">بلو بانک</button>
<button type="button" class="tag-btn bank-tag" data-bank=" بانک ملت">بانک ملت </button>

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

function setupTransferButtons(){

    document.querySelectorAll(".from-bank")
    .forEach(btn=>{

        btn.addEventListener("click",()=>{

            document.querySelectorAll(".from-bank")
            .forEach(b=>b.classList.remove("active"));

            btn.classList.add("active");

            transferFrom.value=btn.dataset.bank;

        });

    });


    document.querySelectorAll(".to-bank")
    .forEach(btn=>{

        btn.addEventListener("click",()=>{

            document.querySelectorAll(".to-bank")
            .forEach(b=>b.classList.remove("active"));

            btn.classList.add("active");

            transferTo.value=btn.dataset.bank;

        });

    });

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

    if(activeStatusFilter==="unpaid" &&
       (!isInstallment(i) || !isNullValue(i[currentMonthKey]))){
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
const card=document.createElement("article");
const v=item[currentMonthKey];
  card.className=`card compact-card ${expense?"expense-card":""} ${!expense&&isPaidValue(v)?"paid-card":""}`;
  const mainAmount=expense?getLatestExpenseAmount(item):Number(item.amount||0);
  const secondary=expense?`جمع کل: ${formatMoney(getExpenseTotal(item))}`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} مانده`;
  const counter=expense?`${getPaidCount(item).toLocaleString("fa-IR")} پرداخت`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی‌مانده`;
  card.innerHTML=`<div class="card-main compact-main">
    <div class="compact-head"><div class="compact-amount-wrap"><div class="amount compact-amount">${formatMoney(mainAmount)}</div></div><div class="compact-side">${counter}</div><div class="id-badge">ID ${Number(item.id).toLocaleString("fa-IR")}</div></div>
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
    <span class="status-badge">${currentStatus(item)}</span></div></div>
    <div class="all-card-actions"><button type="button" class="edit-expense">ویرایش</button></div>
  </div>`;
  card.querySelector(".edit-expense").addEventListener("click",e=>{e.stopPropagation();openEditModal(item)});return card
}
function getExpenseAmount(item){return getLatestExpenseAmount(item)}
function updateExpenseFormType(type){

    const titleInput = document.getElementById("expenseTitle");
    const titleLabel = document.getElementById("expenseTitleLabel");

    titleInput.classList.remove("hidden");

    if(type==="installment"){
        titleLabel.textContent="عنوان قسط";
        titleInput.placeholder="مثلا وام بانک ملی";
    }

    if(type==="expense"){
        titleLabel.textContent="عنوان هزینه";
        titleInput.placeholder="مثلا خرید، قبض، بنزین";
    }

    if(type==="income"){
        titleLabel.textContent="عنوان درآمد";
        titleInput.placeholder="مثلا حقوق، فروش";
    }

}
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
    expenseDueDay.required =
        type === "installment";

    expenseInstallments.required =
        type === "installment";



    // متن دکمه ثبت
    if(editExpenseId.value){

        saveExpenseButton.textContent="ذخیره تغییرات";

    }
    else{

        switch(type){

            case "installment":
                saveExpenseButton.textContent="ثبت قسط";
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
        if(type==="income"){

            $("paymentModalTitle").textContent =
            "ثبت دریافت";

        }
        else{

            $("paymentModalTitle").textContent =
            "ثبت پرداخت";

        }


    });

});

fabPayment.onclick = ()=>{

    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");

    paymentModal.classList.add("open");
    fillPaymentItems($("paymentType").value || "payment");
    document.body.style.overflow="hidden";
   /// $("paymentDate").value = <تابع تاریخ امروز به فرمت YYYY/MM/DD>;

    const p = getPersianDateParts();
    $("paymentDate").value =
        `${p.year}/${String(p.month).padStart(2,"0")}/${String(p.day).padStart(2,"0")}`;

};


closePaymentModal.onclick = ()=>{

    paymentModal.classList.remove("open");
    document.body.style.overflow="";
    

};


paymentModal.querySelector(".modal-backdrop")
.addEventListener("click",()=>{

    paymentModal.classList.remove("open");
    document.body.style.overflow="";

});


fabTransfer.onclick = ()=>{

    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");

    transferModal.classList.add("open");
    document.body.style.overflow="hidden";

};
function closeModal(){expenseModal.classList.remove("open");document.body.style.overflow=""}
function resetExpenseForm(){expenseForm.reset();editExpenseId.value="";monthsEditor.classList.add("hidden");monthFields.innerHTML="";expenseStartMonth.value=currentMonthKey;expenseModalTitle.textContent="ثبت مورد جدید";setExpenseType("installment")}
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
}

async function saveExpense(e){

    e.preventDefault();

    const type = expenseType.value;

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


    if(type==="installment"){

        const d=Number(expenseDueDay.value);
        const c=Number(expenseInstallments.value);

        if(!Number.isFinite(d)||d<1||d>31){
            alert("روز سررسید معتبر نیست.");
            return;
        }

        if(!Number.isFinite(c)||c<1){
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
  if(type==="installment"){body.amount=Number(expenseAmount.value);body.due_day=Number(expenseDueDay.value);body.installment_count=Number(expenseInstallments.value);MONTHS.forEach((m,i)=>body[m.key]=i<idx?"CLOSE":null)}
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
  const installments=allExpenses.filter(isInstallment),expenses=allExpenses.filter(isExpense);
  if(kind==="month")return installments.filter(i=>!isClosedValue(i[currentMonthKey]));
  if(kind==="paid")return installments.filter(i=>isPaidValue(i[currentMonthKey]));
  if(kind==="remaining")return installments.filter(i=>isNullValue(i[currentMonthKey]));
  if(kind==="expenses")return expenses.filter(i=>parseMoney(i[currentMonthKey])!==null);
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
  const titles={month:"اقساط این ماه",paid:"اقساط پرداخت‌شده",remaining:"اقساط باقی‌مانده",expenses:"هزینه‌های این ماه",all:"جمع کل پرداختی"};
  const items=getReportItems(kind);reportDetailsTitle.textContent=titles[kind]||"جزئیات گزارش";reportDetailsList.innerHTML="";
  if(!items.length){reportDetailsList.innerHTML='<div class="empty">موردی وجود ندارد</div>'}
  items.forEach(item=>{
    const expense=isExpense(item),paid=isPaidValue(item[currentMonthKey]),row=document.createElement("article");row.className="report-detail-item";
    let detail="";
    if(expense)detail=`<span>${formatMoney(parseMoney(item[currentMonthKey])||0)}</span><span>پرداخت شده</span>`;
    else if(paid)detail=`<span>${formatMoney(item.amount)}</span><span>تاریخ پرداخت: ${escapeHtml(extractPaymentDate(item[currentMonthKey]))}</span>`;
    else detail=`<span>${formatMoney(item.amount)}</span><span>سررسید: روز ${Number(item.due_day||0).toLocaleString("fa-IR")}ام</span>`;
    row.innerHTML=`<div class="report-detail-title">${escapeHtml(item.title)}</div><div class="report-detail-meta">${detail}</div>`;reportDetailsList.appendChild(row)
  });
  reportDetailsModal.classList.add("open");document.body.style.overflow="hidden"
}
function closeReportModal(){reportDetailsModal.classList.remove("open");document.body.style.overflow=""}

function renderReports(){
  const installments=allExpenses.filter(isInstallment),expenses=allExpenses.filter(isExpense);
  let monthInstallmentTotal=0,paidInstallmentTotal=0,remainingInstallmentTotal=0,monthExpenseTotal=0;
  for(const item of installments){const currentValue=item[currentMonthKey],amount=Number(item.amount||0);if(isClosedValue(currentValue))continue;monthInstallmentTotal+=amount;if(isPaidValue(currentValue))paidInstallmentTotal+=amount;if(isNullValue(currentValue))remainingInstallmentTotal+=amount}
  for(const item of expenses){const amount=parseMoney(item[currentMonthKey]);if(amount!==null)monthExpenseTotal+=amount}
  const allPaidTotal=paidInstallmentTotal+monthExpenseTotal;
  reportMonthTotal.textContent=formatMoney(monthInstallmentTotal);reportPaidTotal.textContent=formatMoney(paidInstallmentTotal);reportRemainingTotal.textContent=formatMoney(remainingInstallmentTotal);reportExpensesTotal.textContent=formatMoney(monthExpenseTotal);reportAllTotal.textContent=formatMoney(allPaidTotal);
  const chartTotal=paidInstallmentTotal+remainingInstallmentTotal;const paidPercentage=chartTotal?Math.round(paidInstallmentTotal/chartTotal*100):0,remainingPercentage=chartTotal?Math.round(remainingInstallmentTotal/chartTotal*100):0;
  paidPercent.textContent=`${paidPercentage.toLocaleString("fa-IR")}٪`;remainingPercent.textContent=`${remainingPercentage.toLocaleString("fa-IR")}٪`;paidBar.style.width=`${paidPercentage}%`;remainingBar.style.width=`${remainingPercentage}%`
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
refreshButton.addEventListener("click",loadData);
navButtons.forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.page,b.dataset.title)));
searchInput.addEventListener("input",()=>{visibleCount=PAGE_SIZE;renderAllCards()});
typeFilters.forEach(b=>b.addEventListener("click",()=>{typeFilters.forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;visibleCount=PAGE_SIZE;renderAllCards()}));
statusFilters.forEach(b=>b.addEventListener("click",()=>{statusFilters.forEach(x=>x.classList.remove("active"));b.classList.add("active");activeStatusFilter=b.dataset.status;visibleCount=PAGE_SIZE;renderAllCards()}));
loadMoreButton.addEventListener("click",()=>{visibleCount+=PAGE_SIZE;renderAllCards()});
document.querySelectorAll(".report-card[data-report]").forEach(c=>c.addEventListener("click",()=>openReportDetails(c.dataset.report)));
closeReportDetails.addEventListener("click",closeReportModal);reportDetailsModal.querySelector(".modal-backdrop").addEventListener("click",closeReportModal);
// جایگزین خط 893:
// addExpenseButton.addEventListener("click",openNewModal);

const fabMenu = $("fabMenu");

addExpenseButton.addEventListener("click", () => {
  const isOpen = !fabMenu.classList.contains("hidden");
  if (isOpen) {
    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
  } else {
    fabMenu.classList.remove("hidden");
    fabMenu.classList.remove("animating");
    void fabMenu.offsetWidth; // reflow
    fabMenu.classList.add("animating");
    addExpenseButton.classList.add("open");
  }
});
function openModal(){

    expenseModal.classList.add("open");

    document.body.style.overflow="hidden";

}
function loadIncomeOptions(){
    const select = $("paymentItemSelect");
    if(!select) return;
    select.innerHTML = `<option value="">انتخاب کنید</option>`;
    allExpenses
        .filter(isIncome)
        .forEach(item=>{
            const option=document.createElement("option");
            option.value=item.id;
            option.textContent=item.title;
            select.appendChild(option);
        });
}

function openWithType(type) {
  fabMenu.classList.add("hidden");
  addExpenseButton.classList.remove("open");
  resetExpenseForm();
  setExpenseType(type);
  openModal();
}


// بستن منو با کلیک خارج از آن
document.addEventListener("click", e => {
  if (!$("fabContainer").contains(e.target)) {
    fabMenu.classList.add("hidden");
    addExpenseButton.classList.remove("open");
  }
});
 

///addExpenseButton.addEventListener("click",openNewModal);closeExpenseModalButton.addEventListener("click",closeModal);expenseModal.querySelector(".modal-backdrop").addEventListener("click",closeModal);

installmentTypeButton.addEventListener("click",()=>setExpenseType("installment"));
setupTransferButtons();
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

// تغییر فرم دریافت / پرداخت
let paymentOperationType = "payment";

document.querySelectorAll(".payment-type-btn")
.forEach(btn => {

    btn.addEventListener("click",()=>{

        // فعال کردن دکمه
        document.querySelectorAll(".payment-type-btn")
        .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");


        // نوع عملیات
        paymentOperationType = btn.dataset.type;

        $("paymentType").value = paymentOperationType;


        const title = $("paymentModalTitle");
        const amountLabel = $("paymentAmount")
            .closest(".field")
            .querySelector("span");


       const titleField = $("paymentItemSelect").closest(".field");
       const incomeField = $("paymentIncomeSelect").closest(".field");
       


if(paymentOperationType==="payment"){

    title.textContent="ثبت پرداخت";

    titleField.style.display="block";
    // پیدا کردن خط‌ای که incomeField.style.display استفاده شده و قبلش اضافه کن:
const incomeField = $("paymentItemSelect").closest(".field");

    incomeField.style.display="none";

}
else{

    title.textContent="ثبت دریافت";

    titleField.style.display="none";
    // پیدا کردن خط‌ای که incomeField.style.display استفاده شده و قبلش اضافه کن:
const incomeField = $("paymentItemSelect").closest(".field");

    incomeField.style.display="block";

}

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
$("paymentForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const type = document.querySelector('input[name="paymentType"]:checked')?.value;
    const itemId = $("paymentItemSelect").value;
    const amount = $("paymentAmount").value;
    const date = $("paymentDate").value;
    const note = $("paymentNote")?.value || "";

    if(!type || !itemId || !amount || !date) return;

    const { error } = await supabase.from("transactions").insert([{
        expense_id: itemId,
        amount: parseFloat(amount),
        date,
        note,
        type
    }]);

    if(!error){
        closeModal("paymentModal");
        await loadData();
    }
});


transferModal.classList.remove("open");

document.body.style.overflow="";


alert("انتقال ثبت شد");

});
loadData().then(()=>{
    openPage("duePage","⏰ سررسید اقساط");
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

["expenseModal", "transferModal", "paymentModal"].forEach(addSwipeToClose);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registered:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}
