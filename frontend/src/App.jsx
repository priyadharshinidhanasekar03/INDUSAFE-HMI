import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:5000/api";

const MACHINES = [
  { id: "m1", name: "CNC Lathe Unit", zone: "Zone A", icon: "⚙️" },
  { id: "m2", name: "Hydraulic Press", zone: "Zone A", icon: "🔩" },
  { id: "m3", name: "Conveyor Belt", zone: "Zone B", icon: "📦" },
  { id: "m4", name: "Welding Robot", zone: "Zone B", icon: "🤖" },
  { id: "m5", name: "Air Compressor", zone: "Zone C", icon: "💨" },
  { id: "m6", name: "Coolant Pump", zone: "Zone C", icon: "🌊" },
];

const STATUS_CONFIG = {
  normal:   { label: "Normal",   color: "#00c896", bg: "#00c89615", ring: "#00c89640", pulse: false },
  warning:  { label: "Warning",  color: "#ffaa00", bg: "#ffaa0015", ring: "#ffaa0040", pulse: true  },
  critical: { label: "Critical", color: "#ff3b3b", bg: "#ff3b3b20", ring: "#ff3b3b60", pulse: true  },
  offline:  { label: "Offline",  color: "#888",    bg: "#88888812", ring: "#88888830", pulse: false },
};

const FAILURE_TYPES = {
  normal:   [],
  warning:  ["Vibration spike detected", "Temperature rising", "Pressure drop observed", "Lubrication low"],
  critical: ["Overheating! Shutdown risk", "Bearing failure imminent", "Electrical fault detected", "Emergency stop triggered"],
  offline:  ["Power supply lost", "Connection timeout"],
};

const LANGUAGES = {
  en: {
    title: "InduSafe HMI",
    subtitle: "Inclusive Machine Failure Detection",
    dashboard: "Live Dashboard",
    allZones: "All Zones",
    search: "Search machine...",
    status: "System Status",
    alerts: "Active Alerts",
    noAlerts: "All systems operating normally",
    temp: "Temperature",
    vibration: "Vibration",
    pressure: "Pressure",
    uptime: "Uptime",
    lastChecked: "Last checked",
    acknowledge: "Acknowledge",
    report: "Report Issue",
    voiceBtn: "🎙 Voice Alert",
    lang: "தமிழ்",
    totalMachines: "Total Machines",
    critical: "Critical",
    warnings: "Warnings",
    healthy: "Healthy",
  },
  ta: {
    title: "InduSafe HMI",
    subtitle: "இயந்திர தோல்வி கண்டறிதல்",
    dashboard: "நேரடி டாஷ்போர்டு",
    allZones: "அனைத்து மண்டலங்கள்",
    search: "இயந்திரம் தேடுங்கள்...",
    status: "கணினி நிலை",
    alerts: "செயலில் உள்ள எச்சரிக்கைகள்",
    noAlerts: "அனைத்து கணினிகளும் சாதாரணமாக இயங்குகின்றன",
    temp: "வெப்பநிலை",
    vibration: "அதிர்வு",
    pressure: "அழுத்தம்",
    uptime: "இயக்க நேரம்",
    lastChecked: "கடைசியாக சரிபார்க்கப்பட்டது",
    acknowledge: "ஒப்புக்கொள்",
    report: "சிக்கலை தெரிவிக்கவும்",
    voiceBtn: "🎙 குரல் எச்சரிக்கை",
    lang: "English",
    totalMachines: "மொத்த இயந்திரங்கள்",
    critical: "அவசரம்",
    warnings: "எச்சரிக்கைகள்",
    healthy: "நல்ல நிலை",
  },
};

