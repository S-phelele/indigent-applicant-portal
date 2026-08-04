Indigent Applicant Portal

Tech Stack

Applicant Portal	React + Vite + React Router

Project Structure
```
├── applicant-portal/        # React applicant UI
```
Prerequisites
```bash
Node.js 18+
npm or yarn
```
Setup

Default accounts (from seed):
```bash
Applicant: `john.doe@example.com` / `applicant123`
```

Applicant Portal
```bash
cd applicant-portal
npm install
npm run dev            # http://localhost:5173
```


Application Flow
```bash
Landing → Click "Click here to apply"
Register / Sign in
Step 1 – Applicant Particulars (OTP verification on cell number)
Step 2 – Property Particulars
Step 3 – Household Income
Step 4 – General Information
Step 5 – Documents (upload required docs) → Submit
Track status on applicant dashboard
```

Income Threshold:
```bash
Landing page states: total household income R7 500 or less per month may qualify.  
General form also references R4 200. Both are stored; eligibility logic can be adjusted by municipality.
```

Notes:
```bash
OTP is logged to the server console in development (`demoOtp` also returned in non-production responses).
Document uploads stored under `backend/uploads/<applicationId>/`.
Change `JWT_SECRET` and database credentials before production use.
```
