import React, { useState, useEffect } from "react";
 
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000/api";
 
// ─── API LAYER ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("memora_access");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
 
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    // "Failed to fetch" lands here — give a clear, actionable message
    throw new Error(
      `Cannot reach the server at ${API_BASE}. ` +
      `Make sure your Django backend is running ("python manage.py runserver") ` +
      `and CORS is configured to allow this origin. ` +
      `Original error: ${networkErr.message}`
    );
  }
 
  // Auto-refresh on 401
  if (res.status === 401) {
    const refresh = localStorage.getItem("memora_refresh");
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_BASE}/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem("memora_access", data.access);
          headers["Authorization"] = `Bearer ${data.access}`;
          res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        } else {
          localStorage.removeItem("memora_access");
          localStorage.removeItem("memora_refresh");
          localStorage.removeItem("memora_user");
          window.location.reload();
          return;
        }
      } catch {
        throw new Error("Session expired and could not refresh. Please log in again.");
      }
    }
  }
 
  if (res.status === 204) return null;
 
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server returned an unexpected response (status ${res.status}). Check your backend.`);
  }
 
  if (!res.ok) {
    // Extract the most useful error message from DRF's response shapes
    let msg = "Something went wrong";
    if (json?.detail) {
      msg = json.detail;
    } else if (json?.non_field_errors?.[0]) {
      msg = json.non_field_errors[0];
    } else if (json && typeof json === "object") {
      const firstVal = Object.values(json)[0];
      if (typeof firstVal === "string") msg = firstVal;
      else if (Array.isArray(firstVal) && typeof firstVal[0] === "string") msg = firstVal[0];
    }
    throw new Error(String(msg));
  }
  return json;
}
 
const api = {
  register:    (b)     => apiFetch("/register/",      { method:"POST",   body:JSON.stringify(b) }),
  login:       (b)     => apiFetch("/login/",         { method:"POST",   body:JSON.stringify(b) }),
  getNotes:    ()      => apiFetch("/notes/"),
  createNote:  (b)     => apiFetch("/notes/",         { method:"POST",   body:JSON.stringify(b) }),
  updateNote:  (id, b) => apiFetch(`/notes/${id}/`,   { method:"PUT",    body:JSON.stringify(b) }),
  deleteNote:  (id)    => apiFetch(`/notes/${id}/`,   { method:"DELETE" }),
  toggleLock:  (id)    => apiFetch(`/notes/${id}/lock/`, { method:"PATCH" }),
  getEvents:   ()      => apiFetch("/events/"),
  createEvent: (b)     => apiFetch("/events/",        { method:"POST",   body:JSON.stringify(b) }),
  deleteEvent: (id) => apiFetch(`/events/${id}/`, { method: "DELETE" }),
};
 
// ─── STAR DATA (stable – generated once outside render) ───────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id:    i,
  top:   parseFloat((Math.random() * 100).toFixed(2)),
  left:  parseFloat((Math.random() * 100).toFixed(2)),
  size:  parseFloat((Math.random() * 1.5 + 0.7).toFixed(2)),
  dur:   parseFloat((2 + Math.random() * 3).toFixed(1)),
  delay: parseFloat((Math.random() * 3).toFixed(1)),
}));
 
// ─── COSMIC BACKGROUND ────────────────────────────────────────────────────────
function CosmicBg() {
  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(135deg,#0a0515 0%,#120a2e 40%,#1a0a3e 70%,#0d0820 100%)"
      }} />
      {[
        { top:"8%",  left:"4%",  w:320, c:"rgba(120,60,220,.18)",  d:4 },
        { top:"62%", left:"78%", w:260, c:"rgba(90,30,180,.15)",   d:5 },
        { top:"78%", left:"8%",  w:210, c:"rgba(160,80,255,.12)",  d:6 },
        { top:"18%", left:"68%", w:190, c:"rgba(80,20,160,.2)",    d:3 },
        { top:"44%", left:"44%", w:150, c:"rgba(130,50,255,.10)",  d:7 },
      ].map((o,i) => (
        <div key={i} style={{
          position:"absolute", top:o.top, left:o.left, width:o.w, height:o.w, borderRadius:"50%",
          background:`radial-gradient(circle,${o.c} 0%,transparent 70%)`,
          filter:"blur(40px)", animation:`mPulse ${o.d}s ease-in-out infinite alternate`,
        }} />
      ))}
      {STARS.map(s => (
        <div key={s.id} style={{
          position:"absolute", top:`${s.top}%`, left:`${s.left}%`,
          width:s.size, height:s.size, borderRadius:"50%",
          background:"rgba(255,255,255,.65)",
          animation:`mTwinkle ${s.dur}s ease-in-out infinite alternate`,
          animationDelay:`${s.delay}s`,
        }} />
      ))}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        *{font-family:'Poppins',sans-serif;box-sizing:border-box;}
        @keyframes mPulse{from{opacity:.6;transform:scale(1)}to{opacity:1;transform:scale(1.15)}}
        @keyframes mTwinkle{from{opacity:.15}to{opacity:.9}}
        @keyframes mFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mScaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes mSpin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(150,80,255,.4);border-radius:2px}
        input::placeholder,textarea::placeholder{color:rgba(180,150,230,.4)}
      `}</style>
    </div>
  );
}
 
// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function GlassInput({placeholder="", type="text", value="", onChange= () => {}, icon=null, autoFocus=false, onKeyDown= () => {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative", width:"100%" }}>
      {icon && (
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:.4, pointerEvents:"none" }}>
          {icon}
        </span>
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoFocus={autoFocus} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width:"100%", padding: icon ? "13px 16px 13px 40px" : "13px 16px",
          background:"rgba(255,255,255,.06)",
          border:`1px solid ${focused ? "rgba(160,100,255,.7)" : "rgba(160,100,255,.22)"}`,
          borderRadius:12, color:"#e8d5ff", fontSize:14, outline:"none",
          backdropFilter:"blur(10px)", transition:"border-color .2s",
          boxShadow: focused ? "0 0 0 3px rgba(120,60,220,.14)" : "none",
        }}
      />
    </div>
  );
}
 
