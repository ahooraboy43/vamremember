import{useCallback,useEffect,useMemo,useState}from"react";
import Header from"./components/Header";import BottomNav from"./components/BottomNav";import Fab from"./components/Fab";import Modal from"./components/Modal";
import Dashboard from"./pages/Dashboard";import DuePage from"./pages/DuePage";import Installments from"./pages/Installments";import Reports from"./pages/Reports";import Transactions from"./pages/Transactions";import Settings from"./pages/Settings";
import{loadExpenses,insertExpense,updateExpense,deleteExpense,currentMonth}from"./services/vamData";import"./styles.css";
const titles={dashboard:"VamRemember",due:"سررسیدها",installments:"اقساط",reports:"گزارش‌ها",transactions:"تراکنش‌ها",settings:"تنظیمات"};
export default function App(){
const[page,setPage]=useState("dashboard"),[items,setItems]=useState([]),[error,setError]=useState(""),[refreshing,setRefreshing]=useState(false),[modal,setModal]=useState(null),[editing,setEditing]=useState(null),[theme,setTheme]=useState("dark");
const today=useMemo(()=>new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date()),[]);
const refresh=useCallback(async()=>{setRefreshing(true);setError("");try{setItems(await loadExpenses())}catch(e){console.error(e);setError(e.message||"خطا در دریافت اطلاعات")}finally{setRefreshing(false)}},[]);
useEffect(()=>{refresh()},[refresh]);
useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
async function save(form){try{const m=currentMonth();const row={title:form.title,amount:Number(form.amount)||0,due_day:form.due_day?Number(form.due_day):null,type:form.type};if(form.type==="expense"||form.type==="income")row[m.key]=String(Number(form.amount)||0);
if(editing){await updateExpense(editing.id,row)}else{await insertExpense(row)}setModal(null);setEditing(null);await refresh()}catch(e){alert(e.message||"ذخیره انجام نشد")}}
async function pay(item){try{const m=currentMonth();await updateExpense(item.id,{[m.key]:String(item.amount)});await refresh()}catch(e){alert(e.message||"پرداخت ثبت نشد")}}
async function remove(item){if(!confirm(`«${item.title||"این مورد"}» حذف شود؟`))return;try{await deleteExpense(item.id);await refresh()}catch(e){alert(e.message||"حذف انجام نشد")}}
const add=type=>{setEditing(null);setModal(type)};const edit=x=>{setEditing(x);setModal("edit")};
let content=page==="dashboard"?<Dashboard items={items} error={error} onNavigate={setPage}/>:page==="due"?<DuePage items={items} onPay={pay}/>:page==="installments"?<Installments items={items} onPay={pay} onEdit={edit}/>:page==="reports"?<Reports items={items}/>:page==="transactions"?<Transactions items={items} onEdit={edit} onDelete={remove}/>:<Settings theme={theme} setTheme={setTheme} onRefresh={refresh}/>;
return <div className="app-shell" dir="rtl"><div className="app"><Header title={titles[page]} today={today} onRefresh={refresh} onSettings={()=>setPage("settings")} refreshing={refreshing}/>{content}
<Fab onAdd={add}/><BottomNav active={page} onChange={setPage}/>
<Modal open={!!modal} title={editing?"ویرایش":"ثبت مورد جدید"} onClose={()=>{setModal(null);setEditing(null)}}><Form initial={editing} type={editing?.type||modal} onSave={save}/></Modal>
</div></div>}
function Form({initial,type,onSave}){const[f,setF]=useState({title:initial?.title||"",amount:initial?.amount||"",due_day:initial?.due_day||"",type:type==="edit"?(initial?.type||"expense"):type});const set=(k,v)=>setF(x=>({...x,[k]:v}));
return <form className="form-grid" onSubmit={e=>{e.preventDefault();onSave(f)}}><label>عنوان<input value={f.title} onChange={e=>set("title",e.target.value)} required/></label><label>مبلغ<input type="number" inputMode="numeric" value={f.amount} onChange={e=>set("amount",e.target.value)} required/></label>{(f.type==="installment"||initial?.due_day)&&<label>روز سررسید<input type="number" min="1" max="31" value={f.due_day} onChange={e=>set("due_day",e.target.value)}/></label>}<label>نوع<select value={f.type} onChange={e=>set("type",e.target.value)}><option value="expense">هزینه</option><option value="income">درآمد</option><option value="installment">قسط</option></select></label><button className="primary-action" type="submit">ذخیره</button></form>}
