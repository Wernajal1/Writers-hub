import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen,
  BriefcaseBusiness, Check, CheckCircle2, ChevronDown, Clock3, FileText,
  GraduationCap, LayoutGrid, LoaderCircle, LockKeyhole, LogOut, MessageCircle,
  Plus, Send, ShieldCheck, Sparkles, UserRound, Users, X
} from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, signOut } from "./api.js";

const specialties = ["Nursing", "Business", "Computer Science", "Law", "Literature", "Engineering", "General"];
const citationStyles = ["APA", "MLA", "Harvard", "Chicago", "IEEE"];

function Logo({ light = false }) {
  return <Link to="/" className={`brand ${light ? "brand-light" : ""}`}>
    <span className="brand-icon"><BookOpen size={18} strokeWidth={2.2} /></span>
    <span>Writers<span className="brand-accent">Hub</span></span>
  </Link>;
}

function Alert({ children, type = "error" }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`} role="status">{type === "error" ? <X size={17} /> : <CheckCircle2 size={17} />}{children}</div>;
}

function Spinner({ label = "Loading..." }) {
  return <div className="loading-screen"><LoaderCircle className="spin" size={27} /><span>{label}</span></div>;
}

function AuthLayout({ children, eyebrow = "The home for independent writers" }) {
  return <main className="auth-page">
    <section className="auth-story">
      <Logo light />
      <div className="story-copy">
        <div className="story-pill"><Sparkles size={14} /> A community built around your craft</div>
        <h1>Good work deserves <span>good work.</span></h1>
        <p>Meet a thoughtful community of writers, discover new opportunities, and make your next project count.</p>
        <div className="story-proof">
          <div className="avatar-stack"><span>W</span><span>A</span><span>M</span><span>J</span></div>
          <span>Built for writers at every stage</span>
        </div>
      </div>
      <div className="story-bottom"><ShieldCheck size={16} /> A safer, more intentional space for writing work</div>
    </section>
    <section className="auth-main">
      <div className="auth-mobile-brand"><Logo /></div>
      <div className="auth-card">{children}</div>
      <p className="auth-footnote">{eyebrow}</p>
    </section>
  </main>;
}

function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api("/api/auth/register", {
        method: "POST",
        unauthenticated: true,
        body: JSON.stringify(values)
      });
      localStorage.removeItem("writersHubToken");
      localStorage.setItem("writersHubPaymentToken", result.paymentToken);
      localStorage.setItem("writersHubUser", JSON.stringify(result.user));
      navigate("/activate-payment");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout>
    <div className="form-heading">
      <p className="eyebrow">Create your account</p>
      <h2>Make room for <span>better work.</span></h2>
      <p>Set up your profile to find writing opportunities.</p>
    </div>
    <Alert>{error}</Alert>
    <form onSubmit={submit} className="stack-form">
      <label className="field"><span>Full name</span><input autoComplete="name" required maxLength={160} placeholder="e.g. Amina Wanjiku" value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} /></label>
      <label className="field"><span>Email address</span><input type="email" autoComplete="email" required placeholder="you@example.com" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
      <label className="field"><span>Safaricom phone number</span><div className="phone-input"><span>🇰🇪 +254</span><input inputMode="tel" autoComplete="tel-national" required placeholder="7XX XXX XXX" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></div><small>Use 07…, 01…, or the full 254… number.</small></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></label>
      <button className="button button-primary button-wide" disabled={loading}>{loading ? <LoaderCircle size={17} className="spin" /> : <>Create account <ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    <p className="terms-note">By continuing, you agree to work responsibly and follow our community standards.</p>
  </AuthLayout>;
}

function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        unauthenticated: true,
        body: JSON.stringify({ identifier, password })
      });
      localStorage.setItem("writersHubUser", JSON.stringify(result.user));
      if (result.token) {
        localStorage.setItem("writersHubToken", result.token);
        localStorage.removeItem("writersHubPaymentToken");
        navigate(result.user.survey_completed ? "/feed" : "/survey");
      } else {
        localStorage.removeItem("writersHubToken");
        localStorage.setItem("writersHubPaymentToken", result.paymentToken);
        localStorage.removeItem("writersHubToken");
        navigate("/activate-payment");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout>
    <div className="form-heading">
      <p className="eyebrow">Welcome back</p>
      <h2>Pick up where <span>you left off.</span></h2>
      <p>Sign in to find your next opportunity.</p>
    </div>
    <Alert>{error}</Alert>
    <form onSubmit={submit} className="stack-form">
      <label className="field"><span>Email or phone number</span><input autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Email or 07XX XXX XXX" /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label>
      <button className="button button-primary button-wide" disabled={loading}>{loading ? <LoaderCircle size={17} className="spin" /> : <>Sign in <ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-switch">New to Writers Hub? <Link to="/register">Create an account</Link></p>
  </AuthLayout>;
}

function PaymentPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("writersHubUser") || "null"); } catch { return null; }
  });
  const [phone, setPhone] = useState(user?.phone_number?.replace(/^254/, "") || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState("");
  const [checkoutStartedAt, setCheckoutStartedAt] = useState(0);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("writersHubPaymentToken");
    if (!token && localStorage.getItem("writersHubToken")) navigate("/survey", { replace: true });
    else if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!checkoutId) return undefined;
    const intervalId = window.setInterval(async () => {
      if (Date.now() - checkoutStartedAt >= 120000) {
        setPollError("We didn’t receive a payment confirmation in time. Check your M-PESA messages before retrying.");
        setCheckoutId("");
        return;
      }
      try {
        const status = await api(`/api/payments/status/${encodeURIComponent(checkoutId)}`);
        if (status.status === "completed" && status.token) {
          localStorage.setItem("writersHubToken", status.token);
          localStorage.removeItem("writersHubPaymentToken");
          navigate("/survey", { replace: true });
        } else if (status.status === "failed") {
          setPollError("The payment was not completed. You can try again.");
          setCheckoutId("");
        }
      } catch (pollingError) {
        setPollError(pollingError.message);
        setCheckoutId("");
      }
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [checkoutId, checkoutStartedAt, navigate]);

  async function beginPayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const result = await api("/api/payments/start", {
        method: "POST",
        body: JSON.stringify({ phone })
      });
      if (result.token) {
        localStorage.setItem("writersHubToken", result.token);
        localStorage.removeItem("writersHubPaymentToken");
        navigate("/survey");
      } else if (result.checkoutRequestId) {
        setCheckoutId(result.checkoutRequestId);
        setCheckoutStartedAt(Date.now());
        setPollError("");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAccount() {
    try {
      const result = await api("/api/payments/account");
      setUser(result.user);
      if (result.token) {
        localStorage.setItem("writersHubToken", result.token);
        localStorage.removeItem("writersHubPaymentToken");
        navigate("/survey", { replace: true });
        return;
      }
      setNotice("Your account is still waiting for payment confirmation.");
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  return <AuthLayout eyebrow="One small step to activate your writer profile">
    <div className="payment-symbol"><LockKeyhole size={23} /></div>
    <div className="form-heading">
      <p className="eyebrow">Writer activation</p>
      <h2>Open the door to <span>new work.</span></h2>
      <p>Activate your account with a one-time contribution.</p>
    </div>
    <div className="price-card">
      <div><span>One-time activation</span><small>Secure mobile money payment</small></div>
      <strong><small>KES</small> 80</strong>
    </div>
    <Alert>{error}</Alert>
    {notice && <Alert type="success">{notice}</Alert>}
    {pollError && <Alert>{pollError}</Alert>}
    <form onSubmit={beginPayment} className="stack-form payment-form">
      <label className="field"><span>Safaricom number</span><div className="phone-input"><span>🇰🇪 +254</span><input inputMode="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} /></div></label>
      <button className="button button-primary button-wide" disabled={loading || Boolean(checkoutId)}>{loading ? <LoaderCircle size={17} className="spin" /> : <>Pay KES 80 <ArrowRight size={17} /></>}</button>
    </form>
    {checkoutId && <div className="waiting-payment"><LoaderCircle size={18} className="spin" /> Check your phone and enter your PIN. We’re waiting for confirmation…</div>}
    <p className="secure-note"><ShieldCheck size={15} /> Payment confirmation will unlock your account automatically.</p>
    <div className="payment-bottom"><button className="text-button" onClick={refreshAccount}>Check account status</button><button className="text-button" onClick={() => { signOut(); navigate("/login"); }}>Sign out</button></div>
  </AuthLayout>;
}

function Guard({ children, needsSurvey = false }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null, error: "" });
  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("writersHubToken");
    if (!token) {
      setState({ loading: false, user: null, error: "" });
      return () => { active = false; };
    }
    api("/api/auth/me").then(({ user }) => {
      if (active) setState({ loading: false, user, error: "" });
    }).catch((error) => {
      signOut();
      if (active) setState({ loading: false, user: null, error: error.message });
    });
    return () => { active = false; };
  }, [location.pathname]);

  if (state.loading) return <Spinner />;
  if (!state.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (state.user.payment_status !== "paid") return <Navigate to="/activate-payment" replace />;
  if (needsSurvey && !state.user.survey_completed) return <Navigate to="/survey" replace />;
  if (!needsSurvey && state.user.survey_completed && location.pathname === "/survey") return <Navigate to="/feed" replace />;
  return children;
}

function OnboardingSurvey() {
  const navigate = useNavigate();
  const location = useLocation();
  const rotationKey = "writersHubSurveyStart";
  const { surveyVersion, draftKey } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get("survey");
    if (requested === "1" || requested === "2") {
      const key = `writersHubSurveyDraft${requested}`;
      return { surveyVersion: Number(requested), draftKey: key };
    }

    let startedAt = Number(localStorage.getItem(rotationKey));
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      localStorage.setItem(rotationKey, String(startedAt));
    }
    const version = Date.now() - startedAt >= 48 * 60 * 60 * 1000 ? 2 : 1;
    return { surveyVersion: version, draftKey: `writersHubSurveyDraft${version}` };
  }, [location.search]);

  const [initialDraft] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || "{}");
    } catch {
      return {};
    }
  });
  const [selectedSubjects, setSelectedSubjects] = useState(initialDraft.selectedSubjects || []);
  const [selectedCitations, setSelectedCitations] = useState(initialDraft.selectedCitations || []);
  const [turnaround, setTurnaround] = useState(initialDraft.turnaround || "");
  const [bio, setBio] = useState(initialDraft.bio || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(initialDraft.step || 0);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify({
      selectedSubjects,
      selectedCitations,
      turnaround,
      bio,
      step
    }));
  }, [draftKey, selectedSubjects, selectedCitations, turnaround, bio, step]);

  function toggle(value, values, setter) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function submit(event) {
    event.preventDefault();
    if (selectedSubjects.length === 0 || selectedCitations.length === 0 || !turnaround || bio.trim().length < 150) {
      setError("Choose at least one specialty and citation style, choose your turnaround, and write at least 150 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { user } = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          specialties: selectedSubjects,
          citationStyles: selectedCitations,
          turnaroundSpeed: turnaround,
          bioSample: bio
        })
      });
      localStorage.setItem("writersHubUser", JSON.stringify(user));
      localStorage.removeItem(draftKey);
      localStorage.removeItem(rotationKey);
      navigate("/feed", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <div className="onboarding-shell">
    <header className="simple-header"><Logo /><button className="quiet-button" onClick={() => { signOut(); navigate("/login"); }}><LogOut size={16} /> Sign out</button></header>
    <main className="survey-layout">
      <aside className="survey-aside"><div className="survey-step-progress"><span>WRITER PROFILE · SURVEY {surveyVersion}</span><strong>0{step + 1} <i>/ 02</i></strong></div><div className="progress-line"><span style={{ width: step ? "100%" : "50%" }} /></div>
        <div className="survey-aside-title"><div className="survey-icon"><GraduationCap size={22} /></div><h2>{surveyVersion === 1 ? "Put your best work forward." : "Find work that fits you."}</h2><p>{surveyVersion === 1 ? "A few details help us match you with the right opportunities." : "Tell us which projects you prefer and how you deliver them."}</p></div>
        <div className="survey-checklist"><span className={step === 0 ? "current" : "done"}><i>{step ? <Check size={14} /> : "01"}</i>{surveyVersion === 1 ? "Expertise" : "Project preferences"}</span><span className={step === 1 ? "current" : ""}><i>{step ? "02" : "02"}</i>{surveyVersion === 1 ? "Your approach" : "Availability"}</span></div>
      </aside>
      <section className="survey-main">
        <div className="survey-form-heading"><p className="eyebrow">Survey {surveyVersion} · Your writer profile</p><h1>{step === 0
          ? (surveyVersion === 1 ? "What do you write about?" : "Which projects suit you?")
          : (surveyVersion === 1 ? "Tell us how you work." : "How quickly can you deliver?")}</h1><p>{step === 0
          ? "Choose your subject strengths and go-to style guides."
          : (surveyVersion === 1 ? "Share your availability and a short writing sample." : "Describe your working capacity and a recent piece of writing.")}</p></div>
        <Alert>{error}</Alert>
        <form onSubmit={submit}>
          {step === 0 ? <div className="survey-fields">
            <fieldset className="profile-group"><legend>Subject specialties <span>Choose all that apply</span></legend><div className="tag-select-grid">{specialties.map((item) => <button type="button" className={`select-chip ${selectedSubjects.includes(item) ? "selected" : ""}`} onClick={() => toggle(item, selectedSubjects, setSelectedSubjects)} key={item}>{selectedSubjects.includes(item) && <Check size={15} />}{item}</button>)}</div></fieldset>
            <fieldset className="profile-group"><legend>Citation styles <span>Choose all that apply</span></legend><div className="tag-select-grid">{citationStyles.map((item) => <button type="button" className={`select-chip ${selectedCitations.includes(item) ? "selected" : ""}`} onClick={() => toggle(item, selectedCitations, setSelectedCitations)} key={item}>{selectedCitations.includes(item) && <Check size={15} />}{item}</button>)}</div></fieldset>
          </div> : <div className="survey-fields">
            <fieldset className="profile-group"><legend>Turnaround speed</legend><div className="turnaround-options">{["Up to 1,000 words in 24 hours", "Up to 2,000 words in 24 hours", "2–3 days for larger projects", "Flexible, depending on scope"].map((item) => <label className={`turnaround-option ${turnaround === item ? "selected" : ""}`} key={item}><input type="radio" name="turnaround" value={item} checked={turnaround === item} onChange={() => setTurnaround(item)} /><Clock3 size={17} /><span>{item}</span><span className="radio-mark" /></label>)}</div></fieldset>
            <label className="field"><span>Short writing sample or bio <small>(150 characters minimum)</small></span><textarea rows="6" maxLength={5000} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Share your experience, writing approach, or a short original sample…" /><div className={`char-counter ${bio.trim().length < 150 ? "" : "valid"}`}>{bio.trim().length} / 150 minimum</div></label>
          </div>}
          <div className="survey-actions">{step === 1 && <button className="button button-quiet" type="button" onClick={() => setStep(0)}><ArrowLeft size={17} /> Back</button>}{step === 0 ? <button className="button button-primary" type="button" disabled={!selectedSubjects.length || !selectedCitations.length} onClick={() => { setError(""); setStep(1); }} >Continue <ArrowRight size={17} /></button> : <button className="button button-primary" disabled={loading}>{loading ? <LoaderCircle size={17} className="spin" /> : <>Complete profile <ArrowRight size={17} /></>}</button>}</div>
        </form>
        <p className="privacy-note"><LockKeyhole size={14} /> Your profile details are only shared with you and the teams reviewing applications.</p>
      </section>
    </main>
  </div>;
}

function SiteHeader({ user }) {
  const navigate = useNavigate();
  return <header className="site-header">
    <div className="site-header-inner"><Logo />
      <nav className="main-nav"><Link className="nav-active" to="/feed"><LayoutGrid size={17} /> Feed</Link><a href="#opportunities"><BriefcaseBusiness size={17} /> Opportunities</a><a href="#community"><Users size={17} /> Community</a></nav>
      <div className="header-account"><span className="online-dot" /><span className="header-name">{user.full_name}</span><button aria-label="Sign out" className="avatar avatar-small" onClick={() => { signOut(); navigate("/login"); }}>{user.full_name[0]?.toUpperCase()}</button></div>
    </div>
  </header>;
}

function ProfileCard({ user, onEdit }) {
  return <section className="panel profile-card">
    <div className="profile-cover"><span>WRITERS HUB MEMBER</span></div>
    <div className="profile-card-content">
      <div className="profile-avatar">{user.full_name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}<span className="avatar-status" /></div>
      <div className="profile-identity"><h2>{user.full_name}</h2><p><BadgeCheck size={15} /> Verified writer</p></div>
      <span className="paid-badge"><CheckCircle2 size={13} /> ACTIVATED</span>
      <div className="profile-contact"><span><UserRound size={15} />{user.email}</span><span><MessageCircle size={15} />+{user.phone_number}</span></div>
      <div className="profile-tags"><span className="profile-label">SUBJECTS</span><div>{user.specialties?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div>
      <div className="profile-tags"><span className="profile-label">CITATIONS</span><div>{user.citation_styles?.map((tag) => <span className="tag tag-soft" key={tag}>{tag}</span>)}</div></div>
      <div className="turnaround-line"><Clock3 size={15} /><span>{user.turnaround_speed}</span></div>
      <button className="edit-profile" onClick={onEdit}>Edit profile <ArrowUpRight size={15} /></button>
    </div>
  </section>;
}

function GigCard({ gig, onApply }) {
  return <article className={`gig-card ${gig.status === "taken" ? "gig-taken" : ""}`}>
    <div className="gig-card-top"><span className={`status-pill ${gig.status === "open" ? "status-open" : "status-taken"}`}><i />{gig.status === "open" ? "Open" : "Taken"}</span><span className="gig-age">{new Date(gig.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
    <h3>{gig.title}</h3><p className="gig-description">{gig.description}</p>
    <div className="gig-tags"><span>{gig.subject}</span><span>{gig.citation_style}</span></div>
    <div className="gig-details"><span><FileText size={15} />{gig.word_count}</span><span><Clock3 size={15} />Due {gig.deadline}</span><strong>KES {Number(gig.budget_kes).toLocaleString()}</strong></div>
    <div className="gig-actions">{gig.applied ? <button className="button applied-button" disabled><Check size={16} /> Applied</button> : <button className="button button-primary" disabled={gig.status !== "open"} onClick={() => onApply(gig)}>{gig.status === "open" ? <>Apply now <ArrowRight size={16} /></> : "Applications closed"}</button>}<span>Thoughtful work. Fair terms.</span></div>
  </article>;
}

function EditProfileModal({ user, onClose, onSaved }) {
  const [subjects, setSubjects] = useState(user.specialties || []);
  const [citations, setCitations] = useState(user.citation_styles || []);
  const [speed, setSpeed] = useState(user.turnaround_speed || "");
  const [bio, setBio] = useState(user.bio_sample || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function toggle(value, values, setter) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api("/api/profile", { method: "PUT", body: JSON.stringify({ specialties: subjects, citationStyles: citations, turnaroundSpeed: speed, bioSample: bio }) });
      onSaved(result.user);
      onClose();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
    <div className="modal-header"><div><p className="eyebrow">Your details</p><h2 id="edit-profile-title">Edit writer profile</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
    <form onSubmit={save} className="modal-form">
      <fieldset className="profile-group"><legend>Specialties</legend><div className="tag-select-grid">{specialties.map((item) => <button type="button" className={`select-chip ${subjects.includes(item) ? "selected" : ""}`} onClick={() => toggle(item, subjects, setSubjects)} key={item}>{item}</button>)}</div></fieldset>
      <fieldset className="profile-group"><legend>Citation styles</legend><div className="tag-select-grid">{citationStyles.map((item) => <button type="button" className={`select-chip ${citations.includes(item) ? "selected" : ""}`} onClick={() => toggle(item, citations, setCitations)} key={item}>{item}</button>)}</div></fieldset>
      <label className="field"><span>Turnaround speed</span><input required value={speed} onChange={(event) => setSpeed(event.target.value)} /></label>
      <label className="field"><span>Bio or writing sample</span><textarea rows="4" minLength={150} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
      <Alert>{error}</Alert>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button disabled={saving} className="button button-primary">{saving ? "Saving…" : "Save changes"}</button></div>
    </form>
  </section></div>;
}

function ApplyModal({ gig, onClose, onApplied }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api(`/api/gigs/${gig.id}/applications`, { method: "POST", body: JSON.stringify({ note }) });
      onApplied(gig.id, result.notificationSent);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title">
    <div className="modal-header"><div><p className="eyebrow">A good fit?</p><h2 id="apply-title">Apply for this gig</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
    <div className="apply-summary"><strong>{gig.title}</strong><span>{gig.subject} · KES {Number(gig.budget_kes).toLocaleString()}</span></div>
    <form onSubmit={submit} className="modal-form"><label className="field"><span>Quick note <small>(optional)</small></span><textarea rows="4" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Confirm you can meet the deadline or add a note…" /></label><Alert>{error}</Alert><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={loading}>{loading ? "Sending…" : <>Confirm application <Send size={16} /></>}</button></div></form>
  </section></div>;
}

function FeedPage() {
  const [user, setUser] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedGig, setSelectedGig] = useState(null);
  const [editing, setEditing] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profile, gigResult, postResult] = await Promise.all([
        api("/api/profile"), api("/api/gigs"), api("/api/community")
      ]);
      setUser(profile.user);
      setGigs(gigResult.gigs);
      setPosts(postResult.posts);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const openCount = useMemo(() => gigs.filter((gig) => gig.status === "open").length, [gigs]);

  async function publishPost(event) {
    event.preventDefault();
    setPosting(true);
    try {
      const { post } = await api("/api/community", { method: "POST", body: JSON.stringify({ content: postText }) });
      setPosts([post, ...posts]);
      setPostText("");
    } catch (postError) { setError(postError.message); }
    finally { setPosting(false); }
  }

  function onApplied(gigId, notificationSent) {
    setGigs(gigs.map((gig) => gig.id === gigId ? { ...gig, applied: true } : gig));
    setSelectedGig(null);
    setNotice(notificationSent ? "Application sent. Good luck!" : "Application saved. Email notification could not be sent.");
    window.setTimeout(() => setNotice(""), 5000);
  }

  if (loading) return <Spinner label="Opening your writer hub…" />;
  if (!user) return <div className="app-shell"><SiteHeader user={{ full_name: "Writer" }} /><main className="feed-grid"><Alert>{error}</Alert></main></div>;
  const topSubjects = [...new Set(gigs.filter((gig) => gig.status === "open").map((gig) => gig.subject))].slice(0, 4);

  return <div className="app-shell">
    <SiteHeader user={user} />
    <main className="feed-grid">
      <aside className="feed-left"><ProfileCard user={user} onEdit={() => setEditing(true)} /><section className="panel sidebar-links"><p className="sidebar-label">YOUR SPACE</p><a href="#opportunities"><BriefcaseBusiness size={16} /> Your applications <ArrowUpRight size={14} /></a><a href="#community"><Users size={16} /> Writer community <ArrowUpRight size={14} /></a><a href="#rules"><BookOpen size={16} /> Community guidelines <ArrowUpRight size={14} /></a><div className="sidebar-help"><ShieldCheck size={17} /><span>Every opportunity is reviewed before it reaches your feed.</span></div></section><div className="footer-links">About · Community · Privacy<br />© 2026 Writers Hub</div></aside>

      <section className="feed-center">
        <div className="feed-title-row"><div><p className="eyebrow">Your writing community</p><h1>Your next good thing.</h1></div><span className="feed-date">{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span></div>
        <Alert>{error}</Alert><Alert type="success">{notice}</Alert>

        <section className="panel feed-composer" id="community">
          <div className="composer-top"><span className="avatar">{user.full_name[0]?.toUpperCase()}</span><label htmlFor="postText">Share an update with the community…</label></div>
          <form onSubmit={publishPost}><textarea id="postText" rows="2" maxLength={500} value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="Share your availability, a useful resource, or a writing tip…" /><div className="composer-footer"><span>{postText.length}/500</span><button className="button button-primary" disabled={!postText.trim() || posting}>{posting ? "Posting…" : <><Plus size={16} /> Share update</>}</button></div></form>
        </section>

        <div className="section-heading" id="opportunities"><div><span className="section-kicker">CURATED FOR YOU</span><h2>Open opportunities <span className="count-pill">{openCount}</span></h2></div><button className="sort-button" onClick={() => setGigs([...gigs].reverse())}>Newest <ChevronDown size={15} /></button></div>
        {gigs.length === 0 ? <div className="panel empty-state"><span className="empty-icon"><BriefcaseBusiness size={22} /></span><h3>Your next opportunity is on its way.</h3><p>We’re reviewing new writing projects. Check back soon, or share an update with the community.</p></div> : <div className="gig-list">{gigs.map((gig) => <GigCard key={gig.id} gig={gig} onApply={setSelectedGig} />)}</div>}

        <div className="section-heading community-heading"><div><span className="section-kicker">FROM YOUR PEERS</span><h2>Community notes</h2></div></div>
        {posts.length === 0 ? <div className="panel empty-community"><Users size={20} /><span>Be the first to share something useful with the community.</span></div> : <div className="community-list">{posts.map((post) => <article className="panel community-post" key={post.id}><div className="post-avatar">{post.full_name?.[0]?.toUpperCase()}</div><div><div className="post-heading"><strong>{post.full_name}</strong><span>· {new Date(post.created_at).toLocaleDateString()}</span></div><div className="post-subjects">{post.specialties?.slice(0, 3).join(" · ") || "Writers Hub member"}</div><p>{post.content}</p></div></article>)}</div>}
      </section>

      <aside className="feed-right">
        <section className="panel stats-panel"><div className="stats-icon"><BriefcaseBusiness size={17} /></div><div><span className="stats-label">OPEN RIGHT NOW</span><strong>{openCount}</strong><small>curated writing gigs</small></div></section>
        <section className="panel demand-panel"><div className="right-panel-heading"><span className="right-icon"><ArrowUpRight size={16} /></span><h3>In demand</h3></div><p>Subjects in current opportunities</p>{topSubjects.length ? <div className="demand-tags">{topSubjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <span className="muted-caption">New subjects coming soon</span>}</section>
        <section className="rules-card" id="rules"><span className="rules-stamp"><Sparkles size={18} /></span><span className="section-kicker">A REMINDER</span><h3>Write with care.</h3><p>Do honest work, meet the deadlines you accept, and keep client information private.</p><a href="#community">Our community principles <ArrowRight size={14} /></a></section>
        <div className="side-note"><ShieldCheck size={16} /><span>Only activated writer profiles can apply for gigs.</span></div>
      </aside>
    </main>
    {selectedGig && <ApplyModal gig={selectedGig} onClose={() => setSelectedGig(null)} onApplied={onApplied} />}
    {editing && <EditProfileModal user={user} onClose={() => setEditing(false)} onSaved={(updated) => { setUser(updated); localStorage.setItem("writersHubUser", JSON.stringify(updated)); }} />}
  </div>;
}

function AdminPage() {
  const [secret, setSecret] = useState(sessionStorage.getItem("writersHubAdminSecret") || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [applicants, setApplicants] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", citationStyle: "APA", wordCount: "", deadline: "", budgetKes: "", description: "" });
  const headers = { "Content-Type": "application/json", "x-admin-secret": secret };

  async function loadGigs() {
    const response = await fetch("/api/admin/gigs", { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load gigs.");
    setGigs(data.gigs);
  }

  async function connect(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loadGigs();
      sessionStorage.setItem("writersHubAdminSecret", secret);
      setAuthenticated(true);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!secret || authenticated) return;
    connect({ preventDefault() {} });
  }, []);

  async function createGig(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/gigs", { method: "POST", headers, body: JSON.stringify(form) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || "Could not create gig."); return; }
    setGigs([data.gig, ...gigs]);
    setForm({ title: "", subject: "", citationStyle: "APA", wordCount: "", deadline: "", budgetKes: "", description: "" });
    setNotice("Opportunity published.");
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function toggleGig(gig) {
    const status = gig.status === "open" ? "taken" : "open";
    const response = await fetch(`/api/admin/gigs/${gig.id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || "Could not update gig."); return; }
    setGigs(gigs.map((item) => item.id === gig.id ? data.gig : item));
  }

  async function showApplicants(gigId) {
    const response = await fetch(`/api/admin/gigs/${gigId}/applicants`, { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || "Could not load applicants."); return; }
    setApplicants({ ...applicants, [gigId]: data.applicants });
  }

  return <div className="admin-page"><header className="simple-header"><Logo /><Link to="/login" className="quiet-button"><ArrowLeft size={15} /> Return to sign in</Link></header><main className="admin-content">
    <div className="admin-heading"><p className="eyebrow">PLATFORM OPERATIONS</p><h1>Admin dashboard</h1><p>Publish opportunities and review incoming applications.</p></div>
    <Alert>{error}</Alert><Alert type="success">{notice}</Alert>
    {!authenticated ? <form onSubmit={connect} className="panel admin-login"><span className="admin-lock"><LockKeyhole size={19} /></span><h2>Admin access</h2><p>Enter the admin secret configured on the server.</p><label className="field"><span>Admin secret</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} required /></label><button className="button button-primary button-wide" disabled={loading}>{loading ? "Checking…" : "Continue"}</button></form> : <div className="admin-grid">
      <section className="panel admin-publish"><div className="admin-section-heading"><div><span className="section-kicker">NEW LISTING</span><h2>Publish an opportunity</h2></div><span className="admin-heading-icon"><Plus size={18} /></span></div>
        <form onSubmit={createGig} className="admin-form">
          <label className="field"><span>Gig title</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Nursing research literature review" /></label>
          <div className="admin-two-col"><label className="field"><span>Subject</span><select value={form.subject} required onChange={(event) => setForm({ ...form, subject: event.target.value })}><option value="">Select a subject</option>{specialties.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Citation style</span><select value={form.citationStyle} onChange={(event) => setForm({ ...form, citationStyle: event.target.value })}>{citationStyles.map((item) => <option key={item}>{item}</option>)}</select></label></div>
          <div className="admin-two-col"><label className="field"><span>Word count / pages</span><input required value={form.wordCount} onChange={(event) => setForm({ ...form, wordCount: event.target.value })} placeholder="2,000 words / 5 pages" /></label><label className="field"><span>Deadline</span><input required value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} placeholder="Friday, 5:00 PM" /></label></div>
          <label className="field"><span>Payout (KES)</span><input type="number" min="1" step="1" required value={form.budgetKes} onChange={(event) => setForm({ ...form, budgetKes: event.target.value })} placeholder="4,500" /></label>
          <label className="field"><span>Project description</span><textarea rows="4" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Scope, deliverables, and any important context…" /></label>
          <button className="button button-primary button-wide">Publish opportunity <ArrowRight size={16} /></button>
        </form>
      </section>
      <section className="panel admin-gigs"><div className="admin-section-heading"><div><span className="section-kicker">LIVE BOARD</span><h2>Your opportunities <span className="count-pill">{gigs.length}</span></h2></div></div>
        {gigs.length ? <div className="admin-gig-list">{gigs.map((gig) => <article className="admin-gig" key={gig.id}><div className="admin-gig-main"><span className={`status-pill ${gig.status === "open" ? "status-open" : "status-taken"}`}><i />{gig.status}</span><h3>{gig.title}</h3><p>{gig.subject} · KES {Number(gig.budget_kes).toLocaleString()} · {gig.applicant_count} applicants</p></div><div className="admin-gig-actions"><button className="text-button" onClick={() => showApplicants(gig.id)}>View applicants</button><button className={`toggle ${gig.status === "open" ? "toggle-on" : ""}`} aria-label={`Mark ${gig.title} ${gig.status === "open" ? "taken" : "open"}`} onClick={() => toggleGig(gig)}><i /></button></div>{applicants[gig.id] && <div className="applicant-list">{applicants[gig.id].length ? applicants[gig.id].map((applicant) => <div className="applicant-row" key={applicant.id}><div><strong>{applicant.full_name}</strong><span>{applicant.email} · +{applicant.phone_number}</span>{applicant.applicant_note && <p>{applicant.applicant_note}</p>}</div><a href={`mailto:${applicant.email}`}><ArrowUpRight size={15} /></a></div>) : <p className="muted-caption">No applications yet.</p>}</div>}</article>)}</div> : <div className="admin-empty"><BriefcaseBusiness size={20} /><p>No gigs published yet.</p><span>Create your first opportunity using the form.</span></div>}
      </section>
    </div>}
  </main></div>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/register" replace />} />
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
    <Route path="/activate-payment" element={<PaymentPage />} />
    <Route path="/survey" element={<Guard><OnboardingSurvey /></Guard>} />
    <Route path="/feed" element={<Guard needsSurvey><FeedPage /></Guard>} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<Navigate to="/register" replace />} />
  </Routes>;
}