function GlowButton({ children, onClick, fullWidth, disabled, secondary, small }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: fullWidth ? "100%" : "auto",
        padding: small ? "8px 18px" : "13px 28px",
        background: secondary
          ? "rgba(255,255,255,.07)"
          : disabled ? "rgba(100,60,180,.4)"
          : hov ? "linear-gradient(135deg,#9b4dff,#6a1fd4,#b060ff)"
          : "linear-gradient(135deg,#7b2fff,#5a12b8,#9540f5)",
        border: secondary ? "1px solid rgba(255,255,255,.15)" : "none",
        borderRadius:13, color:"#fff", fontSize: small ? 13 : 15, fontWeight:600,
        cursor: disabled ? "not-allowed" : "pointer", transition:"all .22s",
        boxShadow: hov && !secondary && !disabled
          ? "0 0 28px rgba(130,50,255,.55),0 4px 18px rgba(0,0,0,.35)"
          : !secondary ? "0 0 14px rgba(130,50,255,.28)" : "none",
        transform: hov && !disabled ? "translateY(-1px)" : "none",
        opacity: disabled ? .7 : 1,
      }}
    >{children}</button>
  );
}
 
function Avatar({ gender, size=80 }) {
  const seed = gender === "male" ? "Felix" : gender === "female" ? "Sophia" : "Riley";
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:"linear-gradient(135deg,#5a12b8,#9b4dff)",
      padding:Math.max(2, Math.round(size * 0.035)),
      boxShadow:"0 0 22px rgba(130,50,255,.5),0 0 50px rgba(130,50,255,.18)",
      flexShrink:0,
    }}>
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
        alt="avatar"
        style={{ width:"100%", height:"100%", borderRadius:"50%", background:"#1a0a3e", display:"block" }}
      />
    </div>
  );
}
 
function Spinner({ size=18 }) {
  return (
    <span style={{
      display:"inline-block", width:size, height:size,
      border:"2px solid rgba(255,255,255,.2)", borderTopColor:"#c084fc",
      borderRadius:"50%", animation:"mSpin .7s linear infinite",
      verticalAlign:"middle",
    }} />
  );
}
 
function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background:"rgba(220,38,38,.15)", border:"1px solid rgba(220,38,38,.3)",
      borderRadius:10, padding:"10px 14px", color:"#fca5a5", fontSize:13, textAlign:"center",
    }}>{msg}</div>
  );
}
 
// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
 
  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const data = await api.login({ email: email.trim(), password });
      // Store tokens
      localStorage.setItem("memora_access",  data.tokens.access);
      localStorage.setItem("memora_refresh", data.tokens.refresh);
      const safeUser = {
        id:     data.user?.id     ?? null,
        name:   data.user?.name   ?? email.split("@")[0],
        email:  data.user?.email  ?? email,
        gender: data.user?.gender ?? "neutral",
      };
      localStorage.setItem("memora_user", JSON.stringify(safeUser));
      onLogin(safeUser);
    } catch (e) {
      console.error("Login error:", e);
      const raw = e.message || "";
      if (raw.includes("Cannot reach the server") || raw.includes("Failed to fetch")) {
        setError("Cannot connect to backend server. Make sure Django is running on port 8000.");
      } else {
        setError(raw || "Invalid email or password.");
      }
    } finally { setLoading(false); }
  };
 
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, position:"relative", zIndex:1 }}>
      <div style={{
        background:"rgba(28,8,65,.6)", backdropFilter:"blur(26px)",
        border:"1px solid rgba(160,100,255,.22)", borderRadius:28,
        padding:"48px 36px", width:"100%", maxWidth:380,
        boxShadow:"0 8px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07)",
        animation:"mScaleIn .4s ease",
      }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <h1 style={{ fontSize:36, fontWeight:800, color:"#fff", margin:0 }}>
            Memora <span style={{ color:"#c084fc" }}>✨</span>
          </h1>
          <p style={{ color:"rgba(200,170,255,.65)", marginTop:8, fontSize:14 }}>Think. Write. Remember.</p>
          <div style={{ display:"flex", justifyContent:"center", marginTop:22 }}>
            <Avatar gender="neutral" size={88} />
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <GlassInput placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} icon="✉" autoFocus
            onKeyDown={e => e.key==="Enter" && handleLogin()} />
          <GlassInput placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} icon="🔒"
            onKeyDown={e => e.key==="Enter" && handleLogin()} />
          <ErrorBanner msg={error} />
          <div style={{ marginTop:4 }}>
            <GlowButton fullWidth onClick={handleLogin} disabled={loading}>
              {loading ? <><Spinner /> &nbsp;Signing in…</> : "Sign In →"}
            </GlowButton>
          </div>
          <p style={{ textAlign:"center", color:"rgba(200,170,255,.6)", fontSize:13, margin:0 }}>
            Don't have an account?{" "}
            <span onClick={onGoRegister} style={{ color:"#c084fc", cursor:"pointer", fontWeight:600 }}>Register</span>
          </p>
          <p style={{ textAlign:"center", color:"rgba(160,130,210,.35)", fontSize:11, margin:0 }}>
            By continuing you agree to our Terms &amp; Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
 
// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { key:"male",    label:"Male",            seed:"Felix"  },
  { key:"female",  label:"Female",          seed:"Sophia" },
  { key:"neutral", label:"Prefer not to say", seed:"Riley" },
];
 
