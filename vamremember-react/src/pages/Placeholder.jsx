export default function Placeholder({ title, icon }) {
  return (
    <main className="page active">
      <section className="placeholder">
        <div className="placeholder-icon">{icon}</div>
        <h2>{title}</h2>
        <p>این بخش در مرحله بعد از نسخه فعلی VamRemember منتقل می‌شود.</p>
      </section>
    </main>
  );
}
