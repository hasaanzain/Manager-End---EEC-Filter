const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch'); // for GitHub API calls

const app = express();
const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 3000;

// serve index.html (put it in same folder or adjust path)
app.use(express.static(__dirname));

app.post('/upload', upload.single('csvFile'), async (req, res) => {
  const password = req.body.password;
  const file = req.file;

  if (!file || !password) {
    return res.status(400).send('Incomplete Submission');
  }

  if (password !== 'tyler2025') {
    // delete temporary file
    fs.unlinkSync(file.path);
    return res.status(401).send('Wrong Password');
  }

  try {
    // read file contents
    const content = fs.readFileSync(file.path, 'utf8');

    // choose a filename, e.g. timestamp-based
    const fileName = `schedule_${Date.now()}.csv`;

    await uploadToGitHub({
      path: `data/${fileName}`,
      content,
      message: `Add schedule file ${fileName}`
    });

    fs.unlinkSync(file.path);
    res.status(200).send('Upload successful');
  } catch (err) {
    console.error(err);
    if (file) fs.unlinkSync(file.path);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// GitHub upload function
async function uploadToGitHub({ path, content, message }) {
  const owner = 'hasaanzain';
  const repo = 'Eataly-Team-Schedule-Filtering-Tool';
  const branch = 'main'; // adjust if needed
  const token = process.env.GITHUB_TOKEN; // store a PAT in env var

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub upload failed: ${response.status} ${text}`);
  }
}
