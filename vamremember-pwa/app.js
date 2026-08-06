const SUPABASE_URL = "https://yfgyauzuzznlhradsrbo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZ3lhdXp1enpubGhyYWRzcmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDIxOTMsImV4cCI6MjA5OTQxODE5M30.Mshjl3p-fJtkTuRSKP_3DhNe9IW7D6jv1C9pD_bv39A";
const TABLE_NAME = "expenses";
const TRANSACTION_TABLE = "transactions";
const MONTHS = [
  { key: "farvardin", name: "فروردین" },
  { key: "ordibehesht", name: "اردیبهشت" },
  { key: "khordad", name: "خرداد" },
  { key: "tir", name: "تیر" },
  { key: "mordad", name: "مرداد" },
  { key: "shahrivar", name: "شهریور" },
  { key: "mehr", name: "مهر" },
  { key: "aban", name: "آبان" },
  { key: "azar", name: "آذر" },
  { key: "dey", name: "دی" },
  { key: "bahman", name: "بهمن" },
  { key: "esfand", name: "اسفند" }
];
const DEBT_TABLE = "debts";
let allDebts = [];
let editingDebtId = null;

// =========================================================
// سیستم مدیریت داده مرکزی
// =========================================================

const DataManager = {
  KEYS: {
    BANKS: 'banks',
    BANK_CARDS: 'bankCardsV1',
    SETTINGS: 'appSettingsV1',
    SESSION: 'appUnlockedV1'
  },
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('❌ خطا در ذخیره:', e);
      return false;
    }
  },
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return defaultValue;
      return JSON.parse(data);
    } catch (e) {
      console.error('❌ خطا در خواندن:', e);
      return defaultValue;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('❌ خطا در حذف:', e);
      return false;
    }
  },
  getBanks() {
    return this.load(this