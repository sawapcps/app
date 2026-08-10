// server/server.js
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// تخزين مؤقت (بدون قاعدة بيانات)
// ============================================
let projects = [];

// ============================================
// API: جلب المشاريع
// ============================================
app.get('/api/wrapper_projects', (req, res) => {
  res.json(projects);
});

// ============================================
// API: إنشاء مشروع
// ============================================
app.post('/api/wrapper_projects', (req, res) => {
  const { id, name, url, platforms, status, created_at } = req.body;
  const project = { id, name, url, platforms, status, created_at };
  projects.unshift(project);
  res.json({ success: true, project });
});

// ============================================
// API: بناء التطبيق
// ============================================
app.post('/api/build', async (req, res) => {
  const { url, name, platform } = req.body;
  
  console.log(`🔨 بناء: ${name} (${platform}) من ${url}`);
  
  try {
    const buildId = Date.now().toString();
    const buildDir = path.join(__dirname, 'builds', buildId);
    fs.mkdirSync(buildDir, { recursive: true });
    
    let filePath;
    let fileName;
    
    switch(platform) {
      case 'windows':
        await execCommand(`npx nativefier "${url}" --name "${name}" --platform windows --out-dir "${buildDir}" --overwrite`);
        const exeFile = fs.readdirSync(buildDir).find(f => f.endsWith('.exe'));
        if (!exeFile) throw new Error('لم يتم العثور على EXE');
        filePath = path.join(buildDir, exeFile);
        fileName = `${name.replace(/\s/g, '-')}-windows.exe`;
        break;
        
      case 'macos':
        await execCommand(`npx nativefier "${url}" --name "${name}" --platform mac --out-dir "${buildDir}" --overwrite`);
        const dmgFile = fs.readdirSync(buildDir).find(f => f.endsWith('.dmg') || f.endsWith('.app'));
        if (!dmgFile) throw new Error('لم يتم العثور على DMG');
        filePath = path.join(buildDir, dmgFile);
        fileName = `${name.replace(/\s/g, '-')}-macos.dmg`;
        break;
        
      case 'android':
        // استخدام PWA Builder API
        const response = await fetch('https://www.pwabuilder.com/api/build/android', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, name })
        });
        const buffer = await response.buffer();
        filePath = path.join(buildDir, 'app.apk');
        fs.writeFileSync(filePath, buffer);
        fileName = `${name.replace(/\s/g, '-')}-android.apk`;
        break;
    }
    
    res.download(filePath, fileName);
    
    setTimeout(() => {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }, 300000);
    
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({ error: error.message });
  }
});

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});