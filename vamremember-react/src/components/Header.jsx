export default function Header({ title, today, onRefresh, onSettings, refreshing }) {
  return (
    <header className="app-header">
      <div>
        <h1 id="pageTitle">💰 {title}</h1>
        <div id="today">{today}</div>
      </div>
      <div className="header-actions">
        <button className={`icon-button ${refreshing ? "spin" : ""}`} onClick={onRefresh} disabled={refreshing} aria-label="تازه‌سازی">↻</button>
        <button className="icon-button" onClick={onSettings} aria-label="تنظیمات">⚙️</button>
      </div>
    </header>
  );
}
