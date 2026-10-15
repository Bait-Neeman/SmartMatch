import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { getCurrentUser } from "../services/auth.service.js";
import { getSession, logout } from "../utils/session.js";
import { tokenVars } from "../theme/tokens.js";
import { Avatar, Icon } from "../components/settings/icons.jsx";
import "./settings.css";

const NAV = [
  { to: "/personal-area", label: "דף הבית", icon: "home" },
  { to: "/matches", label: "הצעות", icon: "list" },
  { to: "/interests", label: "הצעות פעילות", icon: "heart" },
  { label: "בטיפול שדכן", icon: "send", placeholder: true },
  { to: "/personal-area", label: "הפרופיל שלי", icon: "user" },
  { to: "/preferences", label: "העדפות", icon: "sliders" },
  { to: "/settings", label: "הגדרות", icon: "settings", end: true },
];

const NOTIFICATION_ROWS = [
  { key: "newSuggestion", title: "הצעה חדשה", detail: "כשנבחרת עבורך הצעה חדשה", defaultOn: true },
  { key: "interestReceived", title: "התקבלה התעניינות", detail: "כשמישהו שולח אלייך התעניינות", defaultOn: true },
  { key: "activeSuggestion", title: "הצעה פעילה חדשה", detail: "כשההתעניינות אושרה הדדית והפרטים נחשפו", defaultOn: true },
  { key: "matchmakerRequest", title: "הצד השני מעוניין להתקדם לשדכן", detail: "כשהצד השני העביר לטיפול שדכן", defaultOn: true },
  { key: "matchmakerStarted", title: "העברה לשדכן", detail: "כששני הצדדים העבירו והשדכן התחיל לטפל", defaultOn: true },
  { key: "emailDigest", title: "עדכונים במייל", detail: "סיכום שבועי לכתובת המייל", defaultOn: false },
];

const UNAVAILABLE = "הפעולה הזו עדיין לא זמינה בחשבון.";

const initialToggles = () =>
  Object.fromEntries(NOTIFICATION_ROWS.map((row) => [row.key, row.defaultOn]));

function Toggle({ on, label, onToggle }) {
  return (
    <button
      type="button"
      className={on ? "bn-tgl on" : "bn-tgl"}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
    >
      <i />
    </button>
  );
}