function RegisterPage({ onRegister, onGoLogin }) {
  const [name,     setName]     = useState("");
  const [gender,   setGender]   = useState("male");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
 
  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const data = await api.register({ name: name.trim(), email: email.trim(), password, gender });
      // Store tokens
      localStorage.setItem("memora_access",  data.tokens.access);
      localStorage.setItem("memora_refresh", data.tokens.refresh);
      // Build guaranteed-safe user object — this was the root cause of the blank screen bug
      const safeUser = {
        id:     data.user?.id     ?? null,
        name:   data.user?.name   ?? name.trim(),
        email:  data.user?.email  ?? email.trim(),
        gender: data.user?.gender ?? gender,
      };
      localStorage.setItem("memora_user", JSON.stringify(safeUser));
      onRegister(safeUser);
    } catch (e) {
      console.error("Registration error:", e);
      const raw = e.message || "";
      if (raw.includes("Cannot reach the server") || raw.includes("Failed to fetch")) {
        setError("Cannot connect to backend. Make sure Django is running on port 8000 and CORS is configured. See setup steps below.");
      } else {
        setError(raw || "Registration failed. Please try again.");
      }
    } finally { setLoading(false); }
  };
 
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, position:"relative", zIndex:1 }}>
      <div style={{
        background:"rgba(28,8,65,.6)", backdropFilter:"blur(26px)",
        border:"1px solid rgba(160,100,255,.22)", borderRadius:28,
        padding:"40px 36px", width:"100%", maxWidth:420,
        boxShadow:"0 8px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07)",
        animation:"mScaleIn .4s ease",
      }}>
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:20 }}>💜</span>
            <span style={{ color:"rgba(200,170,255,.6)", fontSize:13 }}>Memora</span>
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, color:"#fff", margin:0 }}>
            Create Account <span style={{ color:"#c084fc" }}>✨</span>
          </h1>
          <p style={{ color:"rgba(200,170,255,.65)", marginTop:6, fontSize:13 }}>Think. Write. Remember.</p>
        </div>
 
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:"rgba(200,170,255,.75)", fontSize:13, marginBottom:6, display:"block" }}>Full name</label>
            <GlassInput placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} autoFocus />
          </div>
 
          <div>
            <label style={{ color:"rgba(200,170,255,.75)", fontSize:13, marginBottom:8, display:"block" }}>Gender</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {GENDER_OPTIONS.map(g => (
                <div key={g.key} onClick={() => setGender(g.key)} style={{
                  padding:"13px 6px", borderRadius:14, cursor:"pointer", textAlign:"center",
                  background: gender===g.key ? "rgba(130,50,255,.25)" : "rgba(255,255,255,.05)",
                  border: gender===g.key ? "1.5px solid rgba(160,100,255,.7)" : "1.5px solid rgba(255,255,255,.09)",
                  boxShadow: gender===g.key ? "0 0 18px rgba(130,50,255,.3)" : "none",
                  transition:"all .2s", userSelect:"none",
                }}>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${g.seed}&backgroundColor=b6e3f4,c0aede`}
                    alt={g.label}
                    style={{ width:42, height:42, borderRadius:"50%", background:"#1a0a3e", display:"block", margin:"0 auto 6px" }}
                  />
                  <span style={{ color:"#e8d5ff", fontSize:11, fontWeight:500, lineHeight:1.3 }}>{g.label}</span>
                </div>
              ))}
            </div>
          </div>
 
          <div>
            <label style={{ color:"rgba(200,170,255,.75)", fontSize:13, marginBottom:6, display:"block" }}>Email address</label>
            <GlassInput placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} icon="✉" />
          </div>
 
          <GlassInput placeholder="Password (min 6 chars)" type="password" value={password}
            onChange={e=>setPassword(e.target.value)} icon="🔒"
            onKeyDown={e => e.key==="Enter" && handleRegister()} />
 
          <ErrorBanner msg={error} />
 
          <div style={{ marginTop:4 }}>
            <GlowButton fullWidth onClick={handleRegister} disabled={loading}>
              {loading ? <><Spinner /> &nbsp;Creating account…</> : "Create Account →"}
            </GlowButton>
          </div>
 
          <p style={{ textAlign:"center", color:"rgba(200,170,255,.6)", fontSize:13, margin:0 }}>
            Already have an account?{" "}
            <span onClick={onGoLogin} style={{ color:"#c084fc", cursor:"pointer", fontWeight:600 }}>Sign In</span>
          </p>
 
          {/* Setup guide — shown only when backend is unreachable */}
          {error && error.includes("Cannot connect") && (
            <div style={{
              background:"rgba(80,30,150,.2)", border:"1px solid rgba(160,100,255,.25)",
              borderRadius:12, padding:"14px 16px", fontSize:12,
              color:"rgba(200,170,255,.8)", lineHeight:1.8,
            }}>
              <div style={{ fontWeight:700, color:"#c084fc", marginBottom:6 }}>🛠 Backend setup checklist:</div>
              <div>1. <code style={{color:"#e9d5ff"}}>cd your-backend-folder</code></div>
              <div>2. <code style={{color:"#e9d5ff"}}>pip install django djangorestframework djangorestframework-simplejwt django-cors-headers</code></div>
              <div>3. <code style={{color:"#e9d5ff"}}>python manage.py migrate</code></div>
              <div>4. <code style={{color:"#e9d5ff"}}>python manage.py runserver</code></div>
              <div style={{marginTop:6}}>5. In <code style={{color:"#e9d5ff"}}>settings.py</code> add:</div>
              <pre style={{
                background:"rgba(0,0,0,.3)", borderRadius:8, padding:"8px 10px",
                margin:"6px 0 0", fontSize:11, overflowX:"auto", color:"#d8b4fe",
                whiteSpace:"pre-wrap",
              }}>{`INSTALLED_APPS += ['corsheaders']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...]
CORS_ALLOW_ALL_ORIGINS = True  # dev only`}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 
// ─── NOTE COLORS ──────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { name:"purple",  bg:"linear-gradient(135deg,#6b21a8,#9333ea)" },
  { name:"amber",   bg:"linear-gradient(135deg,#b45309,#f59e0b)" },
  { name:"emerald", bg:"linear-gradient(135deg,#065f46,#10b981)" },
  { name:"blue",    bg:"linear-gradient(135deg,#1e40af,#3b82f6)" },
  { name:"rose",    bg:"linear-gradient(135deg,#9f1239,#f43f5e)" },
  { name:"cyan",    bg:"linear-gradient(135deg,#0e7490,#06b6d4)" },
];
const colorBg = (name) => (NOTE_COLORS.find(c=>c.name===name) || NOTE_COLORS[0]).bg;
 
// ─── NOTE CARD ────────────────────────────────────────────────────────────────
function NoteCard({ note, onClick, onDelete }) {
  const [hov, setHov] = useState(false);
  const date = new Date(note.created_at).toLocaleDateString("en-US",
    { month:"long", day:"numeric", year:"numeric" });
 
  return (
    <div
      onClick={() => onClick(note)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:colorBg(note.color), borderRadius:20, padding:"20px",
        cursor:"pointer", position:"relative", overflow:"hidden", minHeight:155,
        transform: hov ? "scale(1.03) translateY(-3px)" : "scale(1)",
        boxShadow: hov ? "0 12px 38px rgba(0,0,0,.45),0 0 22px rgba(130,50,255,.2)" : "0 4px 18px rgba(0,0,0,.3)",
        transition:"all .22s ease", animation:"mFadeUp .35s ease",
      }}
    >
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(135deg,rgba(255,255,255,.13) 0%,transparent 55%)",
        borderRadius:20, pointerEvents:"none",
      }} />
 
      {note.is_locked ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:115 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🔒</div>
          <div style={{ color:"rgba(255,255,255,.85)", fontWeight:600, fontSize:14 }}>{note.title}</div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:11, marginTop:8 }}>{date}</div>
        </div>
        ) : note.content?.startsWith("data:image") ? (
        <>
          <div style={{ color:"#fff", fontWeight:700, fontSize:14, margin:"0 0 8px" }}>
            🎨 {note.title}
          </div>
          <div style={{ borderRadius:10, overflow:"hidden", height:88, border:"1px solid rgba(255,255,255,.15)" }}>
            <img src={note.content} alt="doodle" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          </div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:11, marginTop:8 }}>{date}</div>
        </>
       ) : (
        <>
          <h3 style={{ color:"#fff", fontWeight:700, fontSize:15, margin:"0 0 9px", lineHeight:1.3, wordBreak:"break-word" }}>
            {note.title}
          </h3>
          <div style={{ color:"rgba(255,255,255,.75)", fontSize:13, lineHeight:1.6, overflow:"hidden", maxHeight:70 }}>
            {(note.content || "").split("\n").slice(0,3).map((line,i) => (
              <div key={i} style={{ marginBottom:1 }}>{line || "\u00A0"}</div>
            ))}
          </div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:11, marginTop:11 }}>{date}</div>
        </>
      )}
 
      {hov && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(note.id); }}
          style={{
            position:"absolute", top:10, right:10,
            background:"rgba(0,0,0,.35)", border:"none", borderRadius:8,
            color:"#fff", cursor:"pointer", padding:"3px 9px", fontSize:13, lineHeight:1,
          }}
        >✕</button>
      )}
    </div>
  );
}
 
