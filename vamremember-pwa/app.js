const SUPABASE_URL = "https://yfgyauzuzznlhradsrbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A";
const TABLE_NAME="expenses";
const MONTHS=[{key:"farvardin",name:"فروردین"},{key:"ordibehesht",name:"اردیبهشت"},{key:"khordad",name:"خرداد"},{key:"tir",name:"تیر"},{key:"mordad",name:"مرداد"},{key:"shahrivar",name:"شهریور"},{key:"mehr",name:"مهر"},{key:"aban",name:"آبان"},{key:"azar",name:"آذر"},{key:"dey",name:"دی"},{key:"bahman",name:"بهمن"},{key:"esfand",name:"اسفند"}];
const PAGE_SIZE=10;
let allExpenses=[],visibleCount=PAGE_SIZE,activeFilter="all",activeStatusFilter="all",currentMonthKey=null,currentMonthIndex=0;
const $=id=>document.getElementById(id);
const cards=$("cards"),statusBox=$("status"),refreshButton=$("refresh"),todayElement=$("today");
const pages=document.querySelectorAll(".page"),navButtons=document.querySelectorAll(".nav-button"),pageTitle=$("pageTitle");
const allCards=$("allCards"),allStatus=$("allStatus"),searchInput=$("searchInput"),loadMoreButton=$("loadMore");
const typeFilters=document.querySelectorAll(".type-filter"),statusFilters=document.querySelectorAll(".status-filter"),addExpenseButton=$("addExpenseButton");
const expenseModal=$("expenseModal"),closeExpenseModalButton=$("closeExpenseModal"),expenseModalTitle=$("expenseModalTitle"),expenseForm=$("expenseForm");
const editExpenseId=$("editExpenseId"),expenseType=$("expenseType"),installmentTypeButton=$("installmentTypeButton"),expenseTypeButton=$("expenseTypeButton");
const expenseTitleLabel=$("expenseTitleLabel"),expenseTitle=$("expenseTitle"),expenseAmount=$("expenseAmount"),expenseDueDay=$("expenseDueDay"),expenseInstallments=$("expenseInstallments"),installmentFields=$("installmentFields"),startMonthLabel=$("startMonthLabel"),expenseStartMonth=$("expenseStartMonth"),expenseNote=$("expenseNote"),monthsEditor=$("monthsEditor"),monthFields=$("monthFields"),saveExpenseButton=$("saveExpenseButton");
const reportMonthTotal=$("reportMonthTotal"),reportPaidTotal=$("reportPaidTotal"),reportRemainingTotal=$("reportRemainingTotal"),reportExpensesTotal=$("reportExpensesTotal"),reportAllTotal=$("reportAllTotal"),paidPercent=$("paidPercent"),remainingPercent=$("remainingPercent"),paidBar=$("paidBar"),remainingBar=$("remainingBar");
const reportDetailsModal=$("reportDetailsModal"),reportDetailsTitle=$("reportDetailsTitle"),reportDetailsList=$("reportDetailsList"),closeReportDetails=$("closeReportDetails");

function getHeaders(){return{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"}}
async function supabaseRequest(path,options={}){const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...getHeaders(),...(options.headers||{})}});const text=await response.text();if(!response.ok)throw new Error(text||`HTTP ${response.status}`);return text?JSON.parse(text):null}
function toEnglishDigits(value){return String(value).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))}
function getPersianDateParts(){const parts=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date()),v={};for(const p of parts)if(["year","month","day"].includes(p.type))v[p.type]=Number(toEnglishDigits(p.value));return v}
function updatePersianDate(){todayElement.textContent=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date());const p=getPersianDateParts();currentMonthIndex=p.month-1;currentMonthKey=MONTHS[currentMonthIndex].key}
function isExpense(i){return Number(i.id)>=10000}
function isInstallment(i){return !isExpense(i)}
function isNullValue(v){return v===null||v===undefined||v===""}
function isClosedValue(v){return String(v||"").trim().toUpperCase()==="CLOSE"}
function isPaidValue(v){return !isNullValue(v)&&!isClosedValue(v)}
function formatMoney(v){return Number(v||0).toLocaleString("fa-IR")+" ریال"}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function getCurrentPersianDay(){return getPersianDateParts().day}
function parseMoney(v){if(isNullValue(v)||isClosedValue(v))return null;const n=Number(String(v).replace(/[,\s٬]/g,""));return Number.isFinite(n)?n:null}
function getRemainingInstallments(item){if(!isInstallment(item))return 0;let n=0;for(const m of MONTHS)if(isNullValue(item[m.key]))n++;return n}
function getPaidCount(item){let n=0;for(const m of MONTHS)if(isPaidValue(item[m.key]))n++;return n}
function getLatestExpenseAmount(item){for(let i=currentMonthIndex;i>=0;i--){const n=parseMoney(item[MONTHS[i].key]);if(n!==null)return n}for(let i=MONTHS.length-1;i>currentMonthIndex;i--){const n=parseMoney(item[MONTHS[i].key]);if(n!==null)return n}return Number(item.amount||0)}
function getExpenseTotal(item){let total=0;for(const m of MONTHS){const n=parseMoney(item[m.key]);if(n!==null)total+=n}return total}
function extractPaymentDate(v){if(!isPaidValue(v))return "";const s=String(v);const matches=s.match(/[۰-۹0-9]{4}[\/\-][۰-۹0-9]{1,2}[\/\-][۰-۹0-9]{1,2}/g);return matches?.at(-1)||s}
function currentStatus(item){const v=item[currentMonthKey];if(isClosedValue(v))return"بسته";return isPaidValue(v)?"پرداخت‌شده":"پرداخت‌نشده"}

