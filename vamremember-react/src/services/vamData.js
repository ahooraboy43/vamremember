import { supabase } from "./supabase";

export const MONTHS = [
  ["farvardin","فروردین"],["ordibehesht","اردیبهشت"],["khordad","خرداد"],
  ["tir","تیر"],["mordad","مرداد"],["shahrivar","شهریور"],
  ["mehr","مهر"],["aban","آبان"],["azar","آذر"],["dey","دی"],
  ["bahman","بهمن"],["esfand","اسفند"]
];

export function persianDate() {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());
  const out = {};
  for (const p of parts) if (["year","month","day"].includes(p.type)) out[p.type] =
    Number(String(p.value).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  return out;
}
export function currentMonth() {
  const p = persianDate();
  return { index:p.month-1, key:MONTHS[p.month-1]?.[0] || "farvardin", name:MONTHS[p.month-1]?.[1] || "فروردین", day:p.day, year:p.year };
}
export function isNull(v){ return v === null || v === undefined || v === ""; }
export function isClosed(v){ return String(v ?? "").trim().toUpperCase() === "CLOSE"; }
export function isPaid(v){ return !isNull(v) && !isClosed(v); }
export function parseMoney(v){
  if(isNull(v) || isClosed(v)) return null;
  const n=Number(String(v).split(/\s*-\s*/)[0].replace(/[,\s٬]/g,""));
  return Number.isFinite(n)?n:null;
}
export function money(v){ return `${Number(v||0).toLocaleString("fa-IR")} ریال`; }

export function kind(i){
  const id=Number(i.id);
  const t=String(i.type||i.category||"").toLowerCase();
  if(t.includes("income")||t.includes("درآمد")||t.includes("deposit")) return "income";
  if(t.includes("expense")||t.includes("هزینه")||t.includes("withdraw")) return "expense";
  if(t.includes("installment")||t.includes("قسط")) return "installment";
  if(id>=20000 && id<30000) return "income";
  if(id>=10000 && id<20000) return "expense";
  return "installment";
}
export const isInstallment=i=>kind(i)==="installment";
export const isExpense=i=>kind(i)==="expense";
export const isIncome=i=>kind(i)==="income";

export async function loadExpenses(){
  const {data,error}=await supabase.from("expenses").select("*").order("id",{ascending:true});
  if(error) throw error;
  return Array.isArray(data)?data:[];
}
export async function insertExpense(row){
  const {data,error}=await supabase.from("expenses").insert(row).select().single();
  if(error) throw error;
  return data;
}
export async function updateExpense(id,row){
  const {data,error}=await supabase.from("expenses").update(row).eq("id",id).select().single();
  if(error) throw error;
  return data;
}
export async function deleteExpense(id){
  const {error}=await supabase.from("expenses").delete().eq("id",id);
  if(error) throw error;
}
export function calculateReport(items){
  const {key}=currentMonth();
  let installment=0,paidInstallment=0,remaining=0,expense=0,income=0;
  for(const i of items){
    if(isInstallment(i)){
      const a=Number(i.amount||0);
      if(!isClosed(i[key])) installment+=a;
      if(isPaid(i[key])) paidInstallment+=a;
      if(isNull(i[key])) remaining+=a;
    } else if(isExpense(i)){
      const n=parseMoney(i[key]); if(n!==null) expense+=n;
    } else if(isIncome(i)){
      const n=parseMoney(i[key]); if(n!==null) income+=n;
    }
  }
  return {installment,paidInstallment,remaining,expense,income,balance:income-paidInstallment-expense};
}
