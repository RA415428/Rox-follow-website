import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_OWNER = 'RA415428';
const GITHUB_REPO = 'Roxfollowapp';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const DATA_DIR = path.join(process.cwd(), 'server-data');
const DATA_FILE = path.join(DATA_DIR, 'published.json');

app.use(cors());
app.use(express.json());

function readPublished() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function savePublished(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function github(pathname) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Rox-Follow-Website'
  };

  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com${pathname}`, { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `GitHub API error ${response.status}`);
  }

  return data;
}

function adminRequired(req, res, next) {
  const password = req.headers['x-admin-password'];

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  next();
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'ROX FOLLOW Website API'
  });
});

app.get('/api/releases', adminRequired, async (req, res) => {
  try {
    const releases = await github(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=30`
    );

    const result = releases.map((release) => ({
      id: release.id,
      tagName: release.tag_name,
      name: release.name || release.tag_name,
      publishedAt: release.published_at,
      draft: release.draft,
      prerelease: release.prerelease,
      htmlUrl: release.html_url,
      assets: release.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        size: asset.size,
        downloadUrl: asset.browser_download_url,
        contentType: asset.content_type
      }))
    }));

    res.json({
      success: true,
      releases: result,
      published: readPublished()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/publish', adminRequired, async (req, res) => {
  try {
    const { releaseId, assetId } = req.body || {};

    if (!releaseId || !assetId) {
      return res.status(400).json({
        success: false,
        error: 'Release ID and APK asset ID are required.'
      });
    }

    const releases = await github(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=100`
    );

    const release = releases.find((item) => String(item.id) === String(releaseId));

    if (!release) {
      return res.status(404).json({
        success: false,
        error: 'Release not found.'
      });
    }

    const asset = release.assets.find(
      (item) => String(item.id) === String(assetId)
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Release asset not found.'
      });
    }

    if (!asset.name.toLowerCase().endsWith('.apk')) {
      return res.status(400).json({
        success: false,
        error: 'Selected asset is not an APK.'
      });
    }

    const published = {
      releaseId: release.id,
      tagName: release.tag_name,
      releaseName: release.name || release.tag_name,
      assetId: asset.id,
      fileName: asset.name,
      fileSize: asset.size,
      downloadUrl: asset.browser_download_url,
      releaseUrl: release.html_url,
      publishedAt: new Date().toISOString()
    };

    savePublished(published);

    res.json({
      success: true,
      published
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/unpublish', adminRequired, (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);

    res.json({
      success: true,
      published: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/public/apk', (req, res) => {
  res.json({
    success: true,
    published: readPublished()
  });
});

app.listen(PORT, () => {
  console.log(`ROX FOLLOW Website API running on port ${PORT}`);
});