async function loadData(){refreshButton.disabled=true;statusBox.textContent="در حال دریافت اطلاعات…";allStatus.textContent="در حال دریافت اطلاعات…";try{const data=await supabaseRequest(`${TABLE_NAME}?select=*&order=id.asc`);
allExpenses=Array.isArray(data)?data:[];
renderDueCards();
renderAllCards();
renderDueCards();
renderReports();
visibleCount=PAGE_SIZE;renderAllCards();renderReports();statusBox.textContent=`${allExpenses.length.toLocaleString("fa-IR")} مورد دریافت شد`;allStatus.textContent=`${allExpenses.length.toLocaleString("fa-IR")} مورد موجود است`}catch(e){console.error(e);statusBox.textContent=`خطا در دریافت اطلاعات: ${e.message}`;allStatus.textContent=`خطا در دریافت اطلاعات: ${e.message}`}finally{refreshButton.disabled=false}}

function getDueItems(){const today=getCurrentPersianDay();return allExpenses.filter(isInstallment).filter(i=>isNullValue(i[currentMonthKey])&&Number.isFinite(Number(i.due_day))&&Number(i.due_day)>0).map(i=>({...i,daysRemaining:Number(i.due_day)-today})).filter(i=>i.daysRemaining<=7).sort((a,b)=>a.daysRemaining-b.daysRemaining)}
function renderDueCards(){const items=getDueItems();cards.innerHTML="";if(!items.length){cards.innerHTML='<div class="empty">قسط سررسیدشده یا نزدیک به سررسید وجود ندارد</div>';return}items.forEach(i=>cards.appendChild(createDueCard(i)))}
function createDueCard(item){const card=document.createElement("article");card.className="card "+(item.daysRemaining<0?"overdue":"soon");const dayText=item.daysRemaining<0?`${Math.abs(item.daysRemaining).toLocaleString("fa-IR")} روز گذشته`:item.daysRemaining===0?"امروز":`${item.daysRemaining.toLocaleString("fa-IR")} روز مانده`;card.innerHTML=`<div class="card-main"><div class="top"><div class="name">${escapeHtml(item.title)}</div><div class="days">${dayText}</div></div><div class="amount">${formatMoney(item.amount)}</div><div class="meta">سررسید: روز ${Number(item.due_day).toLocaleString("fa-IR")}ام</div><div class="installment-badge">${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی مانده</div></div>${createPaymentPanelHtml()}`;card.querySelector(".card-main").addEventListener("click",()=>{document.querySelectorAll("#cards .card.open").forEach(c=>{if(c!==card)c.classList.remove("open")});card.classList.toggle("open")});setupPaymentPanel(card,item);return card}
function createPaymentPanelHtml(){return`<div class="payment-panel"><div class="payment-title">ثبت پرداخت</div><textarea class="payment-note" placeholder="توضیح پرداخت..."></textarea><div class="quick-tags"><button type="button" class="tag-btn" data-tag="بانک ملی">بانک ملی</button><button type="button" class="tag-btn" data-tag="بانک رفاه">بانک رفاه</button><button type="button" class="tag-btn" data-tag="ویپاد">ویپاد</button><button type="button" class="tag-btn" data-tag="بلو بانک">بلو بانک</button><button type="button" class="tag-btn" data-tag="پرداخت شد">پرداخت شد</button><button type="button" class="tag-btn" data-tag="واریز بانکی">واریز بانکی</button><button type="button" class="tag-btn" data-tag="پرداخت اینترنتی">پرداخت اینترنتی</button></div><label class="date-option"><input type="checkbox" class="add-date" checked>افزودن تاریخ پرداخت</label><label class="confirm-option"><input type="checkbox" class="confirm-payment">پرداخت این قسط را تأیید می‌کنم</label><div class="payment-actions"><button type="button" class="cancel-payment">انصراف</button><button type="button" class="save-payment">ثبت پرداخت</button></div></div>`}
function setupPaymentPanel(card,item){const note=card.querySelector(".payment-note"),confirm=card.querySelector(".confirm-payment"),addDate=card.querySelector(".add-date"),save=card.querySelector(".save-payment");card.querySelectorAll(".tag-btn").forEach(b=>b.addEventListener("click",()=>{note.value=note.value.trim()?`${note.value.trim()} - ${b.dataset.tag}`:b.dataset.tag}));card.querySelector(".cancel-payment").addEventListener("click",()=>card.classList.remove("open"));save.addEventListener("click",async()=>{if(!confirm.checked){alert("ابتدا تأیید پرداخت را فعال کنید.");return}let text=note.value.trim();if(addDate.checked){const d=new Intl.DateTimeFormat("fa-IR-u-ca-persian").format(new Date());text=text?`${text} - ${d}`:d}if(!text)text="پرداخت شد";save.disabled=true;save.textContent="در حال ثبت…";try{await supabaseRequest(`${TABLE_NAME}?id=eq.${item.id}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({[currentMonthKey]:text})});await loadData()}catch(e){alert(`خطا در ثبت پرداخت:\n${e.message}`)}finally{save.disabled=false;save.textContent="ثبت پرداخت"}})}

function getFilteredItems() {
  const s = searchInput.value.trim().toLowerCase();

 return allExpenses.filter(i => {

    if (activeFilter === "installment" && !isInstallment(i)) {
      return false;
    }

    if (activeFilter === "expense" && !isExpense(i)) {
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
  const expense=isExpense(item),card=document.createElement("article"),v=item[currentMonthKey];
  card.className=`card compact-card ${expense?"expense-card":""} ${!expense&&isPaidValue(v)?"paid-card":""}`;
  const mainAmount=expense?getLatestExpenseAmount(item):Number(item.amount||0);
  const secondary=expense?`جمع کل: ${formatMoney(getExpenseTotal(item))}`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} مانده`;
  const counter=expense?`${getPaidCount(item).toLocaleString("fa-IR")} پرداخت`:`${getRemainingInstallments(item).toLocaleString("fa-IR")} قسط باقی‌مانده`;
  card.innerHTML=`<div class="card-main compact-main">
    <div class="compact-head"><div class="compact-amount-wrap"><div class="amount compact-amount">${formatMoney(mainAmount)}</div></div><div class="compact-side">${counter}</div><div class="id-badge">ID ${Number(item.id).toLocaleString("fa-IR")}</div></div>
    <div class="compact-foot"><div class="compact-title">${escapeHtml(item.title)}</div><div class="badge-row"><span class="${expense?"expense-badge":"installment-badge"}">${expense?"🧾 هزینه":"💳 قسط"}</span><span class="status-badge">${currentStatus(item)}</span></div></div>
    <div class="all-card-actions"><button type="button" class="edit-expense">ویرایش</button></div>
  </div>`;
  card.querySelector(".edit-expense").addEventListener("click",e=>{e.stopPropagation();openEditModal(item)});return card
}
function getExpenseAmount(item){return getLatestExpenseAmount(item)}

function setExpenseType(type){expenseType.value=type;installmentTypeButton.classList.toggle("active",type==="installment");expenseTypeButton.classList.toggle("active",type==="expense");installmentFields.classList.toggle("hidden",type!=="installment");expenseTitleLabel.textContent=type==="installment"?"عنوان قسط":"عنوان هزینه";startMonthLabel.textContent=type==="installment"?"ماه شروع":"ماه هزینه";expenseDueDay.required=type==="installment";expenseInstallments.required=type==="installment";saveExpenseButton.textContent=editExpenseId.value?"ذخیره تغییرات":type==="installment"?"ثبت قسط":"ثبت هزینه"}
function openModal(){expenseModal.classList.add("open");document.body.style.overflow="hidden"}
function closeModal(){expenseModal.classList.remove("open");document.body.style.overflow=""}
function resetExpenseForm(){expenseForm.reset();editExpenseId.value="";monthsEditor.classList.add("hidden");monthFields.innerHTML="";expenseStartMonth.value=currentMonthKey;expenseModalTitle.textContent="ثبت مورد جدید";setExpenseType("installment")}
function openNewModal(){resetExpenseForm();openModal()}
function openEditModal(item){
  resetExpenseForm();

  editExpenseId.value=item.id;
  expenseTitle.value=item.title||"";
  expenseNote.value=item.note||"";

  const type=isExpense(item)?"expense":"installment";

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

  expenseModalTitle.textContent=
      type==="installment"
      ?"ویرایش قسط"
      :"ویرایش هزینه";

  buildMonthEditor(item);
  monthsEditor.classList.remove("hidden");

  saveExpenseButton.textContent="ذخیره تغییرات";

  openModal();
}
function findStartMonth(item){for(const m of MONTHS)if(!isClosedValue(item[m.key]))return m.key;return currentMonthKey}
function buildMonthEditor(item){monthFields.innerHTML="";for(const m of MONTHS){const w=document.createElement("div");w.className="month-field";w.innerHTML=`<label>${m.name}</label><input type="text" data-month="${m.key}" value="${escapeHtml(item[m.key]??"")}" placeholder="NULL / CLOSE / مقدار پرداخت">`;monthFields.appendChild(w)}}
function getNextId(type){const ids=allExpenses.filter(type==="expense"?isExpense:isInstallment).map(i=>Number(i.id)).filter(Number.isFinite);return ids.length?Math.max(...ids)+1:type==="expense"?10000:1}
async function saveExpense(e){e.preventDefault();const type=expenseType.value,editingId=editExpenseId.value?Number(editExpenseId.value):null,title=expenseTitle.value.trim(),amount=Number(expenseAmount.value);if(!title){alert("عنوان را وارد کنید.");return}if(!Number.isFinite(amount)||amount<0){alert("مبلغ معتبر نیست.");return}if(type==="installment"){const d=Number(expenseDueDay.value),c=Number(expenseInstallments.value);if(!Number.isFinite(d)||d<1||d>31){alert("روز سررسید معتبر نیست.");return}if(!Number.isFinite(c)||c<1){alert("تعداد اقساط معتبر نیست.");return}}saveExpenseButton.disabled=true;saveExpenseButton.textContent="در حال ذخیره…";try{let body=editingId?buildEditBody(type):buildNewBody(type);if(!editingId)body.id=getNextId(type);await supabaseRequest(editingId?`${TABLE_NAME}?id=eq.${editingId}`:TABLE_NAME,{method:editingId?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});closeModal();await loadData()}catch(err){alert(`خطا در ذخیره:\n${err.message}`)}finally{saveExpenseButton.disabled=false;setExpenseType(expenseType.value)}}
function buildNewBody(type){const idx=MONTHS.findIndex(m=>m.key===expenseStartMonth.value),body={title:expenseTitle.value.trim(),note:expenseNote.value.trim()||null};if(type==="installment"){body.amount=Number(expenseAmount.value);body.due_day=Number(expenseDueDay.value);body.installment_count=Number(expenseInstallments.value);MONTHS.forEach((m,i)=>body[m.key]=i<idx?"CLOSE":null)}else{body.amount=null;body.due_day=null;body.installment_count=null;MONTHS.forEach((m,i)=>body[m.key]=i<idx?"CLOSE":i===idx?Number(expenseAmount.value):null)}return body}
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
addExpenseButton.addEventListener("click",openNewModal);closeExpenseModalButton.addEventListener("click",closeModal);expenseModal.querySelector(".modal-backdrop").addEventListener("click",closeModal);
installmentTypeButton.addEventListener("click",()=>setExpenseType("installment"));expenseTypeButton.addEventListener("click",()=>setExpenseType("expense"));expenseForm.addEventListener("submit",saveExpense);
updatePersianDate();
expenseStartMonth.value=currentMonthKey;
setExpenseType("installment");

loadData().then(()=>{
    openPage("duePage","⏰ سررسید اقساط");
});
