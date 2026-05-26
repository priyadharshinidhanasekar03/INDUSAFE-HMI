const express = require("express");
const cors    = require("cors");
const app     = express();

// ✅ ADD THIS CODE — Nodemailer for email alerts
const nodemailer = require("nodemailer");

app.use(cors());
app.use(express.json());

// ✅ ADD THIS CODE — Email config (replace with your Gmail App Password later)
const EMAIL_USER = "YOUR_GMAIL@gmail.com";
const EMAIL_PASS = "YOUR_APP_PASSWORD";

// ✅ ADD THIS CODE — Email logs storage
let emailLogs = [];

// ════════════════════════════════════════════════════
//  MOCK DATABASE — In-memory machine state
// ════════════════════════════════════════════════════
const MACHINE_DEFS = [
  { id: "m1", name: "CNC Lathe Unit",   zone: "Zone A", icon: "⚙️" },
  { id: "m2", name: "Hydraulic Press",  zone: "Zone A", icon: "🔩" },
  { id: "m3", name: "Conveyor Belt",    zone: "Zone B", icon: "📦" },
  { id: "m4", name: "Welding Robot",    zone: "Zone B", icon: "🤖" },
  { id: "m5", name: "Air Compressor",   zone: "Zone C", icon: "💨" },
  { id: "m6", name: "Coolant Pump",     zone: "Zone C", icon: "🌊" },
];

const STATUS_POOL   = ["normal","normal","normal","warning","warning","critical","offline"];
const FAILURE_MSGS  = {
  normal:   [],
  warning:  ["Vibration spike detected","Temperature rising","Pressure drop observed","Lubrication low"],
  critical: ["Overheating! Shutdown risk","Bearing failure imminent","Electrical fault detected","Emergency stop triggered"],
  offline:  ["Power supply lost","Connection timeout"],
};

function rand(min, max) { return +(Math.random() * (max - min) + min).toFixed(2); }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateSensors(status) {
  if (status === "offline") return { temp: null, vibration: null, pressure: null };
  return {
    temp:      status === "critical" ? rand(100,120) : status === "warning" ? rand(80,95) : rand(55,70),
    vibration: status === "critical" ? rand(5,8)     : status === "warning" ? rand(2,4)   : rand(0.2,1),
    pressure:  status === "critical" ? rand(1,2)     : status === "warning" ? rand(2.5,3.5): rand(4,5),
  };
}

// Build initial machine states
let machines = MACHINE_DEFS.map(m => {
  const status = pickRandom(STATUS_POOL);
  const failures = FAILURE_MSGS[status];
  return {
    ...m,
    status,
    failureMsg:  failures.length ? pickRandom(failures) : null,
    ...generateSensors(status),
    uptime:      status === "offline" ? "0h" : `${Math.floor(Math.random()*200)+10}h`,
    lastChecked: new Date().toISOString(),
    acknowledged: false,
    history: Array.from({ length: 12 }, (_, i) => ({
      t: `${i * 5}m`,
      v: 50 + Math.random() * 50 + (status === "critical" ? 30 : 0),
    })),
  };
});

// Reports log
const reports = [];

// ✅ ADD THIS CODE — Action log storage
let actionLogs = [];

// Simulate live sensor drift every 6s
setInterval(() => {
  machines = machines.map(m => ({
    ...m,
    ...generateSensors(m.status),
    lastChecked: new Date().toISOString(),
  }));
}, 6000);

// ════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════

// GET /api/machines — return all machines with current sensor data
app.get("/api/machines", (req, res) => {
  const { zone, status } = req.query;
  let result = machines;
  if (zone)   result = result.filter(m => m.zone === zone);
  if (status) result = result.filter(m => m.status === status);
  res.json(result);
});

// GET /api/machines/:id — single machine detail
app.get("/api/machines/:id", (req, res) => {
  const machine = machines.find(m => m.id === req.params.id);
  if (!machine) return res.status(404).json({ error: "Machine not found" });
  res.json(machine);
});

