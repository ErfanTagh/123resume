# 123Resume

A resume builder with a multi-step form. Live at [123resume.de](https://123resume.de).

## Quick start

```bash
./START_ALL_DOCKER.sh
```

Runs at http://localhost:5173

Requires Docker:

```bash
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Log out and back in after adding yourself to the docker group.

## Features

- Multi-step form for building resumes
- Six templates: Modern, Classic, Creative, Minimal, LaTeX, StarRover
- Live preview while you edit
- Quality scoring (completeness, clarity, formatting)
- Add responsibilities and skills one at a time
- Drag-and-drop section reordering
- PDF export
- User accounts with email verification
- Password reset via email
- Save multiple resume versions
- Mobile-friendly

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind, shadcn/ui, React Hook Form, Zod

**Backend:** Django REST Framework, JWT auth, MongoDB

**Deployment:** Docker Compose, Nginx, Let's Encrypt, GitHub Actions

## Development

With Docker:

```bash
./START_ALL_DOCKER.sh    # start
docker compose down      # stop
```

Without Docker (frontend on your machine, API via Vite proxy):

- Start MongoDB (or point `MONGODB_CONNECTION_STRING` in root `.env` at a running instance), then run the backend on **port 8000**.
- The dev server proxies `/api` to **`http://127.0.0.1:8000`** by default. Override with `VITE_BACKEND_URL` if your API runs elsewhere.

```bash
# Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Frontend (separate terminal)
cd frontend/skill-step-form
npm install
npm run dev
```

## Usage

1. Sign up and verify email
2. Create Resume
3. Fill in personal info, work experience, education, etc.
4. Choose a template and reorder sections if needed
5. Preview updates as you type
6. Export to PDF when finished

Resumes are saved; you can edit or create new ones anytime.

## API

**Frontend:** http://localhost:5173  
**Backend:** http://localhost:8000

Main routes:

- `POST /api/auth/register/` – sign up
- `POST /api/auth/login/` – login
- `GET /api/resumes/` – list resumes
- `POST /api/resumes/` – create
- `PUT /api/resumes/{id}/` – update
- `DELETE /api/resumes/{id}/` – delete

## Useful commands

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart

# rebuild after code changes
docker compose down && docker compose build && docker compose up -d

docker exec -it resume_backend bash
docker exec -it resume_mongodb mongosh
```

## Project structure

```
resume-app/
├── backend/              # Django REST API
├── frontend/
│   └── skill-step-form/  # React app
├── docker-compose.yml
├── START_ALL_DOCKER.sh
└── README.md
```

## Email setup

**SendGrid (recommended):**

1. Create account at sendgrid.com
2. Create API key (Settings → API Keys)
3. Verify sender email (Settings → Sender Authentication)
4. Turn off click tracking (Settings → Tracking) to avoid SSL issues with verification links
5. Add to `.env`:

   ```
   SENDGRID_API_KEY=SG.your_key
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

**SMTP fallback (e.g. Gmail):**

```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

Gmail has sending limits; SendGrid is better for production.

## Deployment

Push to main and GitHub Actions deploys to 123resume.de.

Manual deploy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

## Troubleshooting

**Port in use:**

```bash
sudo lsof -i :8000
kill -9 <PID>
```

**Docker won't start:** Ensure docker service is running and your user is in the docker group. Log out and back in after adding yourself.

**Frontend can't reach backend:** Check http://localhost:8000/api/health/ and run `docker compose restart` if needed.

**MongoDB issues:** `docker compose logs mongodb` then `docker compose restart mongodb`