export default function SettingsPage() {
  const session = getSession();
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState(session.user?.name || "");
  const [email, setEmail] = useState(session.user?.email || "");
  const emailDirty = useRef(false);
  const [toggles, setToggles] = useState({
    ...initialToggles(),
    showMatchPercent: true,
    pauseSuggestions: false,
  });

  useEffect(() => {
    let ignore = false;

    getCurrentUser()
      .then((data) => {
        const user = data?.user;
        if (ignore || !user) return;
        if (user.name) setName(user.name);
        if (user.email && !emailDirty.current) setEmail(user.email);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const unavailable = () => setNotice(UNAVAILABLE);

  const flip = (key) => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  const displayName = name || "חשבון";

  return (
    <div className="bn-settings" style={tokenVars}>
      {navOpen && (
        <button type="button" className="bn-backdrop" aria-label="סגירת תפריט" onClick={() => setNavOpen(false)} />
      )}

      <aside className={navOpen ? "bn-side open" : "bn-side"}>
        <div className="bn-logo">
          <span className="bn-wordmark">בית נאמן</span>
        </div>

        <NavLink className="bn-me" to="/personal-area" onClick={() => setNavOpen(false)}>
          <Avatar className="bn-av" />
          <div>
            <b>{displayName}</b>
            <small>לפרופיל שלי</small>
          </div>
        </NavLink>

        <nav className="bn-nav">
          {NAV.map((item) =>
            item.placeholder ? (
              <button key={item.label} type="button" onClick={unavailable}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "on" : undefined)}
                onClick={() => setNavOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <button type="button" className="bn-out" onClick={logout}>
          <Icon name="logout" />
          <span>יציאה</span>
        </button>
      </aside>

      <main className="bn-main">
        <header className="bn-top">
          <button type="button" className="bn-menu" aria-label="פתיחת תפריט" onClick={() => setNavOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="bn-search">
            <Icon name="search" />
            <span>חיפוש הצעות, שמות, ערים…</span>
            <kbd>⌘K</kbd>
          </div>
          <span className="bn-grow" />
          <span className="bn-tb" aria-hidden="true">
            <Icon name="mail" />
            <i />
          </span>
          <span className="bn-tb" aria-hidden="true">
            <Icon name="bell" />
            <i />
          </span>
          <span className="bn-tme">
            <Avatar className="bn-av" />
            <b>{displayName}</b>
          </span>
        </header>

        <div className="bn-content">
          <div className="bn-sec">
            <h2>הגדרות</h2>
            <p>התראות, פרטיות וחשבון</p>
          </div>

          {notice && (
            <p className="bn-toast" role="status">
              {notice}
            </p>
          )}

          <div className="bn-grid">
            <section className="bn-card">
              <h3 className="bn-ch">
                <Icon name="bell" />
                התראות
              </h3>
              {NOTIFICATION_ROWS.map((row) => (
                <div className="bn-srow" key={row.key}>
                  <div>
                    <b>{row.title}</b>
                    <small>{row.detail}</small>
                  </div>
                  <Toggle on={toggles[row.key]} label={row.title} onToggle={() => flip(row.key)} />
                </div>
              ))}
            </section>

            <section className="bn-card">
              <h3 className="bn-ch">
                <Icon name="lock" />
                פרטיות
              </h3>
              <div className="bn-srow">
                <div>
                  <b>חשיפת תמונה ושם</b>
                  <small>רק לאחר אישור התעניינות הדדי – ההגדרה קבועה ואינה ניתנת לשינוי</small>
                </div>
                <span className="bn-pill">
                  <Icon name="check" className="ic" />
                  לאחר אישור הדדי
                </span>
              </div>
              <div className="bn-srow">
                <div>
                  <b>הצגת אחוז התאמה</b>
                  <small>הצגת אחוז ההתאמה בכרטיסי ההצעות</small>
                </div>
                <Toggle
                  on={toggles.showMatchPercent}
                  label="הצגת אחוז התאמה"
                  onToggle={() => flip("showMatchPercent")}
                />
              </div>
              <div className="bn-srow">
                <div>
                  <b>השהיית קבלת הצעות</b>
                  <small>הפרופיל לא יוצע לאחרים עד לביטול</small>
                </div>
                <Toggle
                  on={toggles.pauseSuggestions}
                  label="השהיית קבלת הצעות"
                  onToggle={() => flip("pauseSuggestions")}
                />
              </div>
              <button type="button" className="bn-lnk" onClick={unavailable}>
                <Icon name="eye" />
                מקרא סטטוסים ומסלול ההצעה
              </button>
            </section>

            <section className="bn-card">
              <h3 className="bn-ch">
                <Icon name="user" />
                חשבון וסיסמה
              </h3>
              <ul className="bn-dlist">
                <li>
                  <Icon name="mail" />
                  <span>אימייל</span>
                  <input
                    className="bn-lin"
                    type="email"
                    dir="ltr"
                    value={email}
                    placeholder="לא הוגדר"
                    autoComplete="email"
                    onChange={(event) => {
                      emailDirty.current = true;
                      setEmail(event.target.value);
                    }}
                  />
                </li>
                <li>
                  <Icon name="lock" />
                  <span>סיסמה</span>
                  <input className="bn-lin" value="••••••••" readOnly tabIndex={-1} aria-label="סיסמה מוסתרת" />
                </li>
                <li>
                  <Icon name="user" />
                  <span>טלפון</span>
                  <input className="bn-lin" type="tel" value="" placeholder="לא הוגדר" readOnly aria-label="טלפון" />
                </li>
              </ul>
              <div className="bn-actions">
                <button type="button" className="bn-btn gold" onClick={unavailable}>
                  שמירה
                </button>
                <button type="button" className="bn-btn ghost" onClick={unavailable}>
                  שינוי סיסמה
                </button>
              </div>
            </section>

            <section className="bn-card">
              <h3 className="bn-ch">
                <Icon name="settings" />
                שפה ותצוגה
              </h3>
              <div className="bn-srow">
                <div>
                  <b>שפה</b>
                  <small>שפת הממשק</small>
                </div>
                <select className="bn-sel" aria-label="שפה" defaultValue="he">
                  <option value="he">עברית</option>
                </select>
              </div>
              <div className="bn-srow">
                <div>
                  <b>מחיקת חשבון</b>
                  <small>הסרה מלאה של הפרופיל והנתונים</small>
                </div>
                <button type="button" className="bn-btn ghost" onClick={unavailable}>
                  מחיקה
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
