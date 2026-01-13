# Job Application Submission System

A **Node.js + Express** application for handling job applications.  
Applicants can submit their details and resumes securely. The system validates inputs using **Google reCAPTCHA**, scans uploaded resumes for malicious content, stores submissions in a CSV file, and automatically emails both the applicant and HR with confirmation and attachments.

---

## 🚀 Features

- 📂 **Resume Upload** (max 2MB, PDF/DOCX supported)  
- 🔍 **File Security Check** (detects malicious scripts inside resumes)  
- 🗜 **Automatic ZIP Compression** of uploaded resumes before sending  
- 🤖 **Google reCAPTCHA Validation** for spam prevention  
- 📧 **Email Notifications**:
  - Applicant receives confirmation  
  - HR receives applicant details and compressed resume  
- 📝 **Submission Logging** in `submissions.csv`  
- 🌐 Serves static files from `public/` and `uploads/`

---

## 📦 Tech Stack

- **Node.js** (Backend)  
- **Express.js** (Server framework)  
- **Multer** (File uploads)  
- **Nodemailer** (Email sending)  
- **Archiver** (ZIP compression)  
- **Mammoth & pdf-parse** (File content scanning)  
- **CSV-Write-Stream** (CSV logging)  
- **Axios** (reCAPTCHA verification)

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/job-application-system.git
   cd job-application-system

├── Server.js         # Main server file
├── submissions.csv   # Stores applicant submissions
├── uploads/          # Uploaded resumes
├── public/           # Frontend static files (HTML/CSS/JS)

