import {useMemo} from "react";import{calculateReport,currentMonth,money}from"../services/vamData";
export default function Dashboard({items,error,onNavigate}){const r=useMemo(()=>calculateReport(items),[items]);const m=currentMonth();
return <main className="page active">{error&&<div className="status error">{error}</div>}
<section className="home-balance-card"><small>{m.name} {m.year}</small><h1>داشبورد مالی</h1>
<div className="balance-row"><div><span>مانده ماه</span><strong>{money(r.balance)}</strong></div><div><span>هزینه ماه</span><strong>{money(r.expense)}</strong></div></div></section>
<div className="home-status-grid"><article className="status-card" onClick={()=>onNavigate("due")}><span className="status-icon">📅</span><div><small>سررسیدها</small><strong>{items.filter(x=>x.due_day).length.toLocaleString("fa-IR")}</strong></div></article>
<article className="status-card" onClick={()=>onNavigate("installments")}><span className="status-icon">💳</span><div><small>اقساط</small><strong>{items.filter(x=>String(x.type||"").includes("install")||Number(x.id)<10000).length.toLocaleString("fa-IR")}</strong></div></article></div>
<div className="section-title">خلاصه ماه جاری</div><div className="cards">
{[["💳","کل اقساط",r.installment],["✅","پرداخت اقساط",r.paidInstallment],["💸","هزینه‌ها",r.expense],["💵","درآمد",r.income]].map(x=><article className="card" key={x[1]}><div className="card-main"><div className="top"><div className="name">{x[0]} {x[1]}</div><div className="amount">{money(x[2])}</div></div><div className="meta">{m.name}</div></div></article>)}</div>
<div className="status success">اتصال به Supabase برقرار است · {items.length.toLocaleString("fa-IR")} رکورد</div></main>}
