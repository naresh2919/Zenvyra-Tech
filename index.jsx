import { useEffect, useRef, useState } from 'react';

// ---------- security helpers (inlined so this is a single self-contained file) ----------
const WHATSAPP_NUMBER = '916379376791';
const MAX_SHORT = 120;
const MAX_LONG = 600;

function sanitizeText(input, maxLen = MAX_SHORT) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
function sanitizeLong(input) {
  return sanitizeText(input, MAX_LONG);
}
function validatePhone(input) {
  const digits = (input || '').replace(/[^\d]/g, '');
  return { valid: digits.length >= 10 && digits.length <= 15, digits };
}
function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function buildWhatsAppUrl(number, message) {
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const parsed = new URL(url);
  if (parsed.hostname !== 'wa.me' || parsed.protocol !== 'https:') {
    throw new Error('Blocked an unexpected outbound URL');
  }
  return url;
}
function looksLikeBot({ honeypot, openedAt }) {
  if (honeypot && honeypot.trim().length > 0) return true;
  if (openedAt && Date.now() - openedAt < 1200) return true;
  return false;
}
const lastSubmitAt = { student: 0, client: 0 };
const SUBMIT_COOLDOWN_MS = 4000;

// ---------- data ----------
const DEPARTMENTS = ['CSE', 'IT', 'CSD', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BCA/MCA', 'Other'];
const PROJECT_TYPES = ['Mini project', 'Final year project'];
const CLIENT_TYPES = [
  { value: 'Landing page / website', label: 'Website' },
  { value: 'Full-stack app', label: 'Full-stack app' },
  { value: 'Internal tool', label: 'Internal tool' },
  { value: 'MVP / startup build', label: 'MVP / startup' },
  { value: 'Other', label: 'Other' },
];
const BUDGETS = ['Under ₹10,000', '₹10,000–₹25,000', '₹25,000+', 'Not sure yet'];

// ---------- shared bits ----------
function ChipPicker({ options, value, onChange, green }) {
  return (
    <div className={`chip-picker${green ? ' green' : ''}`}>
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <button type="button" key={val} className={`chip${value === val ? ' active' : ''}`} onClick={() => onChange(val)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function useOpenTimestamp(isOpen) {
  const openedAt = useRef(null);
  useEffect(() => {
    if (isOpen) openedAt.current = Date.now();
  }, [isOpen]);
  return openedAt;
}

function StudentModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [dept, setDept] = useState('');
  const [deptOther, setDeptOther] = useState('');
  const [ptype, setPtype] = useState('');
  const [topic, setTopic] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const openedAt = useOpenTimestamp(isOpen);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (looksLikeBot({ honeypot, openedAt: openedAt.current })) { onClose(); return; }
    if (Date.now() - lastSubmitAt.student < SUBMIT_COOLDOWN_MS) {
      setError('Please wait a moment before sending another request.');
      return;
    }
    const cleanName = sanitizeText(name);
    const cleanCollege = sanitizeText(college);
    const cleanDept = dept === 'Other' ? sanitizeText(deptOther) : dept;
    const cleanTopic = sanitizeLong(topic);
    const { valid, digits } = validatePhone(phone);

    if (!isNonEmpty(cleanName) || !isNonEmpty(cleanCollege)) { setError('Please fill in your name and college.'); return; }
    if (!isNonEmpty(cleanDept)) { setError('Please select your department.'); return; }
    if (!isNonEmpty(ptype)) { setError('Please select a project type.'); return; }
    if (!valid) { setError('Please enter a valid WhatsApp number (10+ digits).'); return; }

    const lines = [
      "Hi Zenvyra, I'd like to get a student project started.",
      `Name: ${cleanName}`,
      `College: ${cleanCollege}`,
      `Department: ${cleanDept}`,
      `Project type: ${ptype}`,
    ];
    if (cleanTopic) lines.push(`Topic: ${cleanTopic}`);
    lines.push(`My WhatsApp: ${digits}`);

    try {
      setSending(true);
      const url = buildWhatsAppUrl(WHATSAPP_NUMBER, lines.join('\n'));
      lastSubmitAt.student = Date.now();
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch {
      setError('Something went wrong building that link. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-icon">🎓</div>
        <span className="modal-eyebrow">STUDENT PROJECT</span>
        <h3>Tell us about your project</h3>
        <p className="sub">Fill this in and we'll open WhatsApp with your details ready to send.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="s-website">Leave this field blank</label>
            <input id="s-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-name">Full name</label>
            <input id="s-name" type="text" maxLength={120} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="s-college">College / institution</label>
            <input id="s-college" type="text" maxLength={160} placeholder="e.g. Sethu Institute of Technology" value={college} onChange={(e) => setCollege(e.target.value)} required />
          </div>
          <div className="field">
            <label>Department</label>
            <ChipPicker options={DEPARTMENTS} value={dept} onChange={setDept} />
            {dept === 'Other' && (
              <div className="chip-other-wrap show">
                <input type="text" maxLength={80} placeholder="Type your department" value={deptOther} onChange={(e) => setDeptOther(e.target.value)} />
              </div>
            )}
          </div>
          <div className="field">
            <label>Project type</label>
            <ChipPicker options={PROJECT_TYPES} value={ptype} onChange={setPtype} />
          </div>
          <div className="field">
            <label htmlFor="s-topic">Project topic / idea</label>
            <textarea id="s-topic" maxLength={600} placeholder="What's the project about? Leave blank if you need topic suggestions." value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-phone">Your WhatsApp number</label>
            <input id="s-phone" type="tel" maxLength={16} placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="btn btn-wa modal-submit" type="submit" disabled={sending}>
            {sending ? 'Opening WhatsApp…' : 'Send details on WhatsApp →'}
          </button>
          <p className="modal-note">Opens WhatsApp with your details filled in — just hit send.</p>
        </form>
      </div>
    </div>
  );
}

function ClientModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [ctype, setCtype] = useState('');
  const [ctypeOther, setCtypeOther] = useState('');
  const [budget, setBudget] = useState('');
  const [brief, setBrief] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const openedAt = useOpenTimestamp(isOpen);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (looksLikeBot({ honeypot, openedAt: openedAt.current })) { onClose(); return; }
    if (Date.now() - lastSubmitAt.client < SUBMIT_COOLDOWN_MS) {
      setError('Please wait a moment before sending another request.');
      return;
    }
    const cleanName = sanitizeText(name);
    const cleanCompany = sanitizeText(company);
    const cleanCtype = ctype === 'Other' ? sanitizeText(ctypeOther) : ctype;
    const cleanBrief = sanitizeLong(brief);
    const { valid, digits } = validatePhone(phone);

    if (!isNonEmpty(cleanName) || !isNonEmpty(cleanCompany)) { setError('Please fill in your name and business/company.'); return; }
    if (!isNonEmpty(cleanCtype)) { setError('Please select what you need built.'); return; }
    if (!valid) { setError('Please enter a valid WhatsApp number (10+ digits).'); return; }

    const lines = [
      "Hi Zenvyra, I'd like to discuss a project.",
      `Name: ${cleanName}`,
      `Business/company: ${cleanCompany}`,
      `What I need: ${cleanCtype}`,
    ];
    if (budget) lines.push(`Budget range: ${budget}`);
    if (cleanBrief) lines.push(`Brief: ${cleanBrief}`);
    lines.push(`My WhatsApp: ${digits}`);

    try {
      setSending(true);
      const url = buildWhatsAppUrl(WHATSAPP_NUMBER, lines.join('\n'));
      lastSubmitAt.client = Date.now();
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch {
      setError('Something went wrong building that link. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal client-theme">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-icon green">💼</div>
        <span className="modal-eyebrow green">BUSINESS / STARTUP</span>
        <h3>Tell us about your build</h3>
        <p className="sub">Fill this in and we'll open WhatsApp with your brief ready to send.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="c-website">Leave this field blank</label>
            <input id="c-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-name">Full name</label>
            <input id="c-name" type="text" maxLength={120} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="c-company">Business / company name</label>
            <input id="c-company" type="text" maxLength={160} placeholder="e.g. Choco Cube" value={company} onChange={(e) => setCompany(e.target.value)} required />
          </div>
          <div className="field">
            <label>What do you need built?</label>
            <ChipPicker options={CLIENT_TYPES} value={ctype} onChange={setCtype} green />
            {ctype === 'Other' && (
              <div className="chip-other-wrap show">
                <input type="text" maxLength={120} placeholder="Tell us what you need built" value={ctypeOther} onChange={(e) => setCtypeOther(e.target.value)} />
              </div>
            )}
          </div>
          <div className="field">
            <label>Budget range <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <ChipPicker options={BUDGETS} value={budget} onChange={setBudget} green />
          </div>
          <div className="field">
            <label htmlFor="c-brief">Brief requirements</label>
            <textarea id="c-brief" maxLength={600} placeholder="What should it do? Any deadline in mind?" value={brief} onChange={(e) => setBrief(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-phone">Your WhatsApp number</label>
            <input id="c-phone" type="tel" maxLength={16} placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="btn btn-wa modal-submit" type="submit" disabled={sending}>
            {sending ? 'Opening WhatsApp…' : 'Send brief on WhatsApp →'}
          </button>
          <p className="modal-note">Opens WhatsApp with your brief filled in — just hit send.</p>
        </form>
      </div>
    </div>
  );
}

const styles = `
.zv-root{
  --bg:#F3F4F7; --panel:#FFFFFF; --line:#E2E4EA; --ink:#14171F; --muted:#666E7D;
  --accent:#2F5CED; --accent-ink:#EDF1FF; --good:#16A34A; --wa:#25D366; --wa-dark:#1DA851; --radius:12px;
  background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif; font-size:16px; line-height:1.55;
}
.zv-root *{box-sizing:border-box;}
.zv-root h1,.zv-root h2,.zv-root h3{font-family:'Sora',sans-serif; margin:0; letter-spacing:-0.02em;}
.zv-root .mono{font-family:'IBM Plex Mono',monospace;}
.zv-root a{color:inherit; text-decoration:none;}
.zv-root .wrap{max-width:1160px; margin:0 auto; padding:0 28px;}
.zv-root header{position:sticky; top:0; z-index:50; background:rgba(243,244,247,0.9); backdrop-filter:blur(10px); border-bottom:1px solid var(--line);}
.zv-root .nav{display:flex; align-items:center; justify-content:space-between; padding:18px 28px; max-width:1160px; margin:0 auto;}
.zv-root .brand{display:flex; align-items:center; gap:10px; font-family:'Sora'; font-weight:700; font-size:1.05rem;}
.zv-root .brand .mark{width:26px; height:26px; border-radius:7px; background:linear-gradient(135deg, var(--ink) 40%, var(--accent) 140%); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800;}
.zv-root .navlinks{display:flex; gap:30px; font-size:0.9rem; color:var(--muted);}
.zv-root .navlinks a:hover{color:var(--ink);}
.zv-root .navcta{display:flex; gap:10px;}
.zv-root .btn{font-family:'Inter'; font-weight:600; font-size:0.88rem; padding:11px 20px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:transform .15s ease, box-shadow .15s ease, background .15s ease; border:none;}
.zv-root .btn-primary{background:var(--accent); color:#fff;}
.zv-root .btn-primary:hover{transform:translateY(-2px); box-shadow:0 10px 24px rgba(47,92,237,0.28);}
.zv-root .btn-ghost{border:1px solid var(--line); color:var(--ink); background:#fff;}
.zv-root .btn-ghost:hover{border-color:#c7cbd6; transform:translateY(-2px);}
.zv-root .btn-wa{background:var(--wa); color:#fff;}
.zv-root .btn-wa:hover{background:var(--wa-dark); transform:translateY(-2px); box-shadow:0 10px 24px rgba(37,211,102,0.3);}
@media (max-width:760px){ .zv-root .navlinks{display:none;} }
.zv-root .hero{padding:96px 0 70px; position:relative; overflow:hidden;}
.zv-root .hero-glow{position:absolute; z-index:0; border-radius:50%; filter:blur(70px); opacity:0.55; pointer-events:none;}
.zv-root .hero-glow.g1{width:420px; height:420px; top:-160px; right:-120px; background:radial-gradient(circle at 30% 30%, #2F5CED, transparent 70%);}
.zv-root .hero-glow.g2{width:300px; height:300px; bottom:-140px; left:-80px; background:radial-gradient(circle at 30% 30%, #25D366, transparent 70%); opacity:0.18;}
.zv-root .hero-grid{position:absolute; inset:0; z-index:0; background-image:linear-gradient(to right, rgba(20,23,31,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,31,0.04) 1px, transparent 1px); background-size:44px 44px; mask-image:radial-gradient(ellipse 900px 420px at 30% 20%, #000 40%, transparent 85%);}
.zv-root .hero .wrap{position:relative; z-index:1;}
.zv-root .eyebrow{display:inline-flex; align-items:center; gap:8px; font-family:'IBM Plex Mono'; font-size:0.76rem; color:var(--accent); background:var(--accent-ink); padding:7px 14px; border-radius:999px; margin-bottom:26px;}
.zv-root .eyebrow .pulse{width:7px; height:7px; border-radius:50%; background:var(--good); animation:zvpulse 1.8s infinite;}
@keyframes zvpulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,0.5);} 70%{box-shadow:0 0 0 7px rgba(22,163,74,0);} 100%{box-shadow:0 0 0 0 rgba(22,163,74,0);}}
.zv-root .hero h1{font-size:clamp(2rem,5.6vw,3.6rem); font-weight:800; max-width:760px; line-height:1.05;}
.zv-root .hero h1 .u{background:linear-gradient(100deg, var(--accent) 10%, #6D8CFF 55%, var(--accent) 100%); -webkit-background-clip:text; background-clip:text; color:transparent;}
.zv-root .hero p.lede{max-width:540px; margin-top:24px; color:var(--muted); font-size:1.05rem;}
.zv-root .hero-actions{display:flex; gap:14px; margin-top:36px; flex-wrap:wrap;}
.zv-root .hero-strip{display:flex; gap:26px; margin-top:54px; flex-wrap:wrap;}
.zv-root .strip-item{display:flex; align-items:center; gap:10px; font-size:0.86rem; color:var(--muted);}
.zv-root .strip-item .ic{width:8px;height:8px;border-radius:50%;background:var(--accent);}
.zv-root section{padding:60px 0;}
.zv-root .sec-head{margin-bottom:40px; max-width:600px;}
.zv-root .kicker{font-family:'IBM Plex Mono'; font-size:0.76rem; color:var(--muted); letter-spacing:0.06em; margin-bottom:12px;}
.zv-root .sec-head h2{font-size:clamp(1.5rem,3.2vw,2.1rem);}
.zv-root .sec-head p{color:var(--muted); margin-top:14px;}
.zv-root .audience-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:18px;}
.zv-root .aud-card{position:relative; background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:26px; transition:transform .18s ease, box-shadow .18s ease; overflow:hidden;}
.zv-root .aud-card::before{content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, var(--accent), #6D8CFF); transform:scaleX(0); transform-origin:left; transition:transform .25s ease;}
.zv-root .aud-card:hover{transform:translateY(-4px); box-shadow:0 16px 32px rgba(20,23,31,0.06);}
.zv-root .aud-card:hover::before{transform:scaleX(1);}
.zv-root .aud-card .num{font-family:'IBM Plex Mono'; font-size:0.78rem; color:var(--accent);}
.zv-root .aud-card h3{font-size:1.15rem; margin-top:14px;}
.zv-root .aud-card p{color:var(--muted); font-size:0.9rem; margin-top:10px;}
.zv-root .branch-chips{display:flex; flex-wrap:wrap; gap:6px; margin-top:14px;}
.zv-root .branch-chips .chip{font-family:'IBM Plex Mono'; font-size:0.68rem; color:var(--accent); background:var(--accent-ink); padding:4px 9px; border-radius:6px; border:none;}
@media (max-width:900px){ .zv-root .audience-grid{grid-template-columns:1fr;} }
.zv-root .board{display:grid; grid-template-columns:repeat(3,1fr); gap:18px;}
.zv-root .col{background:#EAECF1; border-radius:var(--radius); padding:16px;}
.zv-root .col-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; padding:0 4px;}
.zv-root .col-head .lbl{font-family:'IBM Plex Mono'; font-size:0.78rem; color:var(--muted); letter-spacing:0.04em;}
.zv-root .col-head .count{font-family:'IBM Plex Mono'; font-size:0.72rem; color:var(--muted); background:#fff; border-radius:999px; padding:2px 8px; border:1px solid var(--line);}
.zv-root .ticket{background:var(--panel); border:1px solid var(--line); border-radius:9px; padding:16px; margin-bottom:12px; transition:transform .15s ease, box-shadow .15s ease;}
.zv-root .ticket:hover{transform:translateY(-2px); box-shadow:0 10px 22px rgba(20,23,31,0.07);}
.zv-root .ticket .id{font-family:'IBM Plex Mono'; font-size:0.7rem; color:var(--muted); margin-bottom:8px;}
.zv-root .ticket h4{font-size:0.96rem; font-weight:600; margin:0 0 6px;}
.zv-root .ticket p{font-size:0.82rem; color:var(--muted); margin:0;}
.zv-root .ticket .tags{display:flex; gap:6px; margin-top:12px; flex-wrap:wrap;}
.zv-root .ticket .tag{font-family:'IBM Plex Mono'; font-size:0.66rem; background:var(--accent-ink); color:var(--accent); padding:3px 8px; border-radius:5px;}
.zv-root .ticket.done{border-color:#c9ecd6;}
.zv-root .ticket.done .id::before{content:'✓ '; color:var(--good);}
@media (max-width:900px){ .zv-root .board{grid-template-columns:1fr;} }
.zv-root .price-wrap{background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); overflow:hidden; display:grid; grid-template-columns:1fr 1fr;}
.zv-root .price-side{padding:32px;}
.zv-root .price-side:first-child{border-right:1px solid var(--line);}
.zv-root .price-side .tag{font-family:'IBM Plex Mono'; font-size:0.72rem; color:var(--muted);}
.zv-root .price-side h3{font-size:1.25rem; margin-top:12px;}
.zv-root .price-row{display:flex; justify-content:space-between; align-items:baseline; padding:14px 0; border-bottom:1px solid var(--line);}
.zv-root .price-row:last-child{border-bottom:none;}
.zv-root .price-row .lbl{font-size:0.92rem;}
.zv-root .price-row .sub{display:block; font-size:0.76rem; color:var(--muted); margin-top:2px;}
.zv-root .price-row .amt{font-family:'IBM Plex Mono'; font-weight:600; color:var(--accent);}
.zv-root .badge-discount{display:inline-flex; align-items:center; gap:8px; background:var(--accent-ink); color:var(--accent); font-family:'IBM Plex Mono'; font-size:0.76rem; padding:8px 14px; border-radius:999px; margin-top:20px;}
@media (max-width:800px){ .zv-root .price-wrap{grid-template-columns:1fr;} .zv-root .price-side:first-child{border-right:none; border-bottom:1px solid var(--line);} }
.zv-root .contact-panel{position:relative; background:var(--ink); color:#fff; border-radius:20px; padding:44px; display:grid; grid-template-columns:1.1fr 1fr; gap:40px; align-items:center; isolation:isolate;}
.zv-root .contact-panel::before{content:''; position:absolute; z-index:-1; inset:-2px; border-radius:22px; background:linear-gradient(120deg, var(--accent), var(--wa), var(--accent)); opacity:0.35; filter:blur(18px);}
.zv-root .contact-panel h2{color:#fff; font-size:clamp(1.5rem,3.4vw,2rem);}
.zv-root .contact-panel p{color:#A7ADBB; margin-top:16px; max-width:420px;}
.zv-root .contact-methods{display:flex; flex-direction:column; gap:14px;}
.zv-root .cmethod{display:flex; align-items:center; gap:14px; background:#1E222D; border:1px solid #2A2F3C; border-radius:12px; padding:16px 18px; transition:transform .15s ease, border-color .15s ease;}
.zv-root .cmethod:hover{transform:translateX(4px); border-color:#3A4152;}
.zv-root .cmethod .ic{width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:none;}
.zv-root .cmethod .ic.wa{background:rgba(37,211,102,0.15); color:var(--wa);}
.zv-root .cmethod .ic.ph{background:rgba(47,92,237,0.18); color:#7D9BFF;}
.zv-root .cmethod .ic.em{background:rgba(255,255,255,0.08); color:#DCE0EA;}
.zv-root .cmethod .meta .lbl{font-family:'IBM Plex Mono'; font-size:0.7rem; color:#8890A6; letter-spacing:0.05em;}
.zv-root .cmethod .meta .val{font-size:0.96rem; font-weight:600; margin-top:2px;}
@media (max-width:840px){ .zv-root .contact-panel{grid-template-columns:1fr; padding:30px;} }
.zv-root footer{padding:30px 0 40px;}
.zv-root .bottom-bar{display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; color:var(--muted); flex-wrap:wrap; gap:12px;}
.zv-root .modal-overlay{position:fixed; inset:0; background:rgba(14,16,22,0.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:200; padding:20px;}
.zv-root .modal{background:var(--panel); border-radius:16px; width:100%; max-width:440px; max-height:88vh; overflow-y:auto; padding:28px; position:relative; box-shadow:0 30px 60px rgba(14,16,22,0.35);}
.zv-root .modal-close{position:absolute; top:16px; right:16px; width:32px; height:32px; border-radius:8px; border:1px solid var(--line); background:#fff; cursor:pointer; font-size:1rem; color:var(--muted); display:flex; align-items:center; justify-content:center;}
.zv-root .modal-close:hover{background:var(--bg); color:var(--ink);}
.zv-root .modal h3{font-size:1.25rem; margin-top:14px;}
.zv-root .modal .sub{color:var(--muted); font-size:0.86rem; margin-top:6px;}
.zv-root .field{margin-top:14px;}
.zv-root .field label{display:block; font-size:0.8rem; font-weight:600; margin-bottom:6px; color:var(--ink);}
.zv-root .field input,.zv-root .field textarea{width:100%; font-family:'Inter'; font-size:0.9rem; padding:10px 12px; border:1px solid var(--line); border-radius:9px; background:#fff; color:var(--ink); outline:none; transition:border-color .15s ease, box-shadow .15s ease;}
.zv-root .field input:focus,.zv-root .field textarea:focus{border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-ink);}
.zv-root .field textarea{resize:vertical; min-height:64px;}
.zv-root .field-error{color:#D14343; font-size:0.76rem; margin-top:6px;}
.zv-root .modal-icon{width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; background:var(--accent-ink); margin-bottom:12px;}
.zv-root .modal-icon.green{background:rgba(37,211,102,0.14);}
.zv-root .modal-eyebrow{font-family:'IBM Plex Mono'; font-size:0.72rem; color:var(--accent); background:var(--accent-ink); display:inline-block; padding:5px 12px; border-radius:999px;}
.zv-root .modal-eyebrow.green{color:var(--wa-dark); background:rgba(37,211,102,0.14);}
.zv-root .modal.client-theme .field input:focus,.zv-root .modal.client-theme .field textarea:focus{border-color:var(--wa); box-shadow:0 0 0 3px rgba(37,211,102,0.14);}
.zv-root .chip-picker{display:flex; flex-wrap:wrap; gap:8px; margin-top:2px;}
.zv-root .chip{font-family:'IBM Plex Mono'; font-size:0.76rem; color:var(--muted); background:#fff; border:1px solid var(--line); border-radius:8px; padding:7px 12px; cursor:pointer; transition:all .15s ease;}
.zv-root .chip:hover{border-color:#c7cbd6; color:var(--ink);}
.zv-root .chip.active{background:var(--accent); border-color:var(--accent); color:#fff;}
.zv-root .chip-picker.green .chip.active{background:var(--wa); border-color:var(--wa); color:#fff;}
.zv-root .chip-other-wrap{margin-top:10px;}
.zv-root .modal-submit{width:100%; justify-content:center; margin-top:20px; padding:12px; font-size:0.92rem;}
.zv-root .modal-submit:disabled{opacity:0.6; cursor:not-allowed;}
.zv-root .modal-note{font-size:0.74rem; color:var(--muted); text-align:center; margin-top:12px;}
.zv-root .honeypot{position:absolute; left:-9999px; width:1px; height:1px; opacity:0; pointer-events:none;}
@media (max-width:520px){ .zv-root .audience-grid, .zv-root .board{grid-template-columns:1fr;} }
`;

export default function ZenvyraSite() {
  const [studentOpen, setStudentOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setStudentOpen(false); setClientOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const waHref = buildWhatsAppUrl(WHATSAPP_NUMBER, "Hi Zenvyra, I'd like to know more.");

  return (
    <div className="zv-root">
      <style>{styles}</style>
      <header>
        <div className="nav">
          <div className="brand"><span className="mark">Z</span> Zenvyra Technologys</div>
          <nav className="navlinks">
            <a href="#work">Who we build for</a>
            <a href="#board">Recent work</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="navcta">
            <button className="btn btn-ghost" type="button" onClick={() => setStudentOpen(true)}>Student form</button>
            <button className="btn btn-wa" type="button" onClick={() => setClientOpen(true)}>Client form</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-grid"></div>
        <div className="hero-glow g1"></div>
        <div className="hero-glow g2"></div>
        <div className="wrap">
          <div className="eyebrow"><span className="pulse"></span> OPEN FOR NEW PROJECTS</div>
          <h1>Student projects. Client builds. <span className="u">Same standard.</span></h1>
          <p className="lede">Zenvyra builds final year and mini projects for students, and full web/software builds for businesses and startups — planned properly, shipped on time, documented so you can actually explain it.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={waHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp →</a>
            <a className="btn btn-ghost" href="#pricing">See pricing</a>
          </div>
          <div className="hero-strip">
            <div className="strip-item"><span className="ic"></span> Fixed quote before we start</div>
            <div className="strip-item"><span className="ic"></span> Milestone check-ins, no last-day surprises</div>
            <div className="strip-item"><span className="ic"></span> Source + docs handed over, always</div>
          </div>
        </div>
      </section>

      <section id="work">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">01 / WHO WE BUILD FOR</div>
            <h2>Not just a college projects shop.</h2>
            <p>Zenvyra started with student projects — it now also takes on client work for businesses that need something built.</p>
          </div>
          <div className="audience-grid">
            <div className="aud-card">
              <div className="num">01</div>
              <h3>Students</h3>
              <p>Final year and mini projects, built, documented, and defended with you.</p>
              <div className="branch-chips">
                <span className="chip">CSE</span><span className="chip">IT</span><span className="chip">CSD</span><span className="chip">AIML</span><span className="chip">ECE</span>
              </div>
            </div>
            <div className="aud-card">
              <div className="num">02</div>
              <h3>Businesses</h3>
              <p>Websites, internal tools, and full-stack apps for small businesses that need a working product, not a mockup.</p>
            </div>
            <div className="aud-card">
              <div className="num">03</div>
              <h3>Startups</h3>
              <p>MVPs and early-stage builds — scoped lean so you can test the idea before scaling it up.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="board">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">02 / RECENT WORK</div>
            <h2>What's moving through right now.</h2>
          </div>
          <div className="board">
            <div className="col">
              <div className="col-head"><span className="lbl">IN PROGRESS</span><span className="count">2</span></div>
              <div className="ticket">
                <div className="id mono">ZV-021</div>
                <h4>Inventory tracker</h4>
                <p>Flask + MongoDB app for a retail client.</p>
                <div className="tags"><span className="tag">Flask</span><span className="tag">MongoDB</span></div>
              </div>
              <div className="ticket">
                <div className="id mono">ZV-022</div>
                <h4>Final year ML project</h4>
                <p>Prediction model + IEEE report, CSE final year.</p>
                <div className="tags"><span className="tag">Python</span><span className="tag">ML</span></div>
              </div>
            </div>
            <div className="col">
              <div className="col-head"><span className="lbl">REVIEW</span><span className="count">1</span></div>
              <div className="ticket">
                <div className="id mono">ZV-019</div>
                <h4>Business landing page</h4>
                <p>Marketing site + contact flow for a local business.</p>
                <div className="tags"><span className="tag">Frontend</span></div>
              </div>
            </div>
            <div className="col">
              <div className="col-head"><span className="lbl">SHIPPED</span><span className="count">2</span></div>
              <div className="ticket done">
                <div className="id mono">ZV-014</div>
                <h4>Mini project — attendance system</h4>
                <p>Java + SQL, delivered a week ahead of submission.</p>
                <div className="tags"><span className="tag">Java</span><span className="tag">SQL</span></div>
              </div>
              <div className="ticket done">
                <div className="id mono">ZV-011</div>
                <h4>Logistics quote tool</h4>
                <p>Internal quoting tool for a logistics client.</p>
                <div className="tags"><span className="tag">AWS</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">03 / PRICING</div>
            <h2>Simple rates, one student discount.</h2>
          </div>
          <div className="price-wrap">
            <div className="price-side">
              <div className="tag mono">FOR STUDENTS</div>
              <h3>Final year & mini projects</h3>
              <div className="price-row"><div className="lbl">Mini project<span className="sub">1–2 week build</span></div><div className="amt">₹4,000+</div></div>
              <div className="price-row"><div className="lbl">Final year project<span className="sub">Build + report + PPT</span></div><div className="amt">₹5,000+</div></div>
              <div className="badge-discount">🎓 20% off with a valid student ID</div>
            </div>
            <div className="price-side">
              <div className="tag mono">FOR BUSINESSES</div>
              <h3>Client & startup builds</h3>
              <div className="price-row"><div className="lbl">Landing page / website<span className="sub">Frontend, fast turnaround</span></div><div className="amt">Quote on call</div></div>
              <div className="price-row"><div className="lbl">Full-stack app<span className="sub">Custom scope</span></div><div className="amt">Quote on call</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <div className="contact-panel">
            <div>
              <h2>Tell us what you're building.</h2>
              <p>WhatsApp is the fastest way to reach us — send your topic or brief and we'll reply with a quote.</p>
            </div>
            <div className="contact-methods">
              <a className="cmethod" href={waHref} target="_blank" rel="noopener noreferrer">
                <span className="ic wa">💬</span>
                <span className="meta"><span className="lbl">WHATSAPP</span><span className="val">+91 63793 76791</span></span>
              </a>
              <a className="cmethod" href="tel:+916379376791">
                <span className="ic ph">📞</span>
                <span className="meta"><span className="lbl">CALL / PHONE</span><span className="val">+91 63793 76791</span></span>
              </a>
              <a className="cmethod" href="mailto:nareshkrishnan2919@gmail.com">
                <span className="ic em">✉️</span>
                <span className="meta"><span className="lbl">EMAIL</span><span className="val">nareshkrishnan2919@gmail.com</span></span>
              </a>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', marginTop: 24 }}>
            We respect your privacy. Your contact info is only used to reply to your inquiry.
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="bottom-bar">
            <div>© 2026 Zenvyra Technologys, Madurai</div>
            <div className="mono">Student projects · Client builds · Open for work</div>
          </div>
        </div>
      </footer>

      <StudentModal isOpen={studentOpen} onClose={() => setStudentOpen(false)} />
      <ClientModal isOpen={clientOpen} onClose={() => setClientOpen(false)} />
    </div>
  );
}