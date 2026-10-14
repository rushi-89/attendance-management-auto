import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BellRing, BookOpen, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardCheck, FileSpreadsheet, FileUp, Mail, MessageSquareText,
  RefreshCw, Send, ShieldCheck, Users, XCircle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [channels, setChannels] = useState({ email: true, sms: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [health, setHealth] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", emailConfigured: false, smsConfigured: false }));
  }, []);

  const visibleRecords = useMemo(() => {
    if (!preview) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return preview.records;
    return preview.records.filter(r =>
      [r.registrationNo, r.studentName, r.parentMobile, r.emailRecipient]
        .some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [preview, filter]);

  async function uploadWorkbook(event) {
    event.preventDefault();
    if (!file) { setError("Please choose an Excel workbook first."); return; }
    setLoading(true); setError(""); setPreview(null); setReport(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API}/api/attendance/upload`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Unable to process this workbook.");
      setPreview(data);
    } catch (e) {
      setError(`${e.message} Check that the Node.js backend and Python dependencies are running.`);
    } finally { setLoading(false); }
  }

  async function sendNotifications() {
    const selectedChannels = Object.keys(channels).filter(k => channels[k]);
    if (!selectedChannels.length) { setError("Select at least one notification channel."); return; }
    const confirmed = window.confirm(
      `Send notifications for ${preview.validCount} valid student rows using ${selectedChannels.join(" and ")}? This will contact real recipients.`
    );
    if (!confirmed) return;

    setLoading(true); setError(""); setReport(null);
    try {
      const response = await fetch(`${API}/api/attendance/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: preview.batchId,
          channels: selectedChannels,
          confirmSend: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Notification request failed.");
      setReport(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function resetAll() {
    setFile(null); setPreview(null); setReport(null); setError(""); setFilter("");
    const input = document.getElementById("excel-file");
    if (input) input.value = "";
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Smart Attendance home">
          <span className="brand-icon"><BookOpen size={21} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>Smart Attendance</strong><small>FACULTY CONSOLE</small></span>
        </a>
        <nav className="top-nav"><span className="nav-current">Overview</span><span>Notifications</span><span>Reports</span></nav>
        <div className="header-right"><span className={`connection-dot ${health?.status === "offline" ? "offline" : ""}`} />
          <span>{health?.status === "offline" ? "API disconnected" : "Workspace ready"}</span>
        </div>
      </header>

      <main className="page-content">
        <section className="welcome-row">
          <div>
            <div className="eyebrow">STUDENT COMMUNICATION WORKSPACE</div>
            <h1>Attendance, <em>communicated.</em></h1>
            <p>Upload a faculty attendance sheet, verify each record, and prepare parent notifications in one place.</p>
          </div>
          <div className="welcome-art" aria-hidden="true"><div className="art-circle"><BellRing size={32}/></div><span className="art-dot dot-one"/><span className="art-dot dot-two"/><span className="art-line"/></div>
        </section>

        <section className="steps-strip">
          <div className="step-item active"><span>01</span><div><strong>Upload sheet</strong><small>Excel workbook</small></div></div>
          <ArrowRight className="step-arrow" size={17}/>
          <div className={`step-item ${preview ? "active" : ""}`}><span>02</span><div><strong>Review records</strong><small>Check details</small></div></div>
          <ArrowRight className="step-arrow" size={17}/>
          <div className={`step-item ${report ? "active" : ""}`}><span>03</span><div><strong>Send & report</strong><small>Delivery attempts</small></div></div>
        </section>

        {error && <div className="alert alert-error"><XCircle size={18}/><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><XCircle size={16}/></button></div>}

        <section className="content-grid">
          <div className="main-column">
            <section className="panel upload-panel">
              <div className="panel-heading">
                <div className="heading-icon"><FileSpreadsheet size={20}/></div>
                <div><h2>Upload attendance workbook</h2><p>Start with the Excel file provided by your faculty member.</p></div>
              </div>
              <form onSubmit={uploadWorkbook}>
                <label className={`dropzone ${file ? "has-file" : ""}`} htmlFor="excel-file">
                  <span className="upload-symbol">{file ? <FileSpreadsheet size={25}/> : <FileUp size={25}/>}</span>
                  <strong>{file ? file.name : "Choose an Excel workbook"}</strong>
                  <span>{file ? `${(file.size / 1024).toFixed(1)} KB · Ready to validate` : "Drag a file here or browse from your device"}</span>
                  <span className="file-types">XLSX or XLS <i/> Maximum 10 MB</span>
                  <input id="excel-file" type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setReport(null); }} />
                </label>
                <div className="upload-footer"><span><ShieldCheck size={15}/> Data is processed by your local backend</span><button className="button button-primary" disabled={loading || !file}>{loading ? <><RefreshCw size={16} className="spin"/> Processing</> : <>Validate & preview <ArrowRight size={16}/></>}</button></div>
              </form>
              <div className="requirements">
                <div className="requirements-title"><ClipboardCheck size={16}/> Expected Excel columns</div>
                <div className="tag-list"><span>Registration No.</span><span>Student Name</span><span>Parent Mobile</span><span>Attendance %</span></div>
                <p>Parent Email and Student Email are optional. Every valid student row is included, regardless of attendance percentage.</p>
              </div>
            </section>

            {preview && <section className="panel records-panel">
              <div className="panel-heading panel-heading-between">
                <div className="heading-group"><div className="heading-icon"><Users size={20}/></div><div><h2>Extracted student records</h2><p>Review recipient details before proceeding.</p></div></div>
                <span className="status-pill"><CheckCircle2 size={14}/>{preview.validCount} valid</span>
              </div>
              <div className="stats-grid">
                <div className="stat-card"><span>Valid records</span><strong>{preview.validCount}</strong><small>Ready for review</small></div>
                <div className="stat-card"><span>Rows with errors</span><strong>{preview.invalidCount}</strong><small>Excluded from sending</small></div>
                <div className="stat-card"><span>Email service</span><strong className="stat-text">{health?.emailConfigured ? "Configured" : "Not configured"}</strong><small>SMTP settings</small></div>
                <div className="stat-card"><span>SMS service</span><strong className="stat-text">{health?.smsConfigured ? "Configured" : "Not configured"}</strong><small>SMS provider settings</small></div>
              </div>
              {preview.rowErrors?.length > 0 && <details className="row-errors"><summary>Review {preview.rowErrors.length} invalid Excel rows <ChevronDown size={15}/></summary><div>{preview.rowErrors.map((r, i) => <p key={i}><strong>Row {r.excelRow}:</strong> {r.studentName || r.registrationNo || "Unknown student"} · {r.errors.join("; ")}</p>)}</div></details>}
              <div className="table-tools"><label className="search-box"><span>⌕</span><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name, registration or contact"/></label><span>{visibleRecords.length} of {preview.records.length} students</span></div>
              <div className="table-container"><table><thead><tr><th>Student</th><th>Registration no.</th><th>Attendance</th><th>Parent mobile</th><th>Email recipient</th></tr></thead><tbody>
                {visibleRecords.map((r, i) => <tr key={`${r.registrationNo}-${i}`}><td><span className="student-avatar">{(r.studentName || "?").split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase()}</span><strong>{r.studentName}</strong></td><td>{r.registrationNo}</td><td><span className="attendance-chip">{r.attendancePercentage}%</span></td><td>{r.parentMobile || <span className="missing">Missing</span>}</td><td>{r.emailRecipient || <span className="muted">Not provided</span>}</td></tr>)}
              </tbody></table></div>
              <button className="text-action" onClick={() => setShowMessages(!showMessages)}>{showMessages ? "Hide message preview" : "Preview notification message"} <ChevronDown size={15} className={showMessages ? "rotate" : ""}/></button>
              {showMessages && <div className="message-preview"><div className="message-top"><span><Mail size={15}/> EMAIL / SMS MESSAGE</span><span>Sample preview</span></div><strong>{preview.records[0]?.emailSubject}</strong><p>{preview.records[0]?.message}</p><small>Personalized for each student with their name, registration number, and attendance percentage.</small></div>}
              <div className="send-panel">
                <div className="send-copy"><h3>Choose notification channels</h3><p>All valid student rows will be processed for the selected channels.</p>
                  <div className="channel-options">
                    <label className="channel-check"><input type="checkbox" checked={channels.email} onChange={e => setChannels({...channels, email: e.target.checked})}/><span className="channel-icon email-icon"><Mail size={17}/></span><span><strong>Email</strong><small>Parent email, then student email</small></span></label>
                    <label className="channel-check"><input type="checkbox" checked={channels.sms} onChange={e => setChannels({...channels, sms: e.target.checked})}/><span className="channel-icon sms-icon"><MessageSquareText size={17}/></span><span><strong>SMS</strong><small>Parent mobile number</small></span></label>
                  </div>
                </div>
                <button className="button button-primary send-button" disabled={loading} onClick={sendNotifications}>{loading ? <><RefreshCw size={16} className="spin"/> Sending</> : <>Confirm & proceed <Send size={16}/></>}</button>
              </div>
              <p className="privacy-note"><ShieldCheck size={14}/> A confirmation prompt appears before sending. Provider acceptance does not guarantee final delivery.</p>
            </section>}

            {report && <section className="panel report-panel">
              <div className="panel-heading panel-heading-between"><div className="heading-group"><div className="heading-icon"><ClipboardCheck size={20}/></div><div><h2>Notification delivery report</h2><p>Summary of provider submission attempts.</p></div></div><span className="status-pill">Completed</span></div>
              <div className="stats-grid">
                <div className="stat-card"><span>Total attempts</span><strong>{report.attempted}</strong></div>
                <div className="stat-card"><span>Submitted</span><strong className="good-number">{report.submitted}</strong></div>
                <div className="stat-card"><span>Failed</span><strong className="bad-number">{report.failed}</strong></div>
                <div className="stat-card"><span>Skipped</span><strong>{report.skipped}</strong></div>
              </div>
              <div className="table-container"><table><thead><tr><th>Student</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Details</th></tr></thead><tbody>{report.results.map((r, i) => <tr key={i}><td><strong>{r.studentName}</strong><small className="table-sub">{r.registrationNo}</small></td><td>{r.channel.toUpperCase()}</td><td>{r.recipient || "—"}</td><td><span className={`result-pill ${r.status}`}>{r.status}</span></td><td>{r.detail}</td></tr>)}</tbody></table></div>
              <button className="button button-secondary" onClick={resetAll}>Start a new upload</button>
            </section>}
          </div>

          <aside className="side-column">
            <section className="panel side-panel">
              <div className="side-title"><span className="side-icon"><CircleHelp size={18}/></span><h3>How it works</h3></div>
              <ol className="how-list"><li><span>1</span><div><strong>Upload Excel</strong><p>Select the monthly or period attendance workbook.</p></div></li><li><span>2</span><div><strong>Validate the data</strong><p>Python checks required fields, formats and duplicate registration numbers.</p></div></li><li><span>3</span><div><strong>Review the preview</strong><p>Confirm student details and message content before sending.</p></div></li><li><span>4</span><div><strong>Send and review</strong><p>Check provider submission status and any failures.</p></div></li></ol>
            </section>
            <section className="panel side-panel">
              <div className="side-title"><span className="side-icon"><ShieldCheck size={18}/></span><h3>Data & privacy</h3></div>
              <p className="side-description">This development version does not use a database. Preview data and delivery logs remain in backend memory and are cleared when the server restarts.</p>
              <div className="privacy-list"><span><CheckCircle2 size={15}/> No database required</span><span><CheckCircle2 size={15}/> Review before sending</span><span><CheckCircle2 size={15}/> Credentials stay in backend</span></div>
            </section>
            <section className="side-note"><span className="note-icon"><BellRing size={17}/></span><div><strong>Before you send</strong><p>Use a test workbook and your own test contact details first. SMS delivery may require an approved provider, sender ID and template setup.</p></div></section>
          </aside>
        </section>
        <footer className="page-footer"><span>Smart Attendance <i/> Faculty tools</span><span>React <i/> Node.js <i/> Python</span></footer>
      </main>
    </div>
  );
}

export default App;