// ─── NOTE EDITOR MODAL ────────────────────────────────────────────────────────
function NoteEditor({ note, onSave, onClose, saving }) {
  const [title,   setTitle]   = useState(note?.title   ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color,   setColor]   = useState(note?.color   ?? "purple");
  const [locked,  setLocked]  = useState(note?.is_locked ?? false);
 
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.72)",
      backdropFilter:"blur(8px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:200, padding:20,
    }}>
      <div style={{
        background:"rgba(20,5,52,.97)", backdropFilter:"blur(24px)",
        border:"1px solid rgba(160,100,255,.3)", borderRadius:24, padding:28,
        width:"100%", maxWidth:560, maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 20px 80px rgba(0,0,0,.65)", animation:"mScaleIn .25s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h2 style={{ color:"#fff", fontWeight:700, fontSize:17, margin:0 }}>
            {note?.id ? "Edit Note" : "New Note"}
          </h2>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.1)", border:"none", borderRadius:8,
            color:"#fff", cursor:"pointer", padding:"5px 12px", fontSize:14,
          }}>✕</button>
        </div>
 
        <input
          value={title} onChange={e=>setTitle(e.target.value)} placeholder="Note title…" autoFocus
          style={{
            width:"100%", padding:"12px 16px", marginBottom:12,
            background:"rgba(255,255,255,.06)", border:"1px solid rgba(160,100,255,.25)",
            borderRadius:12, color:"#e8d5ff", fontSize:16, fontWeight:600, outline:"none",
          }}
        />
 
        {content?.startsWith("data:image") ? (
          <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid rgba(160,100,255,.2)", marginBottom:4 }}>
           <img src={content} alt="doodle" style={{ width:"100%", display:"block" }} />
           <div style={{ padding:"8px 12px", background:"rgba(255,255,255,.04)", color:"rgba(200,170,255,.5)", fontSize:12 }}>
             🎨 Drawing note — open with the doodle button to edit
           </div>
          </div>
        ) : (
         <textarea
           value={content} onChange={e=>setContent(e.target.value)}
           placeholder="Start writing your note…"
           style={{
             width:"100%", minHeight:175, padding:"13px 16px",
             background:"rgba(255,255,255,.04)", border:"1px solid rgba(160,100,255,.2)",
             borderRadius:12, color:"#e8d5ff", fontSize:14, outline:"none",
             resize:"vertical", lineHeight:1.7,
          }}
        />
      )} 
        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:14 }}>
          <span style={{ color:"rgba(200,170,255,.6)", fontSize:13 }}>Color:</span>
          {NOTE_COLORS.map(c => (
            <div key={c.name} onClick={() => setColor(c.name)} style={{
              width:22, height:22, borderRadius:"50%", background:c.bg, cursor:"pointer",
              border: color===c.name ? "2.5px solid #fff" : "2.5px solid transparent",
              boxShadow: color===c.name ? "0 0 10px rgba(255,255,255,.35)" : "none",
              transition:"all .15s", flexShrink:0,
            }} />
          ))}
          <div onClick={() => setLocked(l=>!l)} style={{
            marginLeft:"auto", padding:"6px 14px",
            background: locked ? "rgba(130,50,255,.25)" : "rgba(255,255,255,.07)",
            borderRadius:10, cursor:"pointer",
            color: locked ? "#c084fc" : "rgba(200,170,255,.6)",
            fontSize:13, border:"1px solid rgba(160,100,255,.25)", userSelect:"none",
          }}>{locked ? "🔒 Locked" : "🔓 Lock note"}</div>
        </div>
 
        <div style={{ marginTop:18 }}>
          <GlowButton fullWidth onClick={() => title.trim() && onSave({ title:title.trim(), content, color, is_locked:locked })} disabled={saving || !title.trim()}>
            {saving ? <><Spinner /> &nbsp;Saving…</> : "Save Note"}
          </GlowButton>
        </div>
      </div>
    </div>
  );
}

