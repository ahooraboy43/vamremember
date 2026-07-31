import {useState} from "react";
export default function Fab({onAdd}){const[open,setOpen]=useState(false);return <div className="fab-container">
 {open&&<div className="fab-menu">
  <button onClick={()=>{setOpen(false);onAdd("expense")}}>➕ ثبت هزینه</button>
  <button onClick={()=>{setOpen(false);onAdd("installment")}}>💳 ثبت قسط</button>
  <button onClick={()=>{setOpen(false);onAdd("income")}}>💵 ثبت درآمد</button>
 </div>}
 <button className={`fab ${open?"open":""}`} onClick={()=>setOpen(v=>!v)}>{open?"×":"+"}</button></div>}