function randomSensorValue(status, type) {
  if (type === "temp") {
    if (status === "normal")   return (55 + Math.random() * 15).toFixed(1);
    if (status === "warning")  return (80 + Math.random() * 10).toFixed(1);
    if (status === "critical") return (100 + Math.random() * 20).toFixed(1);
    return "—";
  }
  if (type === "vibration") {
    if (status === "normal")   return (0.5 + Math.random() * 0.5).toFixed(2);
    if (status === "warning")  return (2 + Math.random() * 1).toFixed(2);
    if (status === "critical") return (5 + Math.random() * 3).toFixed(2);
    return "—";
  }
  if (type === "pressure") {
    if (status === "normal")   return (4.5 + Math.random() * 0.5).toFixed(1);
    if (status === "warning")  return (3 + Math.random() * 0.8).toFixed(1);
    if (status === "critical") return (1.2 + Math.random() * 0.8).toFixed(1);
    return "—";
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMachineData() {
  const statusPool = ["normal","normal","normal","warning","warning","critical","offline"];
  return MACHINES.map((m) => {
    const status = pickRandom(statusPool);
    const failures = FAILURE_TYPES[status];
    return {
      ...m,
      status,
      failureMsg: failures.length ? pickRandom(failures) : null,
      temp:      randomSensorValue(status, "temp"),
      vibration: randomSensorValue(status, "vibration"),
      pressure:  randomSensorValue(status, "pressure"),
      uptime:    status === "offline" ? "0h" : `${Math.floor(Math.random()*200)+10}h`,
      lastChecked: `${Math.floor(Math.random()*59)+1}s ago`,
      acknowledged: false,
      history: Array.from({ length: 12 }, (_, i) => ({
        t: `${i * 5}m`,
        v: 50 + Math.random() * 50 + (status === "critical" ? 30 : 0),
      })),
    };
  });
}

export default function App() {
  const [lang, setLang] = useState("en");
  const t = LANGUAGES[lang];
  const [machines, setMachines] = useState(generateMachineData);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fontSize, setFontSize] = useState(15);
  const [acknowledged, setAcknowledged] = useState({});
  const [voiceMsg, setVoiceMsg] = useState("");
  const tickRef = useRef(null);

  // ✅ ADD THIS CODE — new state for added features
  const [showReports, setShowReports]       = useState(false);
  const [reportsList, setReportsList]       = useState([]);
  const [emailInput, setEmailInput]         = useState("");
  const [emailTarget, setEmailTarget]       = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [actionLogs, setActionLogs]         = useState([]);
  const [showHistory, setShowHistory]       = useState(false);
  const [historyMachine, setHistoryMachine] = useState(null);
  const [historyData, setHistoryData]       = useState([]);
  const [toastMsg, setToastMsg]             = useState("");

  // ✅ NEW: Theme (dark/light) — persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("indusafe_theme") !== "light"; } catch { return true; }
  });

  // ✅ NEW: Dyslexia-friendly font mode — persisted in localStorage
  const [dyslexiaMode, setDyslexiaMode] = useState(() => {
    try { return localStorage.getItem("indusafe_dyslexia") === "true"; } catch { return false; }
  });

  // ✅ NEW: Role-based view (operator | manager)
  const [userRole, setUserRole] = useState(() => {
    try { return localStorage.getItem("indusafe_role") || "operator"; } catch { return "operator"; }
  });

  // ✅ NEW: Sidebar settings panel visibility
  const [showSettings, setShowSettings] = useState(false);

  // ✅ NEW: Saved email from settings (no hardcoded emails)
  const [savedEmail, setSavedEmail]     = useState(() => {
    try { return localStorage.getItem("indusafe_email") || ""; } catch { return ""; }
  });
  const [settingsEmailDraft, setSettingsEmailDraft] = useState(savedEmail);
  const [emailValidErr, setEmailValidErr]           = useState("");

  // ✅ NEW: System heartbeat
  const [heartbeat, setHeartbeat] = useState({ online: true, lastUpdated: new Date().toISOString() });

  // ✅ NEW: Voice dedup — track last spoken machine IDs to avoid repeats
  const spokenRef = useRef(new Set());

  // Live data simulation
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setMachines(prev => prev.map(m => ({
        ...m,
        temp:      randomSensorValue(m.status, "temp"),
        vibration: randomSensorValue(m.status, "vibration"),
        pressure:  randomSensorValue(m.status, "pressure"),
        lastChecked: `${Math.floor(Math.random()*10)+1}s ago`,
      })));
    }, 4000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Fetch from backend
  useEffect(() => {
    fetch(`${API_BASE}/machines`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) setMachines(data);
      })
      .catch(() => {});
  }, []);

  // ✅ ADD THIS CODE — fetch action logs on load
  useEffect(() => {
    fetch(`${API_BASE}/action-logs`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActionLogs(data); })
      .catch(() => {});
  }, []);

  // ✅ NEW: Persist theme choice
  useEffect(() => {
    try { localStorage.setItem("indusafe_theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  // ✅ NEW: Persist dyslexia mode
  useEffect(() => {
    try { localStorage.setItem("indusafe_dyslexia", dyslexiaMode ? "true" : "false"); } catch {}
  }, [dyslexiaMode]);

  // ✅ NEW: Persist role
  useEffect(() => {
    try { localStorage.setItem("indusafe_role", userRole); } catch {}
  }, [userRole]);

  // ✅ NEW: Heartbeat poll — hit /api/health every 15s
  useEffect(() => {
    const checkHealth = () => {
      fetch(`${API_BASE}/health`)
        .then(r => r.json())
        .then(d => setHeartbeat({ online: true,  lastUpdated: d.time || new Date().toISOString() }))
        .catch(()  => setHeartbeat(h => ({ ...h, online: false })));
    };
    checkHealth();
    const hbTimer = setInterval(checkHealth, 15000);
    return () => clearInterval(hbTimer);
  }, []);

  // ✅ ADD THIS CODE — toast helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // ✅ NEW: Validate and save email from settings panel
  const saveSettingsEmail = () => {
    const val = settingsEmailDraft.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) { setEmailValidErr("Email cannot be empty"); return; }
    if (!emailRe.test(val)) { setEmailValidErr("Invalid email format"); return; }
    setEmailValidErr("");
    setSavedEmail(val);
    try { localStorage.setItem("indusafe_email", val); } catch {}
    showToast("✅ Email saved to settings.");
  };

  // ✅ ADD THIS CODE — AI recommendation helper (runs in browser, no API needed)
  const getAIRecommendation = (temp) => {
    const t = parseFloat(temp);
    if (t >= 90) return { text: "Shut down immediately", color: "#ff3b3b" };
    if (t >= 70) return { text: "Check cooling system",  color: "#ffaa00" };
    return { text: "Normal operation", color: "#00c896" };
  };

  // ✅ ADD THIS CODE — fetch and open reports view
  const openReports = async () => {
    try {
      const res  = await fetch(`${API_BASE}/action-logs`);
      const data = await res.json();
      setReportsList(Array.isArray(data) ? data : []);
    } catch { setReportsList([]); }
    setShowReports(true);
  };

  // ✅ ADD THIS CODE — fetch and open machine history timeline
  const openHistory = async (machine) => {
    setHistoryMachine(machine);
    try {
      const res  = await fetch(`${API_BASE}/history/${machine.id}`);
      const data = await res.json();
      setHistoryData(Array.isArray(data) ? data : []);
    } catch { setHistoryData([]); }
    setShowHistory(true);
  };

  // ✅ UPGRADED sendEmailAlert — uses savedEmail from settings as default, no hardcoded emails
  const sendEmailAlert = async (mode = "selected") => {
    const recipient = emailInput || savedEmail;
    if (!recipient) { showToast("⚠ Set an email in Settings first."); return; }
    const machineList = mode === "full" ? machines : [emailTarget];
    if (!machineList || !machineList.filter(Boolean).length) return;
    try {
      const res = await fetch(`${API_BASE}/send-email`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:      recipient,
          machines:   machineList.filter(Boolean),
          reportType: mode,
        }),
      });
      const data = await res.json();
      showToast(data.success
        ? "✅ Email sent successfully with machine data."
        : "⚠ Email saved to log — check Gmail App Password in backend.");
    } catch { showToast("❌ Email failed — check backend config"); }
    setShowEmailModal(false);
    setEmailInput("");
    setEmailTarget(null);
  };

  const zones = ["all", ...new Set(MACHINES.map(m => m.zone))];
  const filtered = machines.filter(m => {
    const zoneOk = filter === "all" || m.zone === filter;
    const searchOk = m.name.toLowerCase().includes(search.toLowerCase());
    return zoneOk && searchOk;
  });

  const counts = {
    total:    machines.length,
    critical: machines.filter(m => m.status === "critical").length,
    warnings: machines.filter(m => m.status === "warning").length,
    healthy:  machines.filter(m => m.status === "normal").length,
  };

  const alerts = machines.filter(m => m.status !== "normal" && m.status !== "offline" && !acknowledged[m.id]);

  const acknowledgeAlert = async (id) => {
    setAcknowledged(a => ({ ...a, [id]: true }));
    try { await fetch(`${API_BASE}/acknowledge/${id}`, { method: "POST" }); } catch {}
  };

  // ✅ UPDATED reportIssue — stores data, fetches reports for visibility, shows correct UX message
  const reportIssue = async (machine) => {
    try {
      await fetch(`${API_BASE}/report-action`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId:   machine.id,
          machineName: machine.name,
          temperature: machine.temp,
          status:      machine.status,
          action:      "Reported",
          failureMsg:  machine.failureMsg,
        }),
      });
      // Refresh both action logs and reports list so UI stays in sync
      const [logsRes, rptRes] = await Promise.all([
        fetch(`${API_BASE}/action-logs`),
        fetch(`${API_BASE}/reports`),
      ]);
      const logs = await logsRes.json();
      const rpts = await rptRes.json();
      setActionLogs(Array.isArray(logs) ? logs : []);
      setReportsList(Array.isArray(logs) ? logs : []); // keep reportsList fresh too
    } catch {}
    showToast("✅ Report stored successfully. View in Reports section.");
  };

  // ✅ FIXED speakAlert — exact machine name + issue, dedup, visual fallback
  const speakAlert = () => {
    const criticals = machines.filter(m => m.status === "critical");
    const warnings  = machines.filter(m => m.status === "warning");
    let msg;
    if (criticals.length > 0) {
      // Build per-machine detailed speech: name + exact issue
      const details = criticals.map(m => {
        const issue = m.failureMsg ? `, issue: ${m.failureMsg}` : "";
        return `${m.name}${issue}`;
      }).join("; ");
      msg = `Critical alert! ${criticals.length} machine${criticals.length > 1 ? "s" : ""} in critical state: ${details}. Immediate shutdown and inspection required.`;
    } else if (warnings.length > 0) {
      const details = warnings.map(m => {
        const issue = m.failureMsg ? `, issue: ${m.failureMsg}` : "";
        return `${m.name}${issue}`;
      }).join("; ");
      msg = `Warning! ${warnings.length} machine${warnings.length > 1 ? "s have" : " has"} warnings: ${details}. Please inspect soon.`;
    } else {
      msg = "All machines are running normally. No critical or warning alerts at this time.";
    }
    setVoiceMsg(msg);

    // Dedup: only speak if the set of critical machine IDs has changed
    const currentCriticalIds = criticals.map(m => m.id).sort().join(",");
    if (spokenRef.current.has(currentCriticalIds)) return; // already spoken this combination
    spokenRef.current.clear();
    spokenRef.current.add(currentCriticalIds);

    if (!("speechSynthesis" in window)) {
      // Visual fallback — toast already set above, nothing else needed
      return;
    }
    try {
      window.speechSynthesis.cancel(); // stop any ongoing speech first
      const utt = new SpeechSynthesisUtterance(msg);
      utt.lang = lang === "ta" ? "ta-IN" : "en-IN";
      utt.rate = 0.85;
      utt.onerror = () => { /* visual fallback already shown via voiceMsg */ };
      window.speechSynthesis.speak(utt);
    } catch {
      // voiceMsg visual fallback still visible
    }
  };

  // ✅ NEW: Compute theme tokens so all existing S.* styles adapt automatically
  const TH = darkMode ? {
    rootBg:    "#0b0c18", sidebarBg: "#0e0f1e", cardBg:    "#12131f",
    border:    "#1e2240", text:      "#dde3f0",  muted:     "#6677aa",
    inputBg:   "#12131f", sensorBg:  "#0b0c18",
  } : {
    rootBg:    "#f0f4ff", sidebarBg: "#ffffff",  cardBg:    "#ffffff",
    border:    "#dde3f0", text:      "#1a1d2e",  muted:     "#556688",
    inputBg:   "#f0f4ff", sensorBg:  "#e8ecf8",
  };
  const dyslexiaFont = dyslexiaMode
    ? "'Atkinson Hyperlegible', 'OpenDyslexic', Arial, sans-serif"
    : "'DM Sans', sans-serif";

  return (
    <div style={{ ...S.root, fontSize, background: TH.rootBg, color: TH.text, fontFamily: dyslexiaFont }}>
      <style>{CSS + `
        @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
        body { background: ${TH.rootBg}; }
        ::-webkit-scrollbar-track { background: ${TH.rootBg}; }
        /* ✅ Critical pulse glow — red animated ring, no layout impact */
        @keyframes critical-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,59,59,0); }
          50%      { box-shadow: 0 0 0 8px rgba(255,59,59,0.35); }
        }
        .critical-pulse { animation: critical-glow 1.6s ease-in-out infinite; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, background: TH.sidebarBg, borderRight: `1px solid ${TH.border}` }}>
        {/* Logo + Heartbeat */}
        <div style={{ ...S.logo, borderBottom: `1px solid ${TH.border}` }}>
          <span style={S.logoIcon}>🏭</span>
          <div style={{ flex:1 }}>
            <div style={{ ...S.logoTitle, color: darkMode ? "#a8c8ff" : "#1b3a6b" }}>{t.title}</div>
            <div style={{ ...S.logoSub, color: TH.muted }}>{t.subtitle}</div>
          </div>
          {/* ✅ NEW: System Heartbeat indicator */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background: heartbeat.online ? "#00c896" : "#ff3b3b",
                boxShadow: heartbeat.online ? "0 0 6px #00c89680" : "0 0 6px #ff3b3b80" }} />
              <span style={{ fontSize:10, color: heartbeat.online ? "#00c896" : "#ff5555", fontWeight:600 }}>
                {heartbeat.online ? "Online" : "Offline"}
              </span>
            </div>
            <span style={{ fontSize:9, color: TH.muted }}>
              {new Date(heartbeat.lastUpdated).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
        </div>

        {/* ✅ NEW: Role switcher tabs */}
        <div style={{ display:"flex", gap:4, padding:"8px 14px 0", borderBottom:`1px solid ${TH.border}`, paddingBottom:8 }}>
          {["operator","manager"].map(role => (
            <button key={role}
              style={{ flex:1, padding:"5px 0", borderRadius:7, border:`1px solid ${userRole===role ? "#4da6ff" : TH.border}`,
                background: userRole===role ? (darkMode?"#1a2a44":"#dce8f8") : "transparent",
                color: userRole===role ? "#4da6ff" : TH.muted,
                fontSize:11, cursor:"pointer", fontWeight: userRole===role ? 700 : 400, textTransform:"capitalize" }}
              onClick={() => setUserRole(role)}>
              {role === "operator" ? "👷 Operator" : "📊 Manager"}
            </button>
          ))}
        </div>

        {/* Stat Cards */}
        <div style={S.statGrid}>
          {[
            { label: t.totalMachines, val: counts.total,    color: "#7eb8ff" },
            { label: t.critical,      val: counts.critical, color: "#ff5555" },
            { label: t.warnings,      val: counts.warnings, color: "#ffaa00" },
            { label: t.healthy,       val: counts.healthy,  color: "#00c896" },
          ].map(s => (
            <div key={s.label} style={{ ...S.statCard, background: TH.cardBg, borderColor: s.color + "40" }}>
              <span style={{ ...S.statVal, color: s.color }}>{s.val}</span>
              <span style={{ ...S.statLabel, color: TH.muted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Accessibility Controls */}
        <div style={{ ...S.a11yBox, background: TH.cardBg, border:`1px solid ${TH.border}` }}>
          <div style={{ ...S.a11yTitle, color: TH.muted }}>♿ Accessibility</div>
          <div style={S.a11yRow}>
            <span style={{ ...S.a11yLabel, color: TH.muted }}>Text Size</span>
            <div style={S.a11yBtns}>
              <button style={S.a11yBtn} onClick={() => setFontSize(f => Math.max(13, f - 1))}>A−</button>
              <button style={S.a11yBtn} onClick={() => setFontSize(f => Math.min(22, f + 1))}>A+</button>
            </div>
          </div>
          {/* ✅ NEW: Dark/Light toggle */}
          <div style={S.a11yRow}>
            <span style={{ ...S.a11yLabel, color: TH.muted }}>{darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
            <div style={{ width:36, height:20, borderRadius:10, background: darkMode?"#4da6ff":"#ccc",
              cursor:"pointer", position:"relative", transition:"background .25s" }}
              onClick={() => setDarkMode(d => !d)}>
              <div style={{ position:"absolute", top:3, left: darkMode?17:3, width:14, height:14,
                background:"#fff", borderRadius:"50%", transition:"left .2s" }} />
            </div>
          </div>
          {/* ✅ NEW: Dyslexia font toggle */}
          <div style={S.a11yRow}>
            <span style={{ ...S.a11yLabel, color: TH.muted }}>Dyslexia Font</span>
            <div style={{ width:36, height:20, borderRadius:10, background: dyslexiaMode?"#7eb8ff":"#2a3055",
              cursor:"pointer", position:"relative", transition:"background .25s" }}
              onClick={() => setDyslexiaMode(d => !d)}>
              <div style={{ position:"absolute", top:3, left: dyslexiaMode?17:3, width:14, height:14,
                background:"#fff", borderRadius:"50%", transition:"left .2s" }} />
            </div>
          </div>
          <button style={S.voiceBtn} onClick={speakAlert}>{t.voiceBtn}</button>
          <button style={S.langBtn}  onClick={() => setLang(l => l === "en" ? "ta" : "en")}>{t.lang}</button>
        </div>

        {/* Alert Panel — Operator sees alerts, Manager sees inbox summary */}
        <div style={S.alertPanel}>
          {userRole === "manager" ? (
            <div>
              <div style={{ ...S.alertTitle, color: TH.muted }}>📥 Manager Inbox</div>
              {actionLogs.length === 0
                ? <div style={{ ...S.noAlert, color: TH.muted }}>No reports submitted yet.</div>
                : actionLogs.slice(0,8).map((r, i) => (
                  <div key={r.id || i} style={{ ...S.alertItem, background: TH.cardBg, borderColor: TH.border }}>
                    <div style={{ fontWeight:600, fontSize:12, color: TH.text }}>{r.machineName}</div>
                    <div style={{ fontSize:11, color: TH.muted }}>{r.action} — {r.status}</div>
                    <div style={{ fontSize:10, color: TH.muted }}>{new Date(r.timestamp).toLocaleString("en-IN")}</div>
                  </div>
                ))
              }
            </div>
          ) : (
            <div>
              <div style={{ ...S.alertTitle, color: TH.muted }}>🔔 {t.alerts} {alerts.length > 0 && <span style={S.alertBadge}>{alerts.length}</span>}</div>
              {alerts.length === 0
                ? <div style={{ ...S.noAlert, color: TH.muted }}>{t.noAlerts}</div>
                : alerts.map(m => (
                  <div key={m.id} style={{ ...S.alertItem, background: TH.cardBg, borderColor: STATUS_CONFIG[m.status].color + "60" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <span style={{ color: STATUS_CONFIG[m.status].color, fontWeight: 700, fontSize: 13 }}>
                        {m.icon} {m.name}
                      </span>
                      <span style={{ ...S.statusPill, background: STATUS_CONFIG[m.status].bg, color: STATUS_CONFIG[m.status].color }}>
                        {STATUS_CONFIG[m.status].label}
                      </span>
                    </div>
                    <div style={{ ...S.alertMsg, color: TH.muted }}>{m.failureMsg}</div>
                    <div style={S.alertActions}>
                      <button style={{ ...S.ackBtn, borderColor: STATUS_CONFIG[m.status].color + "80", color: STATUS_CONFIG[m.status].color }}
                        onClick={() => acknowledgeAlert(m.id)}>{t.acknowledge}</button>
                      <button style={S.reportBtn} onClick={() => reportIssue(m)}>{t.report}</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* ✅ Reports & Email + Settings buttons */}
        <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:7, borderTop:`1px solid ${TH.border}`, marginTop:"auto" }}>
          <div style={{ fontSize:11, color: TH.muted, fontWeight:600, letterSpacing:1, marginBottom:2 }}>📋 REPORTS & ALERTS</div>
          <button
            style={{ background: darkMode?"#1a2a44":"#dce8f8", border:"1px solid #4da6ff40", color:"#7eb8ff", borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontWeight:500 }}
            onClick={openReports}>
            📋 View All Reports ({actionLogs.length})
          </button>
          <button
            style={{ background: darkMode?"#1a2a3a":"#e8f0fc", border:"1px solid #2a4a6a40", color:"#aac4ff", borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontWeight:500 }}
            onClick={() => { setEmailTarget(null); setShowEmailModal(true); }}>
            📧 Email Dashboard Report
          </button>
          {/* ✅ NEW: Settings toggle */}
          <button
            style={{ background: darkMode?"#1e1e2e":"#f0f4ff", border:`1px solid ${TH.border}`, color: TH.muted, borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12 }}
            onClick={() => setShowSettings(s => !s)}>
            ⚙️ {showSettings ? "Hide Settings" : "Settings"}
          </button>

          {/* ✅ NEW: Settings panel — email input + role note */}
          {showSettings && (
            <div style={{ background: TH.cardBg, border:`1px solid ${TH.border}`, borderRadius:10, padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:11, color:"#4da6ff", fontWeight:600 }}>📧 Alert Email</div>
              <input
                type="email"
                placeholder="your@email.com"
                value={settingsEmailDraft}
                onChange={e => { setSettingsEmailDraft(e.target.value); setEmailValidErr(""); }}
                style={{ background: TH.inputBg, border:`1px solid ${emailValidErr ? "#ff5555" : TH.border}`, color: TH.text,
                  borderRadius:7, padding:"7px 10px", fontSize:12, outline:"none", width:"100%" }}
              />
              {emailValidErr && <div style={{ fontSize:11, color:"#ff5555" }}>{emailValidErr}</div>}
              {savedEmail && !emailValidErr && <div style={{ fontSize:10, color:"#00c896" }}>Saved: {savedEmail}</div>}
              <button
                style={{ background:"#1a3a5c", border:"1px solid #4da6ff60", color:"#7eb8ff", borderRadius:7, padding:"6px", cursor:"pointer", fontSize:12, fontWeight:600 }}
                onClick={saveSettingsEmail}>
                Save Email
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ ...S.main, background: TH.rootBg }}>
        {/* Top Bar */}
        <div style={{ ...S.topBar, borderBottom:`1px solid ${TH.border}` }}>
          <h1 style={{ ...S.pageTitle, color: darkMode ? "#a8c8ff" : "#1b3a6b" }}>{t.dashboard}</h1>
          <div style={S.topRight}>
            <input
              style={{ ...S.search, background: TH.inputBg, border:`1px solid ${TH.border}`, color: TH.text }}
              placeholder={t.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={S.zoneTabs}>
              {zones.map(z => (
                <button key={z} style={{ ...S.zoneTab, ...(filter === z ? S.zoneTabActive : {}),
                  border:`1px solid ${filter===z ? "#4da6ff60" : TH.border}`, color: filter===z ? "#7eb8ff" : TH.muted }}
                  onClick={() => setFilter(z)}>
                  {z === "all" ? t.allZones : z}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Machine Cards Grid */}
        <div style={S.machineGrid}>
          {filtered.map(m => {
            const cfg = STATUS_CONFIG[m.status];
            const isSelected = selected?.id === m.id;
            const isCritical = m.status === "critical";
            return (
              <div
                key={m.id}
                className={isCritical ? "critical-pulse" : cfg.pulse ? "pulse-border" : ""}
                style={{
                  ...S.machineCard,
                  background: isSelected ? cfg.bg : TH.cardBg,
                  borderColor: isSelected ? cfg.color : isCritical ? "#ff3b3b" : cfg.color + "50",
                  boxShadow: isSelected ? `0 0 24px ${cfg.ring}` : "0 2px 12px #0002",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(isSelected ? null : m)}
              >
                <div style={S.cardTop}>
                  <span style={S.machineIcon}>{m.icon}</span>
                  <div style={S.machineInfo}>
                    <div style={{ ...S.machineName, color: TH.text }}>{m.name}</div>
                    <div style={{ ...S.machineZone, color: TH.muted }}>{m.zone}</div>
                  </div>
                  <span style={{ ...S.statusPill, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                {m.failureMsg && (
                  <div style={{ ...S.failureBar, borderColor: cfg.color + "60", color: cfg.color }}>
                    ⚠ {m.failureMsg}
                  </div>
                )}

                <div style={S.sensorRow}>
                  <SensorWidget label={t.temp}      val={m.temp}      unit="°C"   status={m.status} high={90} sensorBg={TH.sensorBg} textColor={TH.text} />
                  <SensorWidget label={t.vibration} val={m.vibration} unit="mm/s" status={m.status} high={4}  sensorBg={TH.sensorBg} textColor={TH.text} />
                  <SensorWidget label={t.pressure}  val={m.pressure}  unit="bar"  status={m.status} high={6} inverted sensorBg={TH.sensorBg} textColor={TH.text} />
                </div>

                <div style={{ ...S.cardFooter, color: TH.muted }}>
                  <span>⏱ {t.uptime}: <b>{m.uptime}</b></span>
                  <span>{t.lastChecked}: {m.lastChecked}</span>
                </div>

                {/* Sparkline */}
                <MiniChart data={m.history} color={cfg.color} />

                {/* ✅ ADD THIS CODE — AI recommendation + quick action links per card */}
                {m.temp && m.temp !== "—" && (
                  <div style={{ marginTop:6, padding:"6px 8px", borderRadius:7, background:"#0d1520", border:"1px solid #1e2a3a", fontSize:11, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color: getAIRecommendation(m.temp).color }}>
                      🧠 {getAIRecommendation(m.temp).text}
                    </span>
                    <span style={{ display:"flex", gap:8 }}>
                      <span
                        style={{ color:"#aac4ff", cursor:"pointer", fontSize:10 }}
                        onClick={(e) => { e.stopPropagation(); openHistory(m); }}>
                        📜 History
                      </span>
                      <span
                        style={{ color:"#4da6ff", cursor:"pointer", fontSize:10 }}
                        onClick={(e) => { e.stopPropagation(); setEmailTarget(m); setShowEmailModal(true); }}>
                        📧 Alert
                      </span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {voiceMsg && (
          <div style={S.voiceToast}>
            🔊 {voiceMsg}
          </div>
        )}
      </main>

      {/* ── Detail Panel ── */}
      {selected && (
        <DetailPanel machine={selected} t={t} onClose={() => setSelected(null)}
          onAck={() => acknowledgeAlert(selected.id)}
          onReport={() => reportIssue(selected)} />
      )}

      {/* ✅ ADD THIS CODE — Reports View Modal */}
      {showReports && (
        <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowReports(false)}>
          <div style={{ background:"#0e0f1e", border:"1px solid #2a3a5a", borderRadius:16, padding:24, width:"min(700px,95vw)", maxHeight:"85vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:20, fontWeight:700, color:"#a8c8ff" }}>📋 All Reports & Actions</div>
              <button onClick={() => setShowReports(false)} style={{ background:"none", border:"none", color:"#888", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {reportsList.length === 0
              ? <div style={{ color:"#445566", textAlign:"center", padding:32 }}>No reports yet. Click "Report Issue" on any machine card.</div>
              : <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#1a2240" }}>
                      {["Machine","Temp","Status","Action","AI Recommendation","Time"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", color:"#7eb8ff", textAlign:"left", fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportsList.map((r, i) => (
                      <tr key={r.id} style={{ background: i%2===0 ? "#12131f" : "#0e0f1e", borderBottom:"1px solid #1a2240" }}>
                        <td style={{ padding:"8px 10px", color:"#ccd6f0", fontWeight:600 }}>{r.machineName}</td>
                        <td style={{ padding:"8px 10px", color:"#ffaa44" }}>{r.temperature}°C</td>
                        <td style={{ padding:"8px 10px" }}>
                          <span style={{ color: r.status==="critical"?"#ff5555":r.status==="warning"?"#ffaa00":"#00c896", fontWeight:700 }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding:"8px 10px", color:"#aac4ff" }}>{r.action}</td>
                        <td style={{ padding:"8px 10px", color: r.aiRecommendation?.includes("Shut")?"#ff5555":r.aiRecommendation?.includes("Check")?"#ffaa00":"#00c896" }}>
                          {r.aiRecommendation}
                        </td>
                        <td style={{ padding:"8px 10px", color:"#556677", fontSize:11 }}>
                          {new Date(r.timestamp).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {/* ✅ ADD THIS CODE — Machine History Timeline Modal */}
      {showHistory && historyMachine && (
        <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowHistory(false)}>
          <div style={{ background:"#0e0f1e", border:"1px solid #2a3a5a", borderRadius:16, padding:24, width:"min(560px,95vw)", maxHeight:"80vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:20, fontWeight:700, color:"#a8c8ff" }}>
                📜 {historyMachine.icon} {historyMachine.name} — History
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background:"none", border:"none", color:"#888", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {historyData.length === 0
              ? <div style={{ color:"#445566", textAlign:"center", padding:32 }}>No history yet. Report an issue on this machine first.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {historyData.map((h, i) => (
                    <div key={h.id} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:20 }}>
                        <div style={{ width:12, height:12, borderRadius:"50%", background: h.status==="critical"?"#ff5555":h.status==="warning"?"#ffaa00":"#00c896", flexShrink:0, marginTop:3 }} />
                        {i < historyData.length-1 && <div style={{ width:2, flex:1, background:"#1e2240", marginTop:3, minHeight:24 }} />}
                      </div>
                      <div style={{ background:"#12131f", borderRadius:10, padding:"10px 14px", flex:1, border:"1px solid #1e2240" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ color:"#aac4ff", fontWeight:600, fontSize:13 }}>{h.action}</span>
                          <span style={{ color:"#445566", fontSize:11 }}>{new Date(h.timestamp).toLocaleString("en-IN")}</span>
                        </div>
                        <div style={{ fontSize:12, color:"#6677aa" }}>
                          Temp: <b style={{ color:"#ffaa44" }}>{h.temperature}°C</b> &nbsp;|&nbsp;
                          Status: <b style={{ color: h.status==="critical"?"#ff5555":h.status==="warning"?"#ffaa00":"#00c896" }}>{h.status}</b>
                        </div>
                        <div style={{ fontSize:11, marginTop:4, color: h.aiRecommendation?.includes("Shut")?"#ff7777":h.aiRecommendation?.includes("Check")?"#ffcc55":"#55aa88" }}>
                          🧠 {h.aiRecommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ✅ UPGRADED — Email Modal: two send options (selected machine + full dashboard) */}
      {showEmailModal && (
        <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => { setShowEmailModal(false); setEmailInput(""); setEmailTarget(null); }}>
          <div style={{ background:"#0e0f1e", border:"1px solid #4da6ff40", borderRadius:16, padding:26, width:"min(420px,92vw)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:19, fontWeight:700, color:"#a8c8ff", marginBottom:6 }}>
              📧 Send Email Alert
            </div>

            {emailTarget && (
              <div style={{ fontSize:12, color:"#6677aa", marginBottom:4 }}>
                Selected: <b style={{ color:"#ccd6f0" }}>{emailTarget.icon} {emailTarget.name}</b>
                &nbsp;|&nbsp; Temp: <b style={{ color:"#ffaa44" }}>{emailTarget.temp}°C</b>
                &nbsp;|&nbsp; <span style={{ color: getAIRecommendation(emailTarget.temp).color }}>{getAIRecommendation(emailTarget.temp).text}</span>
              </div>
            )}

            <input
              type="email"
              placeholder="Enter recipient email address"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              style={{ width:"100%", background:"#12131f", border:"1px solid #2a3a5a", color:"#ccd6f0", borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", marginBottom:12, marginTop:8 }}
            />

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {emailTarget && (
                <button
                  style={{ background:"#1a3a5c", border:"1px solid #4da6ff60", color:"#7eb8ff", borderRadius:9, padding:"10px 14px", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}
                  onClick={() => sendEmailAlert("selected")}>
                  🔔 Send Selected Machine Report
                  <span style={{ display:"block", fontSize:11, color:"#6688aa", fontWeight:400, marginTop:2 }}>Sends data for: {emailTarget.name}</span>
                </button>
              )}
              <button
                style={{ background:"#1a2a3a", border:"1px solid #2a4a6a60", color:"#aac4ff", borderRadius:9, padding:"10px 14px", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}
                onClick={() => sendEmailAlert("full")}>
                📊 Send Full Dashboard Report
                <span style={{ display:"block", fontSize:11, color:"#556677", fontWeight:400, marginTop:2 }}>Sends all {machines.length} machines with live sensor data</span>
              </button>
              <button
                style={{ background:"transparent", border:"1px solid #2a3a5a", color:"#6677aa", borderRadius:9, padding:"9px", cursor:"pointer", fontSize:13 }}
                onClick={() => { setShowEmailModal(false); setEmailInput(""); setEmailTarget(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ADD THIS CODE — Toast notification (replaces browser alert) */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#1a3a2a", border:"1px solid #00c89660", color:"#00c896", padding:"11px 22px", borderRadius:12, fontSize:13, zIndex:1200 }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function SensorWidget({ label, val, unit, status, high, inverted, sensorBg, textColor }) {
  const num = parseFloat(val);
  const pct = isNaN(num) ? 0 : Math.min(100, (num / high) * 100);
  const fill = inverted
    ? pct < 40 ? "#ff3b3b" : pct < 70 ? "#ffaa00" : "#00c896"
    : pct > 90 ? "#ff3b3b" : pct > 65 ? "#ffaa00" : "#00c896";
  return (
    <div style={{ ...S.sensor, background: sensorBg || "#0b0c18" }}>
      <div style={S.sensorLabel}>{label}</div>
      <div style={{ ...S.sensorVal, color: textColor || "#ccd6f0" }}>{isNaN(num) ? "—" : val}<span style={S.sensorUnit}>{unit}</span></div>
      <div style={S.sensorBar}>
        <div style={{ ...S.sensorFill, width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

function MiniChart({ data, color }) {
  const W = 260, H = 36;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / (max - min + 1)) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 6 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function DetailPanel({ machine, t, onClose, onAck, onReport }) {
  const cfg = STATUS_CONFIG[machine.status];
  return (
    <div style={S.detailOverlay} onClick={onClose}>
      <div style={{ ...S.detailPanel, borderColor: cfg.color + "60" }} onClick={e => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
        <div style={{ color: cfg.color, fontSize: 28, marginBottom: 4 }}>{machine.icon} {machine.name}</div>
        <div style={{ color: "#888", marginBottom: 16 }}>{machine.zone} — <span style={{ color: cfg.color }}>{cfg.label}</span></div>

        {machine.failureMsg && (
          <div style={{ ...S.failureBar, borderColor: cfg.color + "80", color: cfg.color, marginBottom: 16, fontSize: 15, padding: "12px 16px" }}>
            ⚠ {machine.failureMsg}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: t.temp,      val: machine.temp,      unit: "°C"   },
            { label: t.vibration, val: machine.vibration, unit: "mm/s" },
            { label: t.pressure,  val: machine.pressure,  unit: "bar"  },
            { label: t.uptime,    val: machine.uptime,    unit: ""     },
          ].map(s => (
            <div key={s.label} style={S.detailStat}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: cfg.color, fontSize: 22, fontWeight: 700 }}>{s.val}<span style={{ fontSize: 11, color: "#888" }}> {s.unit}</span></div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color:"#888", fontSize: 12, marginBottom: 8 }}>TREND (last 60 min)</div>
          <MiniChart data={machine.history} color={cfg.color} />
        </div>

        <div style={{ display:"flex", gap: 10 }}>
          <button style={{ ...S.ackBtn, flex:1, padding:"12px", borderColor: cfg.color, color: cfg.color, borderRadius: 10 }} onClick={onAck}>{t.acknowledge}</button>
          <button style={{ ...S.reportBtn, flex:1, padding:"12px", borderRadius: 10, fontSize: 14 }} onClick={onReport}>{t.report}</button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0b0c18; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0b0c18; } ::-webkit-scrollbar-thumb { background: #2a2d45; border-radius: 4px; }
  @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 var(--ring)} 50%{box-shadow:0 0 0 6px transparent} }
  .pulse-border { animation: pulse-ring 2s ease infinite; }
  button:focus { outline: 3px solid #4da6ff88; outline-offset: 2px; }
  @keyframes slideIn { from{transform:translateX(40px);opacity:0} to{transform:none;opacity:1} }
  @keyframes fadeUp { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
`;

const S = {
  root: { display:"flex", minHeight:"100vh", background:"#0b0c18", color:"#dde3f0", fontFamily:"'DM Sans', sans-serif", position:"relative" },
  sidebar: { width:300, minWidth:260, background:"#0e0f1e", borderRight:"1px solid #1e2240", display:"flex", flexDirection:"column", gap:0, overflowY:"auto", padding:0 },
  logo: { display:"flex", alignItems:"center", gap:12, padding:"22px 20px 18px", borderBottom:"1px solid #1e2240" },
  logoIcon: { fontSize:32 },
  logoTitle: { fontFamily:"'Rajdhani', sans-serif", fontSize:22, fontWeight:700, color:"#a8c8ff", letterSpacing:1 },
  logoSub: { fontSize:11, color:"#5a6a88", lineHeight:1.4 },
  statGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"14px 14px 0" },
  statCard: { background:"#12131f", borderRadius:10, border:"1px solid", padding:"10px 12px", textAlign:"center" },
  statVal: { display:"block", fontFamily:"'Rajdhani',sans-serif", fontSize:26, fontWeight:700 },
  statLabel: { fontSize:11, color:"#6677aa" },
  a11yBox: { margin:"12px 14px", background:"#12131f", borderRadius:12, border:"1px solid #1e2240", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 },
  a11yTitle: { fontSize:12, color:"#6688aa", fontWeight:600, letterSpacing:1 },
  a11yRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  a11yLabel: { fontSize:13, color:"#9aaabb" },
  a11yBtns: { display:"flex", gap:6 },
  a11yBtn: { background:"#1e2240", border:"1px solid #2a3055", color:"#aac4ff", borderRadius:7, padding:"4px 12px", cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:14 },
  voiceBtn: { background:"#1e2240", border:"1px solid #4da6ff40", color:"#7eb8ff", borderRadius:8, padding:"8px", cursor:"pointer", fontSize:13, fontWeight:500 },
  langBtn: { background:"#1a2a44", border:"1px solid #4da6ff40", color:"#4da6ff", borderRadius:8, padding:"6px", cursor:"pointer", fontSize:12, fontWeight:600 },
  alertPanel: { flex:1, padding:"0 14px 14px", overflowY:"auto" },
  alertTitle: { fontSize:12, color:"#6688aa", fontWeight:600, letterSpacing:1, padding:"14px 0 8px", display:"flex", alignItems:"center", gap:8 },
  alertBadge: { background:"#ff3b3b", color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:700 },
  noAlert: { fontSize:12, color:"#445566", textAlign:"center", padding:"16px 0" },
  alertItem: { background:"#0e0f1e", border:"1px solid", borderRadius:10, padding:"10px 12px", marginBottom:8, animation:"fadeUp .3s ease" },
  alertMsg: { fontSize:12, color:"#8899bb", margin:"4px 0 8px" },
  alertActions: { display:"flex", gap:6 },
  ackBtn: { flex:1, background:"transparent", border:"1px solid", borderRadius:7, padding:"5px", cursor:"pointer", fontSize:12, fontWeight:600 },
  reportBtn: { flex:1, background:"#2a1a1a", border:"1px solid #ff3b3b40", color:"#ff8888", borderRadius:7, padding:"5px", cursor:"pointer", fontSize:12 },
  statusPill: { padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" },
  main: { flex:1, display:"flex", flexDirection:"column", overflowY:"auto" },
  topBar: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 14px", borderBottom:"1px solid #1a1d2e", flexWrap:"wrap", gap:12 },
  pageTitle: { fontFamily:"'Rajdhani',sans-serif", fontSize:24, fontWeight:700, color:"#a8c8ff", letterSpacing:1 },
  topRight: { display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" },
  search: { background:"#12131f", border:"1px solid #2a2d45", color:"#ccd6f0", borderRadius:8, padding:"7px 14px", fontSize:13, outline:"none", width:200 },
  zoneTabs: { display:"flex", gap:4 },
  zoneTab: { background:"transparent", border:"1px solid #2a2d45", color:"#6677aa", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:12, transition:"all .2s" },
  zoneTabActive: { background:"#1e2240", border:"1px solid #4da6ff60", color:"#7eb8ff" },
  machineGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14, padding:"16px 20px 24px", alignContent:"start" },
  machineCard: { background:"#12131f", border:"2px solid", borderRadius:14, padding:"16px", transition:"all .25s", animation:"fadeUp .35s ease" },
  cardTop: { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  machineIcon: { fontSize:26, width:36, textAlign:"center" },
  machineInfo: { flex:1 },
  machineName: { fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:"#ccd6f0" },
  machineZone: { fontSize:11, color:"#556677" },
  failureBar: { border:"1px solid", borderRadius:7, padding:"6px 10px", fontSize:12, marginBottom:10, lineHeight:1.5 },
  sensorRow: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 },
  sensor: { background:"#0b0c18", borderRadius:8, padding:"8px 10px" },
  sensorLabel: { fontSize:10, color:"#5a6a88", marginBottom:2, textTransform:"uppercase", letterSpacing:.5 },
  sensorVal: { fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:18, color:"#ccd6f0" },
  sensorUnit: { fontSize:10, color:"#6677aa", marginLeft:2 },
  sensorBar: { height:3, background:"#1a1d2e", borderRadius:4, marginTop:4, overflow:"hidden" },
  sensorFill: { height:"100%", borderRadius:4, transition:"width .8s ease, background .5s" },
  cardFooter: { display:"flex", justifyContent:"space-between", fontSize:11, color:"#445566" },
  uptimeText: { color:"#556688" },
  lastChecked: { color:"#445566" },
  voiceToast: { position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#12131f", border:"1px solid #4da6ff40", color:"#7eb8ff", padding:"12px 24px", borderRadius:12, fontSize:13, zIndex:999, maxWidth:500, textAlign:"center" },
  detailOverlay: { position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  detailPanel: { background:"#0e0f1e", border:"2px solid", borderRadius:18, padding:"28px", width:"min(480px,95vw)", maxHeight:"90vh", overflowY:"auto", animation:"slideIn .3s ease", position:"relative" },
  closeBtn: { position:"absolute", top:14, right:14, background:"transparent", border:"none", color:"#556677", fontSize:18, cursor:"pointer" },
  detailStat: { background:"#12131f", borderRadius:10, padding:"12px" },
};