// ─── DRAWING EDITOR ───────────────────────────────────────────────────────────
function DrawingEditor({ note, onSave, onClose, saving }) {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool,  setTool]  = useState("pen");
  const [color, setColor] = useState("#c084fc");
  const [size,  setSize]  = useState(4);
  const [title, setTitle] = useState(note?.title ?? "My Doodle");
  const [noteColor, setNoteColor] = useState(note?.color ?? "purple");
  const lastPos    = React.useRef(null);
  const historyRef = React.useRef([]);
  const redoRef    = React.useRef([]);
 
  const TOOLS = [
    { id:"pen",    label:"✏️", name:"Pen",         size:3,  opacity:1,    tip:"round"  },
    { id:"marker", label:"🖊️", name:"Marker",      size:10, opacity:0.6,  tip:"square" },
    { id:"brush",  label:"🖌️", name:"Brush",       size:14, opacity:0.35, tip:"round"  },
    { id:"callig", label:"✒️", name:"Calligraphy", size:8,  opacity:0.9,  tip:"callig" },
    { id:"eraser", label:"🧹", name:"Eraser",      size:20, opacity:1,    tip:"round"  },
  ];
 
  const PALETTE = [
    "#c084fc","#f472b6","#fb923c","#facc15",
    "#4ade80","#34d399","#38bdf8","#818cf8",
    "#f87171","#ffffff","#e2e8f0","#94a3b8",
    "#1e1b4b","#312e81","#000000","#7c3aed",
  ];
 
  const SIZES = [2, 4, 8, 14, 22];
 
  const NOTE_COLOR_MAP = {
    purple:"#9333ea", amber:"#f59e0b", emerald:"#10b981",
    blue:"#3b82f6",   rose:"#f43f5e",  cyan:"#06b6d4",
  };
 
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0f0a24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (note?.content && note.content.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = note.content;
    }
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, []);
 
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top)  * scaleY,
    };
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };
 
  const getCurrentSize = () => {
    const t = TOOLS.find(t2 => t2.id === tool);
    return (t ? t.size : 4) * (size / 4);
  };
 
  const applyToolStyle = (ctx) => {
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle   = "rgba(0,0,0,1)";
      ctx.lineWidth   = getCurrentSize();
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.globalAlpha = 1;
    } else {
      const t = TOOLS.find(t2 => t2.id === tool);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      ctx.globalAlpha = t?.opacity ?? 1;
      ctx.lineWidth   = getCurrentSize();
      if (tool === "callig") {
        ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      } else if (tool === "marker") {
        ctx.lineCap = "square"; ctx.lineJoin = "miter";
      } else {
        ctx.lineCap = "round"; ctx.lineJoin = "round";
      }
    }
  };
 
  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 60) historyRef.current.shift();
    redoRef.current = [];
    setIsDrawing(true);
    lastPos.current = getPos(e);
    const pos = getPos(e);
    ctx.save(); applyToolStyle(ctx);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, getCurrentSize() / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
 
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e);
    ctx.save(); applyToolStyle(ctx);
    ctx.beginPath();
    if (tool === "brush") {
      for (let i = 0; i < 3; i++) {
        const sp = getCurrentSize() * 0.4;
        ctx.moveTo(lastPos.current.x+(Math.random()-.5)*sp, lastPos.current.y+(Math.random()-.5)*sp);
        ctx.lineTo(pos.x+(Math.random()-.5)*sp, pos.y+(Math.random()-.5)*sp);
      }
    } else if (tool === "callig") {
      const dx = pos.x - lastPos.current.x;
      const dy = pos.y - lastPos.current.y;
      ctx.lineWidth = getCurrentSize() * (Math.abs(Math.sin(Math.atan2(dy,dx))) * 0.8 + 0.3);
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
    } else {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke(); ctx.restore();
    lastPos.current = pos;
  };
 
  const stopDraw = () => setIsDrawing(false);
 
  const undo = () => {
    if (historyRef.current.length <= 1) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    redoRef.current.push(ctx.getImageData(0,0,canvas.width,canvas.height));
    historyRef.current.pop();
    ctx.putImageData(historyRef.current[historyRef.current.length-1], 0, 0);
  };
 
  const redo = () => {
    if (!redoRef.current.length) return;
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const state = redoRef.current.pop();
    historyRef.current.push(state);
    ctx.putImageData(state, 0, 0);
  };
 
  const clearCanvas = () => {
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    historyRef.current.push(ctx.getImageData(0,0,canvas.width,canvas.height));
    ctx.fillStyle = "#0f0a24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
 
  const handleSave = () => {
    const dataURL = canvasRef.current.toDataURL("image/png");
    onSave({ title:title.trim()||"My Doodle", content:dataURL, color:noteColor, is_locked:false, is_drawing:true });
  };
 
  const activeTool = TOOLS.find(t => t.id === tool);
 
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.82)",
      backdropFilter:"blur(10px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:200, padding:12,
    }}>
      <div style={{
        background:"rgba(12,4,40,.97)", backdropFilter:"blur(24px)",
        border:"1px solid rgba(160,100,255,.3)", borderRadius:24,
        width:"100%", maxWidth:820, maxHeight:"95vh",
        boxShadow:"0 20px 80px rgba(0,0,0,.7)", animation:"mScaleIn .25s ease",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
          <span style={{ fontSize:20 }}>🎨</span>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Doodle title…"
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e8d5ff", fontSize:16, fontWeight:700 }} />
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {Object.entries(NOTE_COLOR_MAP).map(([k,v]) => (
              <div key={k} onClick={() => setNoteColor(k)} style={{
                width:16, height:16, borderRadius:"50%", background:v, cursor:"pointer",
                border: noteColor===k ? "2px solid #fff" : "2px solid transparent", transition:"border .15s",
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", padding:"5px 12px", fontSize:14 }}>✕</button>
        </div>
 
        {/* Body */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:0 }}>
          {/* Left toolbar */}
          <div style={{ width:68, background:"rgba(255,255,255,.03)", borderRight:"1px solid rgba(255,255,255,.06)", display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0", gap:4, flexShrink:0, overflowY:"auto" }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.name} style={{
                width:52, borderRadius:12, border:"none", padding:"7px 4px",
                background: tool===t.id ? "rgba(130,50,255,.45)" : "rgba(255,255,255,.05)",
                boxShadow: tool===t.id ? "0 0 14px rgba(130,50,255,.5)" : "none",
                cursor:"pointer", fontSize:18, transition:"all .18s",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                outline: tool===t.id ? "1.5px solid rgba(160,100,255,.6)" : "none",
              }}>
                {t.label}
                <span style={{ fontSize:8.5, color:"rgba(200,170,255,.55)", marginTop:2, lineHeight:1 }}>{t.name}</span>
              </button>
            ))}
            <div style={{ width:36, height:1, background:"rgba(255,255,255,.08)", margin:"5px 0" }} />
            {SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)} title={`Size ${s}`} style={{
                width:52, height:34, borderRadius:10, border:"none",
                background: size===s ? "rgba(130,50,255,.35)" : "rgba(255,255,255,.04)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                outline: size===s ? "1.5px solid rgba(160,100,255,.5)" : "none", transition:"all .15s",
              }}>
                <div style={{ width:Math.min(s*1.4,32), height:Math.min(s*1.4,32), borderRadius:"50%", background:"rgba(192,132,252,.7)", flexShrink:0 }} />
              </button>
            ))}
            <div style={{ width:36, height:1, background:"rgba(255,255,255,.08)", margin:"5px 0" }} />
            {[{icon:"↩",label:"Undo",fn:undo},{icon:"↪",label:"Redo",fn:redo},{icon:"🗑",label:"Clear",fn:clearCanvas}].map(btn => (
              <button key={btn.label} onClick={btn.fn} title={btn.label} style={{
                width:52, height:38, borderRadius:10, border:"none",
                background:"rgba(255,255,255,.05)", cursor:"pointer",
                color:"rgba(200,170,255,.8)", fontSize:15,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                transition:"background .15s",
              }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(130,50,255,.25)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
              >
                {btn.icon}
                <span style={{ fontSize:8, marginTop:1, color:"rgba(200,170,255,.45)" }}>{btn.label}</span>
              </button>
            ))}
          </div>
 
          {/* Canvas area */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
            {/* Palette */}
            <div style={{ display:"flex", gap:6, padding:"8px 12px", flexWrap:"wrap", borderBottom:"1px solid rgba(255,255,255,.06)", alignItems:"center", background:"rgba(255,255,255,.02)", flexShrink:0 }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => { setColor(c); if(tool==="eraser") setTool("pen"); }} style={{
                  width:21, height:21, borderRadius:"50%", background:c, cursor:"pointer", flexShrink:0,
                  border: color===c && tool!=="eraser" ? "2.5px solid #fff" : "2.5px solid rgba(255,255,255,.15)",
                  boxShadow: color===c && tool!=="eraser" ? `0 0 9px ${c}99` : "none",
                  transform: color===c && tool!=="eraser" ? "scale(1.22)" : "scale(1)",
                  transition:"all .15s",
                }} />
              ))}
              <label title="Custom color" style={{ cursor:"pointer", flexShrink:0, position:"relative" }}>
                <div style={{ width:21, height:21, borderRadius:"50%", background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border:"2px solid rgba(255,255,255,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>＋</div>
                <input type="color" value={color} onChange={e=>{setColor(e.target.value);if(tool==="eraser")setTool("pen");}} style={{ opacity:0, position:"absolute", width:0, height:0, top:0, left:0 }} />
              </label>
              <div style={{ marginLeft:"auto", padding:"3px 10px", background:"rgba(130,50,255,.2)", borderRadius:20, color:"rgba(200,170,255,.7)", fontSize:11, border:"1px solid rgba(160,100,255,.25)", whiteSpace:"nowrap" }}>
                {activeTool?.label} {activeTool?.name} · {Math.round(getCurrentSize())}px
              </div>
            </div>
            {/* Canvas */}
            <div style={{ flex:1, overflow:"hidden", position:"relative", background:"#0f0a24", minHeight:0 }}>
              <canvas ref={canvasRef} width={900} height={520}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                style={{ display:"block", width:"100%", height:"100%", cursor:tool==="eraser"?"cell":"crosshair", touchAction:"none" }}
              />
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:"radial-gradient(circle,rgba(160,100,255,.07) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, padding:"11px 18px", borderTop:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"9px 20px", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, color:"rgba(200,170,255,.7)", cursor:"pointer", fontSize:14, fontWeight:500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:"9px 26px", background:saving?"rgba(100,60,180,.4)":"linear-gradient(135deg,#7b2fff,#9540f5)", border:"none", borderRadius:12, color:"#fff", cursor:saving?"wait":"pointer", fontSize:14, fontWeight:600, boxShadow:"0 0 18px rgba(130,50,255,.4)" }}>
            {saving ? "Saving…" : "💾 Save Doodle"}
          </button>
        </div>
      </div>
    </div>
  );
}
 


//--- EVENT CHIP

function EventChip({ event, onDelete, showDate }) {
  const [hov, setHov] = useState(false);
  const dateStr = new Date(event.date).toLocaleDateString("en-US",
    { month:"short", day:"numeric", year:"numeric" });

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:8, padding:"8px 10px 8px 12px",
        background: hov ? "rgba(160,80,255,.22)" : "rgba(130,50,255,.14)",
        borderRadius:10, borderLeft:"3px solid #9b4dff",
        marginBottom:8, transition:"background .18s",
      }}
    >
      <div style={{ minWidth:0 }}>
        <div style={{ color:"#e8d5ff", fontSize:13, fontWeight:500,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          <span style={{ marginRight:6, fontSize:12 }}>📅</span>{event.title}
        </div>
        {showDate && (
          <div style={{ color:"rgba(200,170,255,.45)", fontSize:11, marginTop:1 }}>{dateStr}</div>
        )}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete(event.id); }}
        title="Delete event"
        style={{
          flexShrink:0, width:22, height:22, borderRadius:"50%",
          background: hov ? "rgba(255,100,150,.25)" : "transparent",
          border: hov ? "1.5px solid rgba(255,120,160,.5)" : "1.5px solid transparent",
          color: hov ? "#ffb3c6" : "transparent",
          fontSize:11, fontWeight:700, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .18s",
          transform: hov ? "scale(1.15)" : "scale(0.85)",
        }}
      >✕</button>
    </div>
  );
}
 