// PATCH /api/machines/:id/status — update machine status (for simulation/testing)
app.patch("/api/machines/:id/status", (req, res) => {
  const { status } = req.body;
  if (!["normal","warning","critical","offline"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const idx = machines.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Machine not found" });

  const failures = FAILURE_MSGS[status];
  machines[idx] = {
    ...machines[idx],
    status,
    failureMsg: failures.length ? pickRandom(failures) : null,
    ...generateSensors(status),
    lastChecked: new Date().toISOString(),
  };

  console.log(`[Status Update] ${machines[idx].name} → ${status}`);
  res.json(machines[idx]);
});

// POST /api/acknowledge/:id — acknowledge an alert
app.post("/api/acknowledge/:id", (req, res) => {
  const idx = machines.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Machine not found" });
  machines[idx].acknowledged = true;
  console.log(`[ACK] Alert acknowledged for ${machines[idx].name}`);
  res.json({ success: true, machineId: req.params.id });
});

// POST /api/report — report an issue
app.post("/api/report", (req, res) => {
  const { machineId, machineName, status, failureMsg } = req.body;
  if (!machineId) return res.status(400).json({ error: "machineId required" });

  const report = {
    id:          `RPT-${Date.now()}`,
    machineId,
    machineName,
    status,
    failureMsg,
    reportedAt:  new Date().toISOString(),
    resolvedAt:  null,
    resolution:  null,
  };
  reports.push(report);
  console.log(`[Report] ${report.id} — ${machineName}: ${failureMsg}`);
  res.status(201).json({ success: true, report });
});

// GET /api/reports — list all reports
app.get("/api/reports", (req, res) => {
  res.json(reports);
});

// ✅ ADD THIS CODE — Enhanced report-action endpoint with temperature + AI recommendation
app.post("/api/report-action", (req, res) => {
  const { machineId, machineName, temperature, status, action, failureMsg } = req.body;
  if (!machineId) return res.status(400).json({ error: "machineId required" });

  const temp = parseFloat(temperature);
  let aiRecommendation = "🟢 Normal operation";
  if (temp >= 90) aiRecommendation = "🔴 Shut down immediately";
  else if (temp >= 70) aiRecommendation = "🟡 Check cooling system";

  const entry = {
    id:              `ACT-${Date.now()}`,
    machineId,
    machineName,
    temperature:     temperature || "N/A",
    status:          status || "unknown",
    action:          action || "Reported",
    failureMsg:      failureMsg || "",
    aiRecommendation,
    timestamp:       new Date().toISOString(),
  };

  reports.push({
    id:         entry.id,
    machineId,
    machineName,
    status,
    failureMsg,
    reportedAt: entry.timestamp,
    resolvedAt: null,
    resolution: null,
  });
  actionLogs.push(entry);

  console.log(`[Action] ${entry.action} — ${machineName} | Temp: ${temperature}°C | AI: ${aiRecommendation}`);
  res.status(201).json({ success: true, entry });
});

// ✅ ADD THIS CODE — GET all action logs
app.get("/api/action-logs", (req, res) => {
  res.json(actionLogs);
});

// ✅ ADD THIS CODE — Machine history timeline filtered by machine ID
app.get("/api/history/:machineId", (req, res) => {
  const history = actionLogs
    .filter(a => a.machineId === req.params.machineId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(history);
});

// ✅ UPGRADED — POST /api/send-email: supports selected machine OR full dashboard report
app.post("/api/send-email", async (req, res) => {
  const { email, machines: machineList, reportType } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  if (!machineList || !machineList.length) return res.status(400).json({ error: "machines array is required" });

  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const subject = reportType === "full"
    ? `📊 InduSafe Full Dashboard Report — ${generatedAt}`
    : `🚨 InduSafe Machine Alert — ${machineList[0]?.name || "Machine"}`;

  // Build a rich HTML card for each machine
  const machineCards = machineList.map(m => {
    const statusColor = m.status === "critical" ? "#cc2200" : m.status === "warning" ? "#cc8800" : "#008844";
    const statusBg    = m.status === "critical" ? "#fff5f5" : m.status === "warning" ? "#fffbf0" : "#f0fff8";
    const temp        = m.temp      ?? "N/A";
    const vibration   = m.vibration ?? "N/A";
    const pressure    = m.pressure  ?? "N/A";
    const health      = m.healthScore != null ? `${m.healthScore}%` : "N/A";

    let aiRec = "🟢 Normal operation";
    const t = parseFloat(temp);
    if (t >= 90) aiRec = "🔴 Shut down immediately";
    else if (t >= 70) aiRec = "🟡 Check cooling system";

    return `
      <div style="background:${statusBg};border:1px solid ${statusColor}40;border-left:4px solid ${statusColor};border-radius:8px;padding:16px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:16px;font-weight:700;color:#1a1a2e">${m.icon || "⚙️"} ${m.name}</span>
          <span style="background:${statusColor};color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase">${m.status}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:5px 8px;color:#555;width:40%">Zone</td><td style="padding:5px 8px;font-weight:600">${m.zone || "—"}</td></tr>
          <tr style="background:#fff8"><td style="padding:5px 8px;color:#555">Temperature</td><td style="padding:5px 8px;font-weight:600;color:${t >= 90 ? "#cc2200" : t >= 70 ? "#cc8800" : "#008844"}">${temp}°C</td></tr>
          <tr><td style="padding:5px 8px;color:#555">Vibration</td><td style="padding:5px 8px;font-weight:600">${vibration} mm/s</td></tr>
          <tr style="background:#fff8"><td style="padding:5px 8px;color:#555">Pressure</td><td style="padding:5px 8px;font-weight:600">${pressure} bar</td></tr>
          <tr><td style="padding:5px 8px;color:#555">Health Score</td><td style="padding:5px 8px;font-weight:600">${health}</td></tr>
          <tr style="background:#fff8"><td style="padding:5px 8px;color:#555">Issue Detected</td><td style="padding:5px 8px;color:${statusColor};font-weight:600">${m.failureMsg || "None"}</td></tr>
          <tr><td style="padding:5px 8px;color:#555">AI Recommendation</td><td style="padding:5px 8px;font-weight:700;color:${statusColor}">${aiRec}</td></tr>
        </table>
      </div>`;
  }).join("");

  const criticalCount = machineList.filter(m => m.status === "critical").length;
  const warningCount  = machineList.filter(m => m.status === "warning").length;
  const summaryBg     = criticalCount > 0 ? "#fff0f0" : warningCount > 0 ? "#fffbf0" : "#f0fff8";
  const summaryColor  = criticalCount > 0 ? "#cc2200" : warningCount > 0 ? "#cc8800" : "#008844";

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f4f6fb;padding:24px;border-radius:12px">
      <div style="background:#1b3a6b;color:#fff;padding:20px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:22px">🏭 InduSafe HMI</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:.85">Inclusive Industrial Machine Monitoring & Failure Detection</p>
      </div>

      <div style="background:${summaryBg};border:1px solid ${summaryColor}40;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <h2 style="margin:0 0 8px;color:${summaryColor};font-size:16px">
          ${reportType === "full" ? "📊 Full Dashboard Report" : "🚨 Machine Alert Report"}
        </h2>
        <p style="margin:0;font-size:13px;color:#444">Generated: ${generatedAt}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#444">
          Total: <b>${machineList.length}</b> &nbsp;|&nbsp;
          Critical: <b style="color:#cc2200">${criticalCount}</b> &nbsp;|&nbsp;
          Warnings: <b style="color:#cc8800">${warningCount}</b> &nbsp;|&nbsp;
          Healthy: <b style="color:#008844">${machineList.length - criticalCount - warningCount}</b>
        </p>
      </div>

      <h3 style="color:#1b3a6b;margin:0 0 12px;font-size:15px">Machine Details</h3>
      ${machineCards}

      <p style="margin-top:20px;color:#999;font-size:11px;text-align:center">
        Sent by InduSafe HMI — Human-Centric &amp; Inclusive Engineering Interfaces
      </p>
    </div>`;

  const logEntry = {
    id:         `EMAIL-${Date.now()}`,
    email,
    reportType: reportType || "selected",
    machineCount: machineList.length,
    timestamp:  new Date().toISOString(),
    sent:       false,
  };
  emailLogs.push(logEntry);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    await transporter.sendMail({
      from:    `"InduSafe HMI" <${EMAIL_USER}>`,
      to:      email,
      subject,
      html:    htmlBody,
    });
    logEntry.sent = true;
    console.log(`[Email] ${reportType || "selected"} report sent to ${email} (${machineList.length} machines)`);
    res.json({ success: true, message: "Email sent successfully with machine data.", log: logEntry });
  } catch (err) {
    console.log(`[Email] Failed: ${err.message} — saved to log`);
    res.json({ success: false, message: "Email failed — saved to backup log.", log: logEntry });
  }
});

// ✅ ADD THIS CODE — GET email backup logs
app.get("/api/email-logs", (req, res) => {
  res.json(emailLogs);
});

// ✅ ADD THIS CODE — AI recommendation for a specific machine
app.get("/api/ai-recommend/:machineId", (req, res) => {
  const machine = machines.find(m => m.id === req.params.machineId);
  if (!machine) return res.status(404).json({ error: "Machine not found" });

  const temp = parseFloat(machine.temp);
  let recommendation = "🟢 Normal operation — no action needed.";
  let level = "normal";
  if (temp >= 90) { recommendation = "🔴 Shut down immediately — critical temperature!"; level = "critical"; }
  else if (temp >= 70) { recommendation = "🟡 Check cooling system — temperature rising."; level = "warning"; }

  res.json({
    machineId:      machine.id,
    machineName:    machine.name,
    temperature:    machine.temp,
    status:         machine.status,
    recommendation,
    level,
  });
});

// POST /api/reports/:id/resolve — mark report as resolved
app.post("/api/reports/:id/resolve", (req, res) => {
  const { resolution } = req.body;
  const rpt = reports.find(r => r.id === req.params.id);
  if (!rpt) return res.status(404).json({ error: "Report not found" });
  rpt.resolvedAt = new Date().toISOString();
  rpt.resolution = resolution || "Resolved";
  res.json({ success: true, report: rpt });
});

// ✅ NEW: GET /api/health — system heartbeat endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status:   "ok",
    time:     new Date().toISOString(),
    machines: machines.length,
    critical: machines.filter(m => m.status === "critical").length,
    uptime:   process.uptime().toFixed(0) + "s",
  });
});

// GET /api/stats — summary statistics
app.get("/api/stats", (req, res) => {
  res.json({
    total:    machines.length,
    normal:   machines.filter(m => m.status === "normal").length,
    warning:  machines.filter(m => m.status === "warning").length,
    critical: machines.filter(m => m.status === "critical").length,
    offline:  machines.filter(m => m.status === "offline").length,
    openReports:    reports.filter(r => !r.resolvedAt).length,
    resolvedReports:reports.filter(r =>  r.resolvedAt).length,
  });
});

// POST /api/voice — parse voice command & return action (FIXED: correct status logic)
app.post("/api/voice", (req, res) => {
  const { command = "", lang = "en" } = req.body;
  const text = command.toLowerCase();

  // Status summary — FIXED: always re-count live machine states
  if (/status|summary|நிலை|report/.test(text)) {
    const criticalMachines = machines.filter(m => m.status === "critical");
    const warningMachines  = machines.filter(m => m.status === "warning");

    let reply;
    if (criticalMachines.length > 0) {
      const names = criticalMachines.map(m => m.name).join(", ");
      reply = `Critical alert! ${criticalMachines.length} machine${criticalMachines.length > 1 ? "s are" : " is"} in critical state: ${names}. Immediate shutdown and inspection required.`;
    } else if (warningMachines.length > 0) {
      const names = warningMachines.map(m => m.name).join(", ");
      reply = `Warning! ${warningMachines.length} machine${warningMachines.length > 1 ? "s have" : " has"} warnings: ${names}. Please inspect soon.`;
    } else {
      reply = "All machines are running normally. No critical or warning alerts at this time.";
    }
    return res.json({ reply });
  }

  // Zone query
  const zoneMatch = text.match(/zone\s+([abc])/i);
  if (zoneMatch) {
    const zone = `Zone ${zoneMatch[1].toUpperCase()}`;
    const zoneMachines = machines.filter(m => m.zone === zone);
    const criticals = zoneMachines.filter(m => m.status === "critical");
    const warnings  = zoneMachines.filter(m => m.status === "warning");
    let reply;
    if (criticals.length > 0) {
      reply = `${zone} has ${criticals.length} critical machine(s): ${criticals.map(m => m.name).join(", ")}. Immediate attention required.`;
    } else if (warnings.length > 0) {
      reply = `${zone} has ${warnings.length} machine(s) with warnings: ${warnings.map(m => m.name).join(", ")}.`;
    } else {
      reply = `${zone} is operating normally. All machines are healthy.`;
    }
    return res.json({ reply });
  }

  return res.json({ reply: "I didn't understand that command. Try asking for 'status' or 'Zone A report'." });
});

// ════════════════════════════════════════════════════
//  START SERVER
// ════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏭 InduSafe HMI Backend running on http://localhost:${PORT}`);
  console.log(`   GET  /api/machines        → All machine data`);
  console.log(`   GET  /api/machines/:id    → Single machine`);
  console.log(`   POST /api/acknowledge/:id → Acknowledge alert`);
  console.log(`   POST /api/report          → Report issue`);
  console.log(`   GET  /api/stats           → Dashboard stats`);
  console.log(`   POST /api/voice           → Voice command`);
  // ✅ ADD THIS CODE — new route logs
  console.log(`   POST /api/report-action   → Log action + AI recommend`);
  console.log(`   GET  /api/action-logs     → All action logs`);
  console.log(`   GET  /api/history/:id     → Machine history timeline`);
  console.log(`   POST /api/send-email      → Send Gmail alert`);
  console.log(`   GET  /api/email-logs      → Email backup logs`);
  console.log(`   GET  /api/ai-recommend/:id→ AI recommendation\n`);
});
