import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Project, Platforms } from './types';
import { loadProjects, saveProject, buildApp } from './lib/storage';

// تعريف المنصات المدعومة (ثلاث منصات)
const platforms: { key: keyof Platforms; label: string; file: string; icon: string }[] = [
  { key: 'windows', label: 'Windows', file: 'EXE', icon: '⊞' },
  { key: 'android', label: 'Android', file: 'APK', icon: '◈' },
  { key: 'macos', label: 'macOS', file: 'DMG', icon: '●' },
];

// التحقق من صحة الرابط
const validUrl = (value: string) => {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol); } catch { return false; }
};

function App() {
  // حالات التطبيق
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [chosen, setChosen] = useState<Platforms>({ windows: true, android: true, macos: true });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // تحميل المشاريع عند بدء التطبيق
  useEffect(() => { void load(); }, []);
  async function load() { 
    const data = await loadProjects(); 
    setProjects(data); 
    setLoading(false); 
  }

  // ✅ معالجة رابط المعاينة /app/:id
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/app/')) {
      const id = path.split('/app/')[1];
      if (id) {
        loadProjects().then(projects => {
          const found = projects.find(p => p.id.startsWith(id));
          if (found) {
            // عرض الموقع داخل iframe
            document.body.innerHTML = `
              <div style="width:100vw;height:100vh;margin:0;padding:0;overflow:hidden;">
                <iframe src="${found.url}" style="width:100%;height:100%;border:none;" />
              </div>
            `;
          } else {
            document.body.innerHTML = `<p style="text-align:center;margin-top:50px;">❌ لم يتم العثور على التطبيق</p>`;
          }
        });
      }
    }
  }, []);

  // ✅ إنشاء رابط المشاركة (يعمل محلياً وعبر الإنترنت)
  function shareLink(p: Project) { 
    return `${window.location.origin}/app/${p.id.slice(0, 8)}`; 
  }

  // فتح نتيجة التطبيق بعد الإنشاء
  async function openResult(p: Project) {
    setSelected(p); 
    setMessage('');
    // إنشاء باركود QR
    const data = await QRCode.toDataURL(shareLink(p), { 
      width: 260, 
      margin: 2, 
      color: { dark: '#07111f', light: '#ffffff' } 
    });
    setQr(data);
  }

  // إنشاء تطبيق جديد
  async function create(e: FormEvent) {
    e.preventDefault(); 
    setError(''); 
    setMessage('');
    
    const target = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    if (!name.trim()) return setError('اكتب اسم التطبيق أولاً.');
    if (!validUrl(target)) return setError('أدخل رابطاً صحيحاً مثل example.com');
    if (!Object.values(chosen).some(Boolean)) return setError('اختر منصة واحدة على الأقل.');
    
    setSaving(true);
    const p = await saveProject({ name: name.trim(), url: target, platforms: chosen });
    setSaving(false);
    setProjects(x => [p, ...x]);
    await openResult(p);
    setMessage('تم تجهيز رابط التطبيق والحزم بنجاح.');
  }

  // ✅ دالة تحميل التطبيق (للمنصات الثلاث)
  async function downloadPackage(p: Project, key: string) {
    const platform = platforms.find(x => x.key === key)!;
    
    try {
      setBuilding(true);
      setMessage(`⏳ جاري بناء تطبيق ${platform.label}...`);
      setError('');
      
      // ✅ محاولة بناء التطبيق عبر الخادم
      const blob = await buildApp(p.url, p.name, key);
      
      // تحديد امتداد الملف حسب المنصة
      const extensions = {
        windows: 'exe',
        android: 'apk',
        macos: 'dmg'
      };
      
      const safe = p.name.replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, '-').toLowerCase();
      const ext = extensions[key as keyof typeof extensions] || 'zip';
      
      // تحميل الملف
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${safe}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      
      setMessage(`✅ تم تحميل تطبيق ${platform.label} بنجاح!`);
    } catch (err) {
      console.error('Build error:', err);
      
      // ❌ إذا فشل البناء، استخدم ZIP كبديل
      setMessage(`⚠️ فشل بناء التطبيق، جارٍ تحميل حزمة الإعدادات...`);
      
      try {
        const zip = new JSZip();
        const safe = p.name.replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, '-').toLowerCase();
        zip.file('app-config.json', JSON.stringify({ 
          name: p.name, 
          url: p.url, 
          platform: platform.label, 
          shareUrl: shareLink(p), 
          generatedAt: new Date().toISOString() 
        }, null, 2));
        zip.file('README.txt', `تطبيق ${p.name}\n\nالرابط: ${p.url}\nالمنصة: ${platform.label}\n\nهذه الحزمة تحتوي إعدادات التطبيق الجاهزة للبناء على ${platform.label}.`);
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${safe}-${key}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setMessage(`✅ تم تنزيل حزمة إعدادات ${platform.label}`);
      } catch (zipError) {
        setError('❌ فشل التحميل: ' + (zipError as Error).message);
      }
    } finally {
      setBuilding(false);
    }
  }

  // نسخ الرابط
  function copy() { 
    if (!selected) return; 
    void navigator.clipboard?.writeText(shareLink(selected)); 
    setMessage('تم نسخ الرابط العادي.'); 
  }
  
  // تنزيل الباركود
  function downloadQr() { 
    if (!qr) return; 
    const a = document.createElement('a'); 
    a.href = qr; 
    a.download = 'wraply-qr-code.png'; 
    a.click(); 
  }

  // واجهة التطبيق
  return (
    <div className="shell">
      <header>
        <div className="brand"><span className="logo">W</span><div><b>wraply</b><small>APP STUDIO</small></div></div>
        <nav>
          <a className="active" href="#create">إنشاء تطبيق</a>
          <a href="#projects">تطبيقاتي <i>{projects.length}</i></a>
          <a href="#how">كيف يعمل؟</a>
        </nav>
        <button className="outline" onClick={() => setMessage('نحن هنا لمساعدتك في تجهيز تطبيقك.')}>؟ المساعدة</button>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">● منصة تحويل المواقع إلى تطبيقات</span>
          <h1>رابط واحد.<br/><em>تطبيقك جاهز.</em></h1>
          <p>حوّل أي موقع إلكتروني إلى تجربة تطبيق كاملة بإطار احترافي، رابط مشاركة، وباركود قابل للمسح.</p>
          <div className="trust">◉ ◉ ◉ <span>موثوق من أكثر من <b>2,400</b> صانع تطبيق</span></div>
        </div>
        <div className="device">
          <div className="device-top"><span>9:41</span><span>● ● ●</span></div>
          <div className="fake-screen">
            <div className="fake-nav"><span className="tiny-logo">W</span><span>موقعك داخل التطبيق</span><b>•••</b></div>
            <div className="fake-content"><span className="loading-line"></span><span className="loading-line short"></span><div className="fake-box"></div><span className="loading-line"></span></div>
          </div>
        </div>
      </section>

      <main>
        <section className="builder" id="create">
          <div className="heading"><div><small>الخطوة 01</small><h2>ابدأ من رابط موقعك</h2></div><span className="safe">⌁ سريع وآمن</span></div>
          <form onSubmit={create}>
            <div className="fields">
              <label>اسم التطبيق<input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: متجري الإلكتروني"/></label>
              <label>رابط الموقع<div className="url"><span>↗</span><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourwebsite.com" dir="ltr"/></div></label>
            </div>
            <div className="bottom">
              <div>
                <label className="platform-label">اختر المنصات <small>يمكنك اختيار أكثر من منصة</small></label>
                <div className="options">
                  {platforms.map(p => (
                    <button type="button" key={p.key} className={chosen[p.key] ? 'picked' : ''} onClick={() => setChosen(x => ({ ...x, [p.key]: !x[p.key] }))}>
                      <strong>{p.icon}</strong><span><b>{p.label}</b><small>ملف {p.file}</small></span><i>{chosen[p.key] ? '✓' : ''}</i>
                    </button>
                  ))}
                </div>
              </div>
              <button className="primary" disabled={saving}>{saving ? 'جارٍ التجهيز...' : <>أنشئ تطبيقي <b>←</b></>}</button>
            </div>
            {error && <p className="error">{error}</p>}
            {message && <p className="message">{message}</p>}
          </form>
        </section>

        {selected && (
          <section className="result">
            <div className="result-head">
              <div className="success">✓</div>
              <div><small>تم التجهيز بنجاح</small><h2>تطبيق {selected.name} جاهز</h2><p>امسح الباركود أو انسخ الرابط، ثم نزّل التطبيق المناسب.</p></div>
              <button className="close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="result-content">
              <div className="qr-box">
                <img src={qr} alt="باركود رابط التطبيق"/>
                <div><b>باركود التطبيق</b><small>قابل للمسح من أي هاتف</small></div>
                <button onClick={downloadQr}>تنزيل صورة الباركود</button>
              </div>
              <div className="result-side">
                <label>رابط التطبيق العادي<div className="share"><input readOnly value={shareLink(selected)} dir="ltr"/><button onClick={copy}>نسخ</button></div></label>
                <span className="hint">يمكنك لصق هذا الرابط في موقعك أو إرساله للعملاء.</span>
                <div className="downloads">
                  {platforms.filter(p => selected.platforms[p.key]).map(p => (
                    <button 
                      key={p.key} 
                      onClick={() => downloadPackage(selected, p.key)}
                      disabled={building}
                    >
                      <strong>{p.icon}</strong>
                      <span>
                        <b>{p.label}</b>
                        <small>{building ? 'جاري البناء...' : `تحميل ${p.file}`}</small>
                      </span>
                      <i>{building ? '⏳' : '↓'}</i>
                    </button>
                  ))}
                </div>
                {building && (
                  <div className="build-status">
                    <span className="spinner">⏳</span>
                    <span>جاري بناء التطبيق... قد يستغرق 1-2 دقيقة</span>
                  </div>
                )}
              </div>
            </div>
            <div className="app-preview">
              <div className="preview-label">معاينة داخل إطار التطبيق</div>
              <div className="frame">
                <div className="frame-bar"><span>● ● ●</span><b>{selected.name}</b><span>⋮</span></div>
                <iframe title="معاينة الموقع داخل إطار التطبيق" src={selected.url}/>
              </div>
            </div>
          </section>
        )}

        <section className="projects" id="projects">
          <div className="section-heading"><div><small>مساحة العمل</small><h2>تطبيقاتي الأخيرة</h2></div><a href="#create">+ إنشاء تطبيق جديد</a></div>
          {loading ? <div className="empty">جارٍ تحميل تطبيقاتك...</div>
           : projects.length === 0 ? <div className="empty"><b>لم تنشئ أي تطبيق بعد</b><span>ابدأ بإضافة رابط موقعك في الأعلى</span></div>
           : <div className="table">
              <div className="thead"><span>التطبيق</span><span>الرابط</span><span>المنصات</span><span>الحالة</span><span></span></div>
              {projects.map(p => (
                <div className="row" key={p.id}>
                  <div className="app-name"><span>W</span><b>{p.name}<small>{new Date(p.created_at).toLocaleDateString('ar-EG')}</small></b></div>
                  <span className="site">{p.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
                  <span className="icons">{platforms.filter(x => p.platforms[x.key]).map(x => <i key={x.key}>{x.icon}</i>)}</span>
                  <span className="ready">● جاهز</span>
                  <button onClick={() => void openResult(p)}>روابط التنزيل ←</button>
                </div>
              ))}
            </div>}
        </section>

        <section className="how" id="how">
          <div><small>بسيط كما ينبغي</small><h2>من الرابط إلى التطبيق<br/><em>في ثلاث خطوات.</em></h2></div>
          <div className="steps">
            <div><b>01</b><h3>أدخل الرابط</h3><p>أضف اسم تطبيقك ورابط موقعك.</p></div>
            <div><b>02</b><h3>اختر منصاتك</h3><p>حدد الأجهزة التي تريد دعمها.</p></div>
            <div><b>03</b><h3>شارك وانطلق</h3><p>استخدم الرابط أو امسح الباركود.</p></div>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand"><span className="logo">W</span><b>wraply</b></div>
        <span>حوّل فكرتك إلى تجربة، ببساطة.</span>
        <span>© Wraply Studio</span>
      </footer>
    </div>
  );
}

export default App;