// ─── MINI CALENDAR ────────────────────────────────────────────────────────────
function MiniCalendar({ events, onAddEvent, onDeleteEvent, addingEvent }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(null);
  const [newTitle, setNewTitle] = useState("");
 
  const yr = viewDate.getFullYear(), mo = viewDate.getMonth();
  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const startDay    = new Date(yr, mo, 1).getDay();
  const monthLabel  = viewDate.toLocaleDateString("en-US", { month:"long", year:"numeric" });
 
  const dayHasEvent = (d) => events.some(e => {
    const ed = new Date(e.date);
    return ed.getDate()===d && ed.getMonth()===mo && ed.getFullYear()===yr;
  });
 
  const submitEvent = () => {
    if (!newTitle.trim() || !selected) return;
    onAddEvent({ title:newTitle.trim(), date:new Date(yr, mo, selected).toISOString() });
    setNewTitle("");
  };
 
  return (
    <div style={{
      background:"rgba(28,8,65,.52)", backdropFilter:"blur(18px)",
      border:"1px solid rgba(160,100,255,.2)", borderRadius:20, padding:18,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <button onClick={() => setViewDate(new Date(yr, mo-1, 1))}
          style={{ background:"none", border:"none", color:"#c084fc", cursor:"pointer", fontSize:18, padding:"2px 8px" }}>‹</button>
        <span style={{ color:"#e8d5ff", fontWeight:600, fontSize:13 }}>{monthLabel}</span>
        <button onClick={() => setViewDate(new Date(yr, mo+1, 1))}
          style={{ background:"none", border:"none", color:"#c084fc", cursor:"pointer", fontSize:18, padding:"2px 8px" }}>›</button>
      </div>
 
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} style={{ color:"rgba(200,170,255,.45)", fontSize:11, fontWeight:600, padding:"3px 0", textAlign:"center" }}>{d}</div>
        ))}
      </div>
 
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {Array.from({ length:startDay }).map((_,i) => <div key={`b${i}`} />)}
        {Array.from({ length:daysInMonth }).map((_,i) => {
          const d = i+1;
          const isToday    = d===today.getDate() && mo===today.getMonth() && yr===today.getFullYear();
          const isSelected = selected===d;
          const hasDot     = dayHasEvent(d);
          return (
            <div key={d} onClick={() => setSelected(isSelected ? null : d)} style={{
              padding:"5px 2px", borderRadius:7, cursor:"pointer", textAlign:"center", fontSize:12,
              background: isToday ? "linear-gradient(135deg,#7b2fff,#9b4dff)" : isSelected ? "rgba(130,50,255,.32)" : "transparent",
              color: isToday ? "#fff" : "rgba(220,200,255,.8)",
              fontWeight: isToday ? 700 : 400, transition:"background .14s",
            }}>
              {d}
              {hasDot && <div style={{ width:4, height:4, background:"#c084fc", borderRadius:"50%", margin:"2px auto 0" }} />}
            </div>
          );
        })}
      </div>
 
      {selected && (
        <div style={{ marginTop:12, borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:12 }}>
          <div style={{ color:"rgba(200,170,255,.6)", fontSize:12, marginBottom:6 }}>
            Add event – {viewDate.toLocaleDateString("en-US",{month:"short"})} {selected}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Event title…"
              onKeyDown={e => e.key==="Enter" && submitEvent()}
              style={{
                flex:1, padding:"8px 12px", background:"rgba(255,255,255,.07)",
                border:"1px solid rgba(160,100,255,.25)", borderRadius:10,
                color:"#e8d5ff", fontSize:12, outline:"none",
              }}
            />
            <button onClick={submitEvent} disabled={addingEvent || !newTitle.trim()} style={{
              padding:"8px 14px", background:"linear-gradient(135deg,#7b2fff,#9b4dff)",
              border:"none", borderRadius:10, color:"#fff",
              cursor: addingEvent ? "wait" : "pointer", fontSize:15, fontWeight:700,
            }}>{addingEvent ? "…" : "+"}</button>
          </div>
          {events
            .filter(e => { const ed=new Date(e.date); return ed.getDate()===selected && ed.getMonth()===mo; })
            .map((ev,i) => (
              <EventChip key={ev.id ?? i} event={ev} onDelete={onDeleteEvent} />
            ))
          }
        </div>
      )}
    </div>
  );
}
 
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  // Defensive defaults — prevents blank screen if any field is undefined/null
  const safeName   = user?.name   || (user?.email ? user.email.split("@")[0] : "there");
  const safeGender = user?.gender || "neutral";
 
  const [notes,       setNotes]       = useState([]);   // start empty — filled from API
  const [events,      setEvents]      = useState([]);   // start empty — filled from API
  const [search,      setSearch]      = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError,  setFetchError]  = useState("");
  const [editorOpen,  setEditorOpen]  = useState(false);
  const [editNote,    setEditNote]    = useState(null);
  const [savingNote,  setSavingNote]  = useState(false);
  const [addingEvt,   setAddingEvt]   = useState(false);
  const [mobileSide,  setMobileSide]  = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
 
  // ── Fetch data on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true); setFetchError("");
      try {
        const [nd, ed] = await Promise.all([api.getNotes(), api.getEvents()]);
        if (!cancelled) {
          setNotes(Array.isArray(nd) ? nd : nd?.results ?? []);
          setEvents(Array.isArray(ed) ? ed : ed?.results ?? []);
        }
      } catch (e) {
        if (!cancelled) setFetchError(e.message || "Failed to load data. Please refresh.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
 
  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || "").toLowerCase().includes(search.toLowerCase())
  );
 
  const openCreate = () => { setEditNote(null); setEditorOpen(true); };
  const openDrawing  = (n = null) => { setEditNote(n); setDrawingOpen(true); };
  const closeDrawing = () => { setDrawingOpen(false); setEditNote(null); };
  const openEdit = (n) => {
    if (n?.content?.startsWith("data:image")) {
      setEditNote(n); setDrawingOpen(true);
    } else {
      setEditNote(n); setEditorOpen(true);
    }
  };
  const closeEditor= () => { setEditorOpen(false); setEditNote(null); };
 
  const saveNote = async (data) => {
    setSavingNote(true);
    try {
      if (editNote?.id) {
        const updated = await api.updateNote(editNote.id, data);
        setNotes(ns => ns.map(n => n.id===updated.id ? updated : n));
      } else {
        const created = await api.createNote(data);
        setNotes(ns => [created, ...ns]);
      }
      closeEditor();
    } catch (e) {
      alert(e.message || "Failed to save note.");
    } finally { setSavingNote(false); }
  };
 
  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.deleteNote(id);
      setNotes(ns => ns.filter(n => n.id!==id));
    } catch (e) {
      alert(e.message || "Failed to delete note.");
    }
  };
 
  const addEvent = async ({ title, date }) => {
    setAddingEvt(true);
    try {
      const ev = await api.createEvent({ title, date });
      setEvents(es => [...es, ev]);
    } catch (e) {
      alert(e.message || "Failed to add event.");
    } finally { setAddingEvt(false); }
  };

  const deleteEvent = async (id) => {
  try {
    await api.deleteEvent(id);
    setEvents(es => es.filter(e => e.id !== id));
  } catch (e) {
    alert(e.message || "Failed to delete event.");
  }
};
 
  const handleLogout = () => {
    localStorage.removeItem("memora_access");
    localStorage.removeItem("memora_refresh");
    localStorage.removeItem("memora_user");
    onLogout();
  };
 
  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* ── Top bar ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"13px 20px", background:"rgba(16,3,42,.68)", backdropFilter:"blur(22px)",
        borderBottom:"1px solid rgba(160,100,255,.15)", position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>💜</span>
          <span style={{ color:"#fff", fontWeight:700, fontSize:18 }}>Memora</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setMobileSide(o=>!o)}
            aria-label="Toggle sidebar"
            style={{
              background:"none", border:"none", color:"rgba(200,170,255,.6)",
              cursor:"pointer", fontSize:22, padding:0,
              display:"none", // shown via media query below
            }}
            className="m-sidebar-toggle"
          >☰</button>
          <span
            onClick={() => alert("No notifications yet")}
            style={{ color:"rgba(200,170,255,.55)", cursor:"pointer", fontSize:19 }}
            title="Notifications"
          >
           🔔
         </span>
          <div onClick={handleLogout} style={{ cursor:"pointer" }} title="Click to sign out">
            <Avatar gender={safeGender} size={36} />
          </div>
        </div>
      </div>
 
      {/* ── Body ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", position:"relative" }}>
 
        {/* ── Notes column ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"22px 20px", minWidth:0 }}>
          {/* Greeting */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, flexWrap:"wrap" }}>
            <Avatar gender={safeGender} size={50} />
            <div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>Hi, {safeName} 👋</div>
              <div style={{ color:"rgba(200,170,255,.55)", fontSize:13 }}>Welcome to Memora</div>
            </div>
          </div>
 
          {/* Search bar */}
          <div style={{ marginBottom:22 }}>
            <GlassInput placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)} icon="🔍" />
          </div>
 
          {/* Loading state */}
          {loadingData && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"70px 0", gap:12 }}>
              <Spinner size={22} />
              <span style={{ color:"rgba(200,170,255,.5)", fontSize:14 }}>Loading your notes…</span>
            </div>
          )}
 
          {/* Error state */}
          {!loadingData && fetchError && (
            <div style={{ padding:"40px 20px" }}>
              <ErrorBanner msg={fetchError} />
              <div style={{ textAlign:"center", marginTop:14 }}>
                <GlowButton small onClick={() => window.location.reload()}>Retry</GlowButton>
              </div>
            </div>
          )}
 
          {/* Empty state */}
          {!loadingData && !fetchError && filtered.length===0 && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(200,170,255,.4)" }}>
              <div style={{ fontSize:44, marginBottom:14 }}>📝</div>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:6, color:"rgba(200,170,255,.7)" }}>
                {search ? "No notes match your search" : "No notes yet"}
              </div>
              <div style={{ fontSize:13, marginBottom:24 }}>
                {search ? "Try a different keyword" : "Create your first note with the + button!"}
              </div>
              {!search && <GlowButton onClick={openCreate}>+ New Note</GlowButton>}
            </div>
          )}
 
          {/* Notes grid */}
          {!loadingData && !fetchError && filtered.length>0 && (
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
              gap:16,
            }}>
              {filtered.map(note => (
                <NoteCard key={note.id} note={note} onClick={openEdit} onDelete={deleteNote} />
              ))}
            </div>
          )}
        </div>
 
        {/* ── Right sidebar ── */}
        <div
          className="m-sidebar"
          style={{
            width:290, minWidth:290, padding:"22px 14px",
            overflowY:"auto", borderLeft:"1px solid rgba(160,100,255,.12)",
            background:"rgba(10,2,28,.4)", display:"flex", flexDirection:"column", gap:18,
          }}
        >
          <MiniCalendar events={events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} addingEvent={addingEvt} />
        
 
          <div style={{
            background:"rgba(28,8,65,.4)", backdropFilter:"blur(14px)",
            border:"1px solid rgba(160,100,255,.15)", borderRadius:20, padding:16,
          }}>
            <div style={{ color:"#e8d5ff", fontWeight:600, fontSize:14, marginBottom:12 }}>📅 Upcoming Events</div>
            {events.length===0 ? (
              <div style={{ color:"rgba(200,170,255,.4)", fontSize:13 }}>
                No events yet. Click a date on the calendar to add one.
              </div>
            ) : (
              events.slice(0,6).map((ev,i) => (
                <EventChip key={ev.id ?? i} event={ev} onDelete={deleteEvent} showDate />
              ))
            )}
            </div>
        </div>
      </div>

    {/* ── FABs ── */}
    <div style={{
       position:"fixed", bottom:26, right:310, zIndex:150,
       display:"flex", flexDirection:"row-reverse", gap:12, alignItems:"center",
    }}>

      {/* Doodle button */}

      <button
        onClick={() => openDrawing()}
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
        style={{
         width:48, height:48, borderRadius:"50%",
         background:"linear-gradient(135deg,#be185d,#9333ea)", border:"none",
         color:"#fff", fontSize:20, cursor:"pointer",
         boxShadow:"0 4px 18px rgba(190,24,93,.55)",
         display:"flex", alignItems:"center", justifyContent:"center",
         transition:"transform .2s",
        }}
        title="New doodle"
      >🎨</button>

      {/* Note button */}

      <button
        onClick={openCreate}
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
        style={{
          width:56, height:56, borderRadius:"50%",
          background:"linear-gradient(135deg,#7b2fff,#9b4dff)", border:"none",
          color:"#fff", fontSize:26, cursor:"pointer",
          boxShadow:"0 4px 20px rgba(130,50,255,.65),0 0 38px rgba(130,50,255,.28)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"transform .2s,box-shadow .2s",
        }}
        title="New note"
      >+</button>
    </div>
      
 
      {/* ── Note editor modal ── */}
      {editorOpen && (
        <NoteEditor note={editNote} onSave={saveNote} onClose={closeEditor} saving={savingNote} />
      )}

      {/* ── Drawing editor modal ── */}
      {drawingOpen && (
        <DrawingEditor note={editNote} onSave={saveNote} onClose={closeDrawing} saving={savingNote} />
      )}
 
      {/* ── Mobile sidebar overlay ── */}
      {mobileSide && (
        <div onClick={() => setMobileSide(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:89 }} />
      )}
 
      <style>{`
        @media (max-width: 768px) {
          .m-sidebar {
            position: fixed !important;
            top: 0; right: 0; bottom: 0;
            z-index: 90;
            transform: ${mobileSide ? "translateX(0)" : "translateX(100%)"};
            transition: transform .28s ease;
            box-shadow: -8px 0 40px rgba(0,0,0,.55);
          }
          .m-sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
 
// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
 
  // Restore session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("memora_user");
      const token  = localStorage.getItem("memora_access");
      if (stored && token) {
        const u = JSON.parse(stored);
        if (u && (u.name || u.email)) {
          setUser(u);
          setPage("dashboard");
        }
      }
    } catch {
      // bad JSON in storage — ignore
    }
  }, []);
 
  // Single safe setter used by both login and register
  const setAuthUser = (rawUser) => {
    const safe = {
      id:     rawUser?.id     ?? null,
      name:   rawUser?.name   ?? (rawUser?.email ? rawUser.email.split("@")[0] : "User"),
      email:  rawUser?.email  ?? "",
      gender: rawUser?.gender ?? "neutral",
    };
    setUser(safe);
    setPage("dashboard");
  };
 
  const handleLogout = () => {
    setUser(null);
    setPage("login");
  };
 
  return (
    <div style={{ minHeight:"100vh", position:"relative" }}>
      <CosmicBg />
      {page === "login"    && <LoginPage    onLogin={setAuthUser}    onGoRegister={() => setPage("register")} />}
      {page === "register" && <RegisterPage onRegister={setAuthUser} onGoLogin={()    => setPage("login")} />}
      {page === "dashboard" && user && <Dashboard user={user} onLogout={handleLogout} />}
    </div>
  );
}
 
