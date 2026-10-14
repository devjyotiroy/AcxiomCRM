AcxiomCRM:-

AcxiomCRM is a simple web-based CRM (Customer Relationship Management) application. A sales team can use it to manage customers, leads, opportunities, follow-ups and activities. Managers can track the sales pipeline from a dashboard, and admins can manage users and see the audit log.

Why MERN Stack:
The project document was written with ASP.NET Core in mind. I do not have hands-on experience with .NET, so I built this project with the MERN stack, which I know well. All the requirements in the document (authentication, roles, validation, audit log, REST API, dashboard) are independent of the technology.

Tech Stack

Frontend: React (Vite), React Router, Axios, Chart.js, plain CSS
Backend: Node.js, Express
Database: MongoDB Atlas with Mongoose
Security: bcryptjs, JWT, helmet, express-rate-limit, cors

Features
Register, login and logout with password hashing
Password rules and account lockout after repeated failed logins
Three roles: Admin, Manager and Sales Executive, enforced on the server
Customer management with search and duplicate check
Lead management with status workflow and conversion
Opportunity management with pipeline stages
Follow-up scheduling with pending and overdue list
Activity management (call, meeting, email, task)
User and role management (Admin only)
Audit log of logins, creates, updates and deletes (Admin only)
Dashboard with KPI cards and charts
REST API for customers, leads and opportunities

Validation Rules
Name, email and phone are required
Email must be valid and unique
Phone must be a valid 10-digit number and unique
Opportunity amount must be greater than 0
Probability must be between 0 and 100
Expected close date cannot be in the past for an active opportunity
Follow-up date cannot be earlier than today

All of these are checked in the browser and again on the server.

How to Run
Clone the repository.
Set up the server:
bash
cd server
npm install

Create a .env file inside the server folder (use .env.example as a guide):

PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_secret_key_here
CLIENT_URL=http://localhost:5173

Start the server:

bash
npm run dev

The server runs on http://localhost:5000

Set up the client in a new terminal:
bash
cd client
npm install
npm run dev

The client runs on http://localhost:5173