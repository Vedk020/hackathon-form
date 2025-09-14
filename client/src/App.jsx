import React, { useEffect, useState } from "react";
import "./styles.css";

const ADMIN_PASSWORD = "admin123";
// --- Backend API URL ---
const API_URL = "https://hackathon-form-7m99.onrender.com/api/registrations";

// --- Utility Functions (Unchanged) ---
function generateTeamNumber(existing = []) {
  let num;
  do {
    num = "TEAM" + Math.floor(10000 + Math.random() * 90000);
  } while (existing.includes(num));
  return num;
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  return csv;
}

// --- Reusable Form Field Component ---
const FormField = ({ id, label, error, ...props }) => (
  <div className="form-group">
    <label htmlFor={id} className="form-label">{label}</label>
    <input id={id} className="form-input" {...props} />
    {error && <div className="error">{error}</div>}
  </div>
);


export default function App() {
  const [form, setForm] = useState({
    teamName: "", headName: "", headEmail: "", password: "", headRegNo: "", contact: "",
    member1Name: "", member1Reg: "", member2Name: "", member2Reg: "",
  });
  
  const [registrations, setRegistrations] = useState([]);
  const [otpMap, setOtpMap] = useState({});
  const [otpInput, setOtpInput] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [recentTeam, setRecentTeam] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [showOnlyRound2, setShowOnlyRound2] = useState(false);

  // --- MODIFIED: Load data from backend API ---
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setRegistrations(data);
      } catch (error) {
        console.error("Failed to fetch registrations:", error);
        setErrors({ api: "Could not connect to the server. Is it running?" });
      }
    };
    fetchRegistrations();
  }, []);


  // --- Logic Functions (Updated for API calls) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    setErrors((s) => ({ ...s, [name]: null, otp: null, api: null }));
  };
  const validateAll = () => {
    const e = {};
    if (!form.teamName.trim()) e.teamName = "Team name is required";
    else if (registrations.some((r) => r.teamName.toLowerCase() === form.teamName.trim().toLowerCase())) e.teamName = "Team name already taken";
    if (!form.headName.trim()) e.headName = "Head name required";
    if (!form.headEmail.trim() || !form.headEmail.trim().endsWith("@vitapstudent.ac.in")) e.headEmail = "Valid @vitapstudent.ac.in email required";
    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.headRegNo.trim()) e.headRegNo = "Registration number required";
    if (!form.contact.trim()) e.contact = "Contact number required";
    if (!form.member1Name.trim()) e.member1Name = "Member 1 name required";
    if (!form.member1Reg.trim()) e.member1Reg = "Member 1 reg no required";
    if (!form.member2Name.trim()) e.member2Name = "Member 2 name required";
    if (!form.member2Reg.trim()) e.member2Reg = "Member 2 reg no required";
    return e;
  };
  const sendOtp = () => {
    const email = form.headEmail.trim();
    if (!email || !email.endsWith("@vitapstudent.ac.in")) { setErrors((s) => ({ ...s, headEmail: "A valid VIT-AP email is required" })); return; }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpMap((m) => ({ ...m, [email]: otp }));
    setSuccessMsg(`(Demo) OTP sent to ${email}. Your OTP is: ${otp}`);
    setTimeout(() => setSuccessMsg(""), 8000);
    setVerifiedEmail(null); setOtpInput("");
  };
  const verifyOtp = () => {
    const email = form.headEmail.trim();
    if (!otpMap[email]) { setErrors((s) => ({ ...s, otp: "No OTP sent to this email" })); return; }
    if (otpInput.trim() === otpMap[email]) {
      setVerifiedEmail(email);
      setSuccessMsg("Email verified successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } else { setErrors((s) => ({ ...s, otp: "Incorrect OTP" })); }
  };

  // --- FIXED: Registration Handler ---
  const handleRegister = async (e) => {
    e.preventDefault(); 
    setErrors({}); 
    setSuccessMsg("");

    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) { 
      setErrors(validationErrors); 
      return; 
    }
    if (verifiedEmail !== form.headEmail.trim()) { 
      setErrors((s) => ({ ...s, headEmail: "Please verify head email using OTP" })); 
      return; 
    }
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to register.');
      }

      const newReg = responseData;
      setRegistrations((s) => [newReg, ...s]);
      setRecentTeam(newReg);
      setSuccessMsg(`Registration successful! Your Team Number: ${newReg.teamNumber}`);
      setForm({ teamName: "", headName: "", headEmail: "", password: "", headRegNo: "", contact: "", member1Name: "", member1Reg: "", member2Name: "", member2Reg: "" });
      setOtpInput(""); 
      setVerifiedEmail(null);
      setTimeout(() => setSuccessMsg(""), 7000);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ api: error.message });
    }
  };

  const tryAdminLogin = () => {
    const pw = prompt("Enter admin password (demo):");
    if (pw === ADMIN_PASSWORD) setAdminMode(true);
    else if (pw) alert("Wrong password (demo). Hint: " + ADMIN_PASSWORD);
  };
  
  // --- FIXED: CSV Download Function ---
  const downloadCSV = () => {
    if (registrations.length === 0) {
        alert("No registrations to download.");
        return;
    }
    const dataToExport = registrations.map(
      ({ _id, id, password, __v, ...rest }) => ({ 
        ...rest, 
        round2: rest.round2 ? "YES" : "NO", 
        certificateSent: rest.certificateSent ? "YES" : "NO" 
      })
    );
    const csv = toCSV(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hackathon_registrations.csv`;
    document.body.appendChild(a); // Append to DOM
    a.click(); // Programmatically click the link
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  };

  const updateRegistration = async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update.');
      const updatedReg = await response.json();
      setRegistrations(regs => regs.map(r => r._id === id ? updatedReg : r));
    } catch (error) {
      console.error("Update error:", error);
    }
  };
  const toggleRound2 = (reg) => {
    updateRegistration(reg._id, { round2: !reg.round2 });
  };
  const sendCertificate = (team) => {
    const subject = `Certificate of Participation - ${team.teamName}`;
    const body = `Hello ${team.headName},\n\nCongratulations! Please find your participation certificate attached (demo).\n\n- Android Club VITAP`;
    window.location.href = `mailto:${team.headEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    updateRegistration(team._id, { certificateSent: true });
  };
  
  const visibleRegs = showOnlyRound2 ? registrations.filter((r) => r.round2) : registrations;

  return (
    <>
      <header className="header">
        <h1 className="header-title">Hackathon Registration</h1>
        <button className="btn small btn-outlined" onClick={() => (adminMode ? setAdminMode(false) : tryAdminLogin())}>
          {adminMode ? "Exit Admin" : "Admin"}
        </button>
      </header>

      <main className="container">
        {errors.api && <div className="card error-card">{errors.api}</div>}
        <div className="card">
          <h2 className="card-title">Register Your Team</h2>
          <form onSubmit={handleRegister} noValidate>
            <FormField id="teamName" label="Team Name" name="teamName" value={form.teamName} onChange={handleChange} error={errors.teamName} />
            <FormField id="headName" label="Team Head Name" name="headName" value={form.headName} onChange={handleChange} error={errors.headName} />
            <div className="row">
              <div style={{flex: '1'}}><FormField id="headEmail" label="Head Email (@vitapstudent.ac.in)" name="headEmail" value={form.headEmail} onChange={handleChange} error={errors.headEmail} /></div>
              <button type="button" className="btn small btn-outlined" onClick={sendOtp}>Send OTP</button>
            </div>
            <div className="row">
               <div style={{flex: '1'}}><FormField id="otp" label="Enter OTP" name="otp" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} error={errors.otp} /></div>
              <button type="button" className="btn small btn-outlined" onClick={verifyOtp}>Verify</button>
            </div>
            <FormField id="password" label="Password (min 8 characters)" name="password" value={form.password} onChange={handleChange} error={errors.password} type="password" />
            <FormField id="headRegNo" label="Head's Registration Number" name="headRegNo" value={form.headRegNo} onChange={handleChange} error={errors.headRegNo} />
            <FormField id="contact" label="Contact Number" name="contact" value={form.contact} onChange={handleChange} error={errors.contact} />
            <div className="divider"></div>
            <FormField id="member1Name" label="Member 1 Name" name="member1Name" value={form.member1Name} onChange={handleChange} error={errors.member1Name} />
            <FormField id="member1Reg" label="Member 1 Reg No" name="member1Reg" value={form.member1Reg} onChange={handleChange} error={errors.member1Reg} />
            <FormField id="member2Name" label="Member 2 Name" name="member2Name" value={form.member2Name} onChange={handleChange} error={errors.member2Name} />
            <FormField id="member2Reg" label="Member 2 Reg No" name="member2Reg" value={form.member2Reg} onChange={handleChange} error={errors.member2Reg} />
            <button type="submit" className="btn btn-filled" style={{ marginTop: 12 }}>Register Team</button>
            {successMsg && <div className="success">{successMsg}</div>}
          </form>
        </div>

        {recentTeam && (
          <div className="card" style={{textAlign: 'center'}}>
            <h3 className="card-title">🎉 Registration Confirmed</h3>
            <p className="text-secondary">Your Team Number Is</p>
            <p style={{fontSize: '3rem', color: 'var(--green-accent)', fontWeight: '900'}}>{recentTeam.teamNumber}</p>
          </div>
        )}

        {adminMode && (
          <div className="card">
            <h2 className="card-title">Admin Panel</h2>
            <button className="btn btn-filled" onClick={downloadCSV} style={{width: '100%', marginBottom: '24px'}}>Download All as CSV</button>
            <div className="divider"></div>
            <h4>Manage Teams ({registrations.length})</h4>
             <div className="admin-list">
                {registrations.length > 0 ? registrations.map((r) => (
                  <div className="admin-row" key={r._id}>
                    <div>
                      <strong style={{color: 'var(--text-white)'}}>{r.teamName}</strong>
                      <div className="text-secondary" style={{fontSize: '0.8rem'}}>{r.headName}</div>
                      <div className="admin-indicators">
                        {r.round2 && <span className="admin-chip round2">Round 2</span>}
                        {r.certificateSent && <span className="admin-chip cert-sent">Certificate Sent</span>}
                      </div>
                    </div>
                    <div className="admin-actions">
                      <button className="btn small btn-outlined" onClick={() => sendCertificate(r)}>Mail Cert</button>
                      <button className={`btn small ${r.round2 ? "btn-filled" : "btn-outlined"}`} onClick={() => toggleRound2(r)}>{r.round2 ? "✓ R2" : "To R2"}</button>
                    </div>
                  </div>
                )) : <p className="text-secondary">No registrations yet.</p>}
              </div>
          </div>
        )}
        
        <div className="card">
          <h2 className="card-title">Registered Teams</h2>
          <label className="checkbox-inline">
            <input type="checkbox" checked={showOnlyRound2} onChange={(e) => setShowOnlyRound2(e.target.checked)} />
            <span>Show only teams selected for Round 2</span>
          </label>
          <div className="teams-grid" style={{marginTop: '24px'}}>
            {visibleRegs.length > 0 ? visibleRegs.map((r) => (
              <div key={r._id} className="team-card">
                  <p className="team-name">{r.teamName}</p>
                  <p className="text-secondary" style={{fontSize: '0.8rem'}}>{r.teamNumber}</p>
              </div>
            )) : <p className="text-secondary" style={{marginTop: '16px'}}>No teams to display.</p>}
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <h2 className="header-title">Android Club VITAP</h2>
        <div className="footer-bottom">
            <p>Copyright © 2025 All rights reserved | Android Club Vitap</p>
        </div>
      </footer>
    </>
  );
}

