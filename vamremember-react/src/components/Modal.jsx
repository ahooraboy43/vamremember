export default function Modal({open,title,onClose,children,wide=false}){
 if(!open)return null;
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
   <section className={`modal-card ${wide?"wide":""}`}>
    <header className="modal-header"><h3>{title}</h3><button onClick={onClose}>×</button></header>
    <div className="modal-body">{children}</div>
   </section>
 </div>
}
