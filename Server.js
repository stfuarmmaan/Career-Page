const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-write-stream');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const archiver = require('archiver');
const app = express();

const PORT = 3000;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB
 
// --- Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ashmitgautam8284.12e@gmail.com',
    pass: 'ygbotwnspozhysdo'
  }
});

// --- ZIP Function
async function zipResume(originalPath) {
  const zipPath = originalPath + '.zip';
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', err => reject(err));
    archive.pipe(output);
    archive.file(originalPath, { name: path.basename(originalPath) });
    archive.finalize();
  });
}

// --- Detect Malicious Script
async function isMalicious(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let content = "";

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    content = data.text;
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    content = result.value;
  }

  const lower = content.toLowerCase();
  const suspicious = ['<script', '<iframe', 'onerror', 'onload', 'eval('];

  return suspicious.some(keyword => lower.includes(keyword));
}

// --- Send Emails (ASYNC, after success shown)
async function sendEmails(applicantData, resumeRelativePath) {
  const { name, email, mobile, linkedin, job } = applicantData;
  const resumeFullPath = path.join(__dirname, resumeRelativePath);
  const zippedPath = await zipResume(resumeFullPath);

  // Applicant Mail
  const applicantMailOptions = {
    from: '"Agilus Diagnostics" <ashmitgautam8284.12e@gmail.com>',
    to: email,
    subject: 'Application Received - Agilus Diagnostics',
    html: `<p>Dear ${name},</p>
           <p>Thank you for applying for the <b>${job}</b> role. We have received your application.</p>
           <p>Regards,<br>Agilus HR Team</p>`
  };

  // HR Mail
  const hrMailOptions = {
    from: '"Agilus Bot" <ashmitgautam8284.12e@gmail.com>',
    to: 'togethunter@gmail.com',
    subject: `New Application from ${name} (${job})`,
    html: `
      <h3>New Application</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Mobile:</b> ${mobile}</p>
      <p><b>LinkedIn:</b> <a href="${linkedin}">${linkedin}</a></p>
      <p><b>Job Role:</b> ${job}</p>
      <p><b>Resume:</b> Attached (compressed)</p>`,
    attachments: [
      {
        filename: path.basename(zippedPath),
        path: zippedPath
      }
    ]
  };

  await transporter.sendMail(applicantMailOptions);
  await transporter.sendMail(hrMailOptions);

  // Cleanup
  fs.unlinkSync(resumeFullPath);
  fs.unlinkSync(zippedPath);
}

