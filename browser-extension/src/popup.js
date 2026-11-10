// Popup: connect state, resume picker, suggested openings, and "Fill current form".

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function pick(obj, ...keys) {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  return "";
}

function fieldsFromResume(resume) {
  const info = resume.personal_info || resume.personalInfo || {};
  const first = pick(info, "first_name", "firstName");
  const last = pick(info, "last_name", "lastName");
  return {
    firstName: first,
    lastName: last,
    fullName: [first, last].filter(Boolean).join(" "),
    email: pick(info, "email"),
    phone: pick(info, "phone"),
    linkedin: pick(info, "linkedin"),
    github: pick(info, "github"),
    website: pick(info, "website"),
    location: pick(info, "location"),
  };
}

function resumeLabel(r) {
  if (r.name && String(r.name).trim()) return r.name;
  const info = r.personal_info || r.personalInfo || {};
  const parts = [pick(info, "first_name", "firstName"), pick(info, "last_name", "lastName")].filter(Boolean);
  return parts.join(" ") || "Untitled resume";
}

const show = (id, on) => ($(id).hidden = !on);

// ---------------------------------------------------------------------------
// This function is injected into the job application tab (runs in that page).
// Keep it self-contained: no outside references, no chrome APIs.
// ---------------------------------------------------------------------------
function fillFormInPage(fields) {
  const setNativeValue = (el, value) => {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value") && Object.getOwnPropertyDescriptor(proto, "value").set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  };
  const mark = (el) => {
    el.style.outline = "2px solid #e83a6a";
    el.style.outlineOffset = "1px";
  };
  const fieldText = (el) => {
    const bits = [];
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) bits.push(lab.textContent || "");
    }
    const wrap = el.closest("label");
    if (wrap) bits.push(wrap.textContent || "");
    bits.push(el.getAttribute("aria-label") || "", el.getAttribute("placeholder") || "", el.getAttribute("name") || "");
    return bits.join(" ").toLowerCase();
  };
  const isFillable = (el) => {
    if (el.disabled || el.readOnly || el.type === "hidden" || el.type === "file") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const TARGETS = [
    { key: "firstName", selectors: ["#first_name", 'input[name="first_name"]', 'input[autocomplete="given-name"]'], any: ["first name", "vorname", "given name"] },
    { key: "lastName", selectors: ["#last_name", 'input[name="last_name"]', 'input[autocomplete="family-name"]'], any: ["last name", "nachname", "surname", "family name"] },
    { key: "fullName", selectors: ['input[name="name"]'], any: ["full name", "your name"], exact: ["name"], not: ["first", "last", "user", "company", "file"] },
    { key: "email", selectors: ["#email", 'input[type="email"]', 'input[name="email"]', 'input[autocomplete="email"]'], any: ["email", "e-mail"] },
    { key: "phone", selectors: ["#phone", 'input[type="tel"]', 'input[name="phone"]', 'input[autocomplete="tel"]'], any: ["phone", "telefon", "mobile", "handy"] },
    { key: "linkedin", selectors: ['input[name="urls[LinkedIn]"]', 'input[name*="linkedin" i]'], any: ["linkedin"] },
    { key: "github", selectors: ['input[name="urls[GitHub]"]', 'input[name*="github" i]'], any: ["github"] },
    { key: "website", selectors: ['input[name="urls[Portfolio]"]', 'input[name*="website" i]', 'input[name*="portfolio" i]'], any: ["website", "portfolio", "webseite"] },
    { key: "location", selectors: ["#auto_complete_input", 'input[name="location"]', 'input[autocomplete="address-level2"]'], any: ["location", "city", "stadt", "ort", "where are you"] },
  ];
  const matchesText = (text, t) => {
    if (t.exact && t.exact.some((k) => text.trim() === k)) return !(t.not || []).some((n) => text.includes(n));
    if (t.not && t.not.some((n) => text.includes(n))) return false;
    return (t.any || []).some((k) => text.includes(k));
  };
  const findField = (t, used) => {
    for (const sel of t.selectors) {
      const el = document.querySelector(sel);
      if (el && !used.has(el) && isFillable(el)) return el;
    }
    for (const el of Array.from(document.querySelectorAll("input, textarea"))) {
      if (used.has(el) || !isFillable(el)) continue;
      if (matchesText(fieldText(el), t)) return el;
    }
    return null;
  };
  const used = new Set();
  let filled = 0;
  for (const t of TARGETS) {
    const value = fields[t.key];
    if (!value) continue;
    const el = findField(t, used);
    if (!el) continue;
    used.add(el);
    if (el.value && el.value.trim()) continue;
    setNativeValue(el, value);
    mark(el);
    filled += 1;
  }
  return { filled };
}

// ---------------------------------------------------------------------------

// 5 per page in the popup; the website shows the same jobs 10 at a time.
const JOBS_PER_PAGE = 5;
let jobsView = { jobs: [], page: 1 };

