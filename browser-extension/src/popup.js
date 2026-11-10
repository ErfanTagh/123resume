// Popup: connect state, resume picker, suggested openings, and "Save this job"
// (the current page is parsed by Claude and stored in your 123Resume tracker).

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function pick(obj, ...keys) {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  return "";
}

function resumeLabel(r) {
  if (r.name && String(r.name).trim()) return r.name;
  const info = r.personal_info || r.personalInfo || {};
  const parts = [pick(info, "first_name", "firstName"), pick(info, "last_name", "lastName")].filter(Boolean);
  return parts.join(" ") || "Untitled resume";
}

const show = (id, on) => ($(id).hidden = !on);

// ---------------------------------------------------------------------------
// Injected into the current tab to read the posting's visible text. Keep it
// self-contained: no outside references, no chrome APIs.
// ---------------------------------------------------------------------------
function grabPageText() {
  const text = (document.body && document.body.innerText ? document.body.innerText : "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title: document.title || "", url: location.href, text: text.slice(0, 16000) };
}

// ---------------------------------------------------------------------------
// Suggested openings
// ---------------------------------------------------------------------------
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
  note.textContent = `${jobs.length} openings · open one, then “Save this job”.`;
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

// ---------------------------------------------------------------------------
// Save the current page as a job in the tracker (Claude parses it server-side)
// ---------------------------------------------------------------------------
async function saveCurrentJob(status) {
  const result = $("result");
  const btn = $("save");
  btn.disabled = true;
  result.className = "result";
  result.textContent = "Reading page & saving…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      result.className = "result err";
      result.textContent = "No active tab to read.";
      return;
    }
    let page;
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabPageText });
      page = out?.[0]?.result;
    } catch {
      result.className = "result err";
      result.textContent = "Can't read this page (e.g. a browser or store page). Open the job posting and try again.";
      return;
    }
    if (!page || !page.text || page.text.length < 40) {
      result.className = "result err";
      result.textContent = "Couldn't find any job text on this page.";
      return;
    }
    const res = await send({
      type: "save-job",
      page_text: page.text,
      url: page.url,
      title: page.title,
      status,
    });
    if (!res?.ok) {
      result.className = "result err";
      result.textContent =
        res?.error === "no_text"
          ? "Couldn't find any job text on this page."
          : "Could not save. Open 123Resume, sign in, and try again.";
      return;
    }
    const app = res.application || {};
    result.className = "result ok";
    result.textContent = "";
    const line = document.createElement("span");
    line.textContent =
      "Saved: " + (app.job_title || "job") + (app.company ? " · " + app.company : "") + ". ";
    const link = document.createElement("a");
    link.href = res.tracker_url || "https://123resume.de/resumes?tab=job-tracker";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "View in tracker";
    result.append(line, link);
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Generate a cover letter for the current page with the selected resume
// ---------------------------------------------------------------------------
let lastLetter = { text: "", title: "" };

async function generateCoverLetter() {
  const resumeId = $("resume").value;
  const result = $("cover-result");
  const btn = $("cover");
  if (!resumeId) {
    result.className = "result err";
    result.textContent = "Pick a resume first.";
    return;
  }
  btn.disabled = true;
  $("cover-out").hidden = true;
  result.className = "result";
  result.textContent = "Reading page & writing your cover letter… keep this open.";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      result.className = "result err";
      result.textContent = "No active tab to read.";
      return;
    }
    let page;
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabPageText });
      page = out?.[0]?.result;
    } catch {
      result.className = "result err";
      result.textContent = "Can't read this page. Open the job posting and try again.";
      return;
    }
    if (!page || !page.text || page.text.length < 40) {
      result.className = "result err";
      result.textContent = "Couldn't find any job text on this page.";
      return;
    }
    const res = await send({
      type: "cover-letter",
      resume_id: resumeId,
      title: page.title,
      description: page.text,
      output_language: $("cl-lang").value,
    });
    if (!res?.ok || !res.cover_letter) {
      result.className = "result err";
      result.textContent = res?.error ? String(res.error) : "Could not generate the cover letter. Try again.";
      return;
    }
    lastLetter = { text: res.cover_letter, title: res.job_title || page.title || "Cover Letter" };
    $("cover-text").value = lastLetter.text;
    $("cover-out").hidden = false;
    result.className = "result ok";
    result.textContent = "Cover letter ready — review and download.";
  } finally {
    btn.disabled = false;
  }
}

function downloadLetter() {
  if (!lastLetter.text) return;
  const safe =
    (lastLetter.title || "Cover Letter").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "Cover Letter";
  const blob = new Blob([lastLetter.text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cover Letter - ${safe}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------------

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
$("save").addEventListener("click", () => saveCurrentJob("saved"));
$("cover").addEventListener("click", generateCoverLetter);
$("cover-download").addEventListener("click", downloadLetter);

render();