// --- Form handler (Async, status on frontend first, then background processing)
app.post('/submit', upload.single('resume'), async (req, res) => {
  
  try {
        // ======== QUIZ ELIGIBILITY CHECK ========
    /*const quizData = req.body.quizData ? JSON.parse(req.body.quizData) : null;
    if (!quizData || !quizData.selectedQuestions || !quizData.quizAnswers) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).send({ status: 'error', message: 'Quiz data missing.' });
    }

    // Same question bank as frontend
const CULTURE_QUIZ_QUESTIONS = [
  { question: "How do you handle feedback?", options: [
      { text: "Actively seek and improve", score: { "Team Leader": 2, "Pathologist": 2, "Lab Technician": 1, "Customer Support": 1 } },
      { text: "Accept when needed", score: { "Lab Technician": 1, "Data Entry Operator": 2, "IT Support": 1, "Sales Executive": 2 } },
      { text: "Ignore it", score: {} }
    ]},
  { question: "How do you approach teamwork?", options: [
      { text: "Coordinate & lead", score: { "Team Leader": 2, "Pathologist": 2 } },
      { text: "Assist and collaborate", score: { "Lab Technician": 1, "Customer Support": 2 } },
      { text: "Work alone", score: {} }
    ]},
  { question: "Problem-solving style?", options: [
      { text: "Break into parts and delegate", score: { "Team Leader": 2, "IT Support": 2 } },
      { text: "Ask colleagues for suggestions", score: { "Lab Technician": 1, "Customer Support": 1 } },
      { text: "Wait & see if it resolves", score: {} }
    ]},
  { question: "Interact with customers:", options: [
      { text: "Listen & empathize", score: { "Customer Support": 2, "Sales Executive": 2 } },
      { text: "Give short answers", score: { "Data Entry Operator": 1 } },
      { text: "Avoid interaction", score: {} }
    ]},
  { question: "Response to mistakes?", options: [
      { text: "Acknowledge & correct", score: { "Pathologist": 2, "Lab Technician": 2 } },
      { text: "Pass to others", score: { "Data Entry Operator": 1 } },
      { text: "Ignore", score: {} }
    ]},
  { question: "Under pressure:", options: [
      { text: "Calm & organized", score: { "Team Leader": 2, "Pathologist": 2, "IT Support": 2 } },
      { text: "Stressed but finish work", score: { "Lab Technician": 1, "Customer Support": 1 } },
      { text: "Avoid work", score: {} }
    ]},
  { question: "Motivation:", options: [
      { text: "Achieve targets", score: { "Team Leader": 2, "Sales Executive": 2 } },
      { text: "Finish assigned work", score: { "Data Entry Operator": 2, "Lab Technician": 1 } },
      { text: "Get recognition", score: { "Customer Support": 2 } }
    ]}
];

    let roleScores = {
      "Lab Technician": 0, "Pathologist": 0, "Customer Support": 0,
      "Data Entry Operator": 0, "IT Support": 0, "Sales Executive": 0, "Other": 0
    };

    quizData.selectedQuestions.forEach((qIdx, idx) => {
      const q = CULTURE_QUIZ_QUESTIONS[qIdx];
      const answerIdx = quizData.quizAnswers[idx];
      if (q && q.options[answerIdx]) {
        const scores = q.options[answerIdx].score;
        for (let role in scores) {
          roleScores[role] += scores[role];
        }
      }
    });

    const eligibleRoles = Object.keys(roleScores).filter(r => roleScores[r] >= 3);
    if (!eligibleRoles.includes(req.body.job)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).send({ status: 'error', message: 'You are not eligible for this job role based on quiz results.' });
    }*/

    // ======== END QUIZ CHECK, CONTINUE ORIGINAL LOGIC ========
    const { name, mobile, email, linkedin, job, 'g-recaptcha-response': recaptchaToken } = req.body;

    // Validate reCAPTCHA
    const secret = '6LcbMJUrAAAAABMPTSzes-oe-hqzBhPPPAonsOTV';
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`;
    const captchaRes = await axios.post(verifyURL);
    if (!captchaRes.data.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(200).send({ status: 'error', message: 'Captcha validation failed.' });
    }

    const resumePath = req.file ? `/uploads/${req.file.filename}` : '';
    const fullResumePath = path.join(__dirname, resumePath);

    // Validate file content (server-side)
    if (await isMalicious(fullResumePath)) {
      if (req.file) fs.unlinkSync(fullResumePath);
      return res.status(200).send({ status: 'malicious', message: 'Malicious content detected. Submission rejected.' });
    }

    // Save applicant data to CSV
    const newData = {
      Name: name,
      "Mobile Number": mobile,
      Email: `=HYPERLINK("mailto:${email}", "${email}")`,
      "LinkedIn URL": linkedin ? `=HYPERLINK("${linkedin}", "LinkedIn")` : "",
      "Job Role": job,
      Resume: resumePath
    };

    const csvPath = 'submissions.csv';
    const writer = fs.existsSync(csvPath)
      ? csvWriter({ sendHeaders: false })
      : csvWriter({ headers: Object.keys(newData) });

    writer.pipe(fs.createWriteStream(csvPath, { flags: 'a' }));
    writer.write(newData);
    writer.end();

    // Respond to client FIRST --- success message
    res.status(200).send({ status: 'success', name });

    // Continue background: send emails
    sendEmails({ name, email, mobile, linkedin, job }, `uploads/${req.file.filename}`);

  } catch (err) {
    console.error(err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).send({ status: 'error', message: 'Server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
