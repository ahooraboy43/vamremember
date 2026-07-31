const items=[
 {id:"due",label:"سررسیدها",icon:"📅"},{id:"dashboard",label:"خانه",icon:"⌂"},
 {id:"installments",label:"اقساط",icon:"💳"},{id:"reports",label:"گزارش",icon:"📊"}];
export default function BottomNav({active,onChange}){return <nav className="bottom-nav">
 {items.map(x=><button key={x.id} className={`nav-button ${active===x.id?"active":""}`} onClick={()=>onChange(x.id)}>
 <span className="nav-icon">{x.icon}</span><span>{x.label}</span></button>)}</nav>}