function jobCard(j) {
  const a = document.createElement("a");
  a.className = "job";
  a.href = j.url;
  a.target = "_blank";
  a.rel = "noopener";
  const skills = (j.matched_skills || []).map((s) => `<span class="skill">${s}</span>`).join("");
  a.innerHTML =
    `<span class="t"></span>` +
    `<span class="m"></span>` +
    (skills ? `<span class="skills">${skills}</span>` : "");
  a.querySelector(".t").textContent = j.title || "Untitled role";
  a.querySelector(".m").textContent = [j.company, j.remote ? "Remote" : j.location].filter(Boolean).join(" · ");
  return a;
}

function renderJobsPage() {
  const box = $("jobs");
  const note = $("jobs-note");
  const pager = $("jobs-pager");
  box.innerHTML = "";
  pager.innerHTML = "";
  const { jobs } = jobsView;
  const pages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));
  const current = Math.min(jobsView.page, pages);
  jobsView.page = current;
  const start = (current - 1) * JOBS_PER_PAGE;
  for (const j of jobs.slice(start, start + JOBS_PER_PAGE)) box.appendChild(jobCard(j));
  note.textContent = `${jobs.length} openings · click one to open its form, then “Fill current form”.`;
  if (pages > 1) {
    const prev = document.createElement("button");
    prev.className = "pager-btn";
    prev.type = "button";
    prev.textContent = "‹ Prev";
    prev.disabled = current <= 1;
    prev.addEventListener("click", () => {
      jobsView.page = current - 1;
      renderJobsPage();
    });
    const label = document.createElement("span");
    label.className = "pager-label";
    label.textContent = `Page ${current} of ${pages}`;
    const next = document.createElement("button");
    next.className = "pager-btn";
    next.type = "button";
    next.textContent = "Next ›";
    next.disabled = current >= pages;
    next.addEventListener("click", () => {
      jobsView.page = current + 1;
      renderJobsPage();
    });
    pager.append(prev, label, next);
  }
}

async function loadJobs(id) {
  const box = $("jobs");
  const note = $("jobs-note");
  $("jobs-pager").innerHTML = "";
  box.innerHTML = '<span class="spin"></span>';
  note.textContent = "";
  const country = $("germany").checked ? "germany" : "";
  const res = await send({ type: "job-openings", id, country });
  box.innerHTML = "";
  if (!res?.ok) {
    note.textContent =
      res?.error === "no_keywords"
        ? "This resume has no job title. Add one on 123Resume, then refresh."
        : "Could not load openings. Open 123Resume, sign in, and refresh.";
    return;
  }
  jobsView = { jobs: res.jobs || [], page: 1 };
  if (jobsView.jobs.length === 0) {
    note.textContent = "No matching openings right now. Try another resume or check back later.";
    return;
  }
  renderJobsPage();
}

async function render() {
  const status = await send({ type: "status" });
  if (!status?.connected) {
    $("status").textContent = "Not connected to 123Resume.";
    show("connect", true);
    show("ready", false);
    return;
  }
  $("status").textContent = status.user?.email ? `Connected as ${status.user.email}` : "Connected to 123Resume.";
  show("connect", false);

  const res = await send({ type: "list-resumes" });
  if (!res?.ok) {
    $("status").textContent = "Could not load your resumes. Open 123Resume, sign in, and try again.";
    return;
  }
  const resumes = Array.isArray(res.resumes) ? res.resumes : [];
  const sel = $("resume");
  sel.innerHTML = "";
  for (const r of resumes) {
    const opt = document.createElement("option");
    opt.value = pick(r, "id", "_id");
    opt.textContent = resumeLabel(r);
    sel.appendChild(opt);
  }
  show("ready", resumes.length > 0);
  if (resumes.length === 0) {
    $("status").textContent = "No resumes found on your account.";
    return;
  }
  loadJobs(sel.value);
}

$("open-login").addEventListener("click", () => chrome.tabs.create({ url: "https://123resume.de/login" }));
$("disconnect").addEventListener("click", async () => {
  await send({ type: "disconnect" });
  render();
});
$("resume").addEventListener("change", (e) => loadJobs(e.target.value));
$("find").addEventListener("click", () => loadJobs($("resume").value));
$("germany").addEventListener("change", () => loadJobs($("resume").value));

$("fill").addEventListener("click", async () => {
  const result = $("result");
  result.className = "result";
  result.textContent = "Filling…";
  const got = await send({ type: "get-resume", id: $("resume").value });
  if (!got?.ok) {
    result.className = "result err";
    result.textContent = "Could not load that resume.";
    return;
  }
  const fields = fieldsFromResume(got.resume);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // On a LinkedIn page the form is LinkedIn's own (Easy Apply), which we don't
  // autofill. Nudge the user to the company's application page instead.
  if (/(^|\.)linkedin\.com$/.test(new URL(tab.url || "https://x").hostname)) {
    result.className = "result err";
    result.textContent = "This is LinkedIn's own form (Easy Apply). Click “Apply on company website”, then fill there.";
    return;
  }
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillFormInPage,
      args: [fields],
    });
    const filled = out?.[0]?.result?.filled ?? 0;
    result.className = filled ? "result ok" : "result err";
    result.textContent = filled
      ? `Filled ${filled} field${filled === 1 ? "" : "s"}. Review and submit.`
      : "No matching fields found on this page.";
  } catch {
    result.className = "result err";
    result.textContent = "Can't fill this page (e.g. a browser or store page). Open the application form and try again.";
  }
});

render();
