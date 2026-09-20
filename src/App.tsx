import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishedApk, setPublishedApk] = useState<any>(null);
  const [apkLoading, setApkLoading] = useState(true);

  const API = 'https://rox-follow-website-api.onrender.com';

  useEffect(() => {
    let active = true;

    fetch(`${API}/api/public/apk`)
      .then((response) => response.json())
      .then((data) => {
        if (active && data.success) {
          setPublishedApk(data.published || null);
        }
      })
      .catch(() => {
        if (active) setPublishedApk(null);
      })
      .finally(() => {
        if (active) setApkLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="site">
      <header className="navbar">
        <a href="#home" className="logo">
          <span className="logoMark">R</span>
          <span>ROX <b>FOLLOW</b></span>
        </a>

        <button className="menuBtn" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>

        <nav className={menuOpen ? 'navLinks open' : 'navLinks'}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="/admin.html" className="admin-link">Admin Panel</a><a href="#download" onClick={() => setMenuOpen(false)}>Download</a>
          <a href="#support" onClick={() => setMenuOpen(false)}>Support</a>
        </nav>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="heroGlow glowOne"></div>
          <div className="heroGlow glowTwo"></div>

          <div className="heroContent">
            <div className="badge">🚀 ROX FOLLOW • OFFICIAL APP</div>

            <h1>
              Grow Your Social
              <span>Presence Smarter.</span>
            </h1>

            <p>
              ROX FOLLOW is your simple platform for managing social growth,
              orders, rewards and more — all from one powerful Android app.
            </p>

            <div className="heroButtons">
              <a href="#download" className="primaryBtn">
                Download APK <span>↓</span>
              </a>
              <a href="#features" className="secondaryBtn">
                Explore Features
              </a>
            </div>

            <div className="trustRow">
              <div><strong>⚡</strong><span>Fast & Simple</span></div>
              <div><strong>🔒</strong><span>Secure Platform</span></div>
              <div><strong>📱</strong><span>Android Ready</span></div>
            </div>
          </div>

          <div className="phoneArea">
            <div className="phoneGlow"></div>
            <div className="phone">
              <div className="phoneNotch"></div>
              <div className="phoneScreen">
                <div className="screenTop">
                  <span>ROX FOLLOW</span>
                  <span>•••</span>
                </div>
                <div className="welcome">Welcome back 👋</div>
                <div className="balanceCard">
                  <small>Current Balance</small>
                  <strong>500 <span>COINS</span></strong>
                  <div className="balanceLine"></div>
                  <small>Available rewards</small>
                </div>
                <div className="miniTitle">Quick Actions</div>
                <div className="miniGrid">
                  <div>➕<span>New Order</span></div>
                  <div>🏷️<span>Hashtags</span></div>
                  <div>🪙<span>Rewards</span></div>
                  <div>📋<span>History</span></div>
                </div>
                <div className="screenButton">WATCH AD & EARN</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="sectionHead">
            <span className="eyebrow">WHY ROX FOLLOW</span>
            <h2>Everything you need in one place.</h2>
            <p>Designed to keep your social growth experience simple and convenient.</p>
          </div>

          <div className="featureGrid">
            <div className="featureCard">
              <div className="featureIcon">📦</div>
              <h3>Easy Orders</h3>
              <p>Create and manage your social media orders from a clean, simple interface.</p>
            </div>

            <div className="featureCard">
              <div className="featureIcon">🪙</div>
              <h3>Rewards & Coins</h3>
              <p>Use the in-app reward system and keep track of your available coins.</p>
            </div>

            <div className="featureCard">
              <div className="featureIcon">📊</div>
              <h3>Order Tracking</h3>
              <p>Keep an eye on your orders and their current status in one place.</p>
            </div>

            <div className="featureCard">
              <div className="featureIcon">🔔</div>
              <h3>Notifications</h3>
              <p>Stay updated with important announcements and account notifications.</p>
            </div>

            <div className="featureCard">
              <div className="featureIcon">⚙️</div>
              <h3>Simple Dashboard</h3>
              <p>A straightforward dashboard built for quick access to the tools you use.</p>
            </div>

            <div className="featureCard">
              <div className="featureIcon">🔐</div>
              <h3>Secure Account</h3>
              <p>Your account and app experience are built with security in mind.</p>
            </div>
          </div>
        </section>

        <section id="download" className="downloadSection">
          <div className="downloadCard">
            <div className="downloadIcon">📱</div>
            <div className="downloadText">
              <span className="eyebrow">GET THE APP</span>
              <h2>Download ROX FOLLOW</h2>
              <p>
                {publishedApk
                  ? `Download ${publishedApk.fileName} directly from the official ROX FOLLOW website.`
                  : 'The latest Android APK will appear here when it is published by the administrator.'}
              </p>
              <div className="appMeta">
                <span>Android</span>
                <span>•</span>
                <span>{publishedApk ? publishedApk.tagName : 'Latest Version'}</span>
                <span>•</span>
                <span>APK</span>
                {publishedApk?.fileSize ? (
                  <>
                    <span>•</span>
                    <span>{(publishedApk.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : null}
              </div>
            </div>
            {apkLoading ? (
              <button className="primaryBtn downloadBtn" disabled>
                Checking APK...
              </button>
            ) : publishedApk ? (
              <a
                href={publishedApk.downloadUrl}
                className="primaryBtn downloadBtn"
                download
              >
                Download APK <span>↓</span>
              </a>
            ) : (
              <button className="secondaryBtn downloadBtn" disabled>
                APK Not Published
              </button>
            )}
          </div>
        </section>

        <section className="stepsSection">
          <div className="sectionHead">
            <span className="eyebrow">GET STARTED</span>
            <h2>Install in three simple steps.</h2>
          </div>

          <div className="steps">
            <div className="step">
              <span>01</span>
              <h3>Download</h3>
              <p>Download the latest ROX FOLLOW APK from this website.</p>
            </div>
            <div className="step">
              <span>02</span>
              <h3>Install</h3>
              <p>Open the APK and complete the Android installation process.</p>
            </div>
            <div className="step">
              <span>03</span>
              <h3>Start Using</h3>
              <p>Open ROX FOLLOW and sign in to start using the app.</p>
            </div>
          </div>
        </section>

        <section id="support" className="supportSection">
          <div className="supportBox">
            <div>
              <span className="eyebrow">NEED HELP?</span>
              <h2>We're here to help.</h2>
              <p>Have a question or facing a problem? Contact ROX FOLLOW support.</p>
            </div>

            <div className="supportLinks">
              <a
                href="https://wa.me/919301484735"
                target="_blank"
                rel="noreferrer"
                className="supportBtn"
              >
                <span>💬</span>
                <div>
                  <small>WhatsApp Support</small>
                  <strong>9301484735</strong>
                </div>
              </a>

              <a href="mailto:roxfollowsupport@gmail.com" className="supportBtn">
                <span>✉️</span>
                <div>
                  <small>Email Support</small>
                  <strong>roxfollowsupport@gmail.com</strong>
                </div>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footerMain">
          <a href="#home" className="logo">
            <span className="logoMark">R</span>
            <span>ROX <b>FOLLOW</b></span>
          </a>
          <p>Simple tools. Better social growth.</p>
        </div>

        <div className="footerBottom">
          <span>© {new Date().getFullYear()} ROX FOLLOW. All rights reserved.</span>
          <div>
            <a href="#home">Privacy</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
