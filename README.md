<div align="center">

# 📄 123Resume

### The free, AI-powered, ATS-friendly resume builder

Build a polished resume in minutes — with AI scoring, one-click rewrites, resume-to-job matching, and one-click translation into 7 languages.

[![Live Demo](https://img.shields.io/badge/Live_Demo-123resume.de-2563eb?style=for-the-badge)](https://123resume.de)
&nbsp;
[![License](https://img.shields.io/badge/License-see_below-lightgrey?style=for-the-badge)](#-license)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Django](https://img.shields.io/badge/Django-REST-092E20?logo=django&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

**If this project is useful to you, please consider giving it a ⭐ — it really helps!**

</div>

---

## ✨ Why 123Resume?

Most resume builders lock the good stuff behind a paywall. 123Resume is a **full-stack, open** resume builder with a guided multi-step editor, a live preview, and a genuinely useful set of **AI features** — all producing clean, **ATS-friendly** PDFs.

## 🤖 AI features

Powered by an LLM API (DeepSeek, OpenAI-compatible):

- **📊 AI resume scoring** — rate your resume against an ATS-style rubric with actionable feedback
- **✍️ One-click "Improve"** — rewrite your summary, role descriptions and bullets; accept or reject each change
- **📥 Smart resume import** — upload a PDF/DOCX and it's parsed into structured, editable fields
- **🎯 Resume ↔ job matching** — paste a job ad, get a match score plus tailored suggestions
- **📝 Cover-letter generation** — draft a cover letter from your resume and the job
- **🌍 One-click translation** — translate your whole resume (or chosen sections) into **7 languages**: English, German, Spanish, French, Italian, Portuguese, Turkish — with localized section headings
- **💬 Resume assistant** — a built-in chat helper for wording and job-search questions

## 🚀 Core features

- 🧭 **Guided multi-step editor** with a **live preview** as you type
- 🎨 **8 templates** — Modern, Classic, Creative, Minimal, LaTeX, StarRover, SlateCopper, Prism
- 🖨️ **High-quality PDF export**
- 🔀 **Drag-and-drop** section reordering
- 🗂️ **Multiple resumes** — save, duplicate, translate, and manage versions
- 🌐 **Public hosted profile page**, **business card**, and a **job tracker**
- 🇬🇧🇩🇪 **Bilingual UI** (English / German)
- 🔐 **Accounts** — JWT auth, email verification, password reset, social login
- 📱 **Responsive** and mobile-friendly

## 🛠️ Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Hook Form, Zod |
| **Backend** | Django REST Framework, JWT auth, MongoDB (djongo) |
| **AI** | DeepSeek API (OpenAI-compatible) |
| **Infra** | Docker Compose, Nginx, Let's Encrypt, GitHub Actions CI/CD |

## ⚡ Quick start

Requires **Docker**:

```bash
git clone https://github.com/ErfanTagh/123resume.git
cd 123resume
cp .env.example .env          # then fill in the values (see below)
docker compose up -d --build
```

App runs at **http://localhost:5173** · API at **http://localhost:8000**

<details>
<summary>Installing Docker (Ubuntu)</summary>

```bash
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo usermod -aG docker $USER   # then log out and back in
```
</details>

### Environment

Copy `.env.example` to `.env` and fill it in. The essentials:

```bash
SECRET_KEY=change-me                  # any long random string
MONGODB_HOST=mongodb                  # docker service name
MONGODB_NAME=resume_db

DEEPSEEK_API_KEY=sk-...               # optional — AI endpoints return 503 without it

DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com             # SMTP (SendGrid, Gmail, …) for account emails
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
```

See [`.env.example`](.env.example) for the full list (social login, Mailgun, etc.).

## 🧑‍💻 Development

```bash
docker compose up -d --build    # start everything
docker compose down             # stop
```

**Without Docker** (frontend local, API via Vite proxy) — start MongoDB and the backend on port **8000**, then:

```bash
# Backend
cd backend && source venv/bin/activate && python manage.py runserver

# Frontend (separate terminal)
cd frontend/skill-step-form && npm install && npm run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8000` (override with `VITE_BACKEND_URL`).

## 🔌 API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register/` | Sign up |
| `POST` | `/api/auth/login/` | Log in |
| `GET/POST` | `/api/resumes/` | List / create resumes |
| `PUT/DELETE` | `/api/resumes/{id}/` | Update / delete |
| `POST` | `/api/ai/resume-score/` | AI score |
| `POST` | `/api/ai/resume-improve/` | AI rewrite suggestions |
| `POST` | `/api/ai/resume-translate/` | Translate (7 languages) |
| `POST` | `/api/resumes/{id}/match/` | Match resume to a job |

## 📁 Project structure

```
123resume/
├── backend/                 # Django REST API + AI services
├── frontend/
│   └── skill-step-form/     # React app (editor, templates, preview)
├── docker-compose.yml       # local
├── docker-compose.prod.yml  # production
└── README.md
```

## 📦 Deployment

Push to `main` and GitHub Actions deploys to production. Manual:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

## 🧰 Useful commands

```bash
docker compose logs -f backend        # tail logs
docker compose restart                # restart services
docker exec -it resume_backend bash   # shell into the API
docker exec -it resume_mongodb mongosh
```

## 🐞 Troubleshooting

- **Port in use:** `sudo lsof -i :8000` then `kill -9 <PID>`
- **Frontend can't reach backend:** check `http://localhost:8000/api/health/`, then `docker compose restart`
- **AI endpoints return 503:** set `DEEPSEEK_API_KEY` in `.env` and rebuild
- **MongoDB issues:** `docker compose logs mongodb` then `docker compose restart mongodb`

## 📄 License

No open-source license is set yet — all rights reserved by the author. If you'd like to use or contribute to the code, please open an issue or reach out first.

---

<div align="center">

Built with ❤️ by [Erfan Taghvaei](https://github.com/ErfanTagh) · Live at **[123resume.de](https://123resume.de)**

**⭐ Star the repo if you like it!**

</div>
