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
const GITHUB_CONTENTS_PATH = 'server-data/published.json';

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

async function readPublishedRemote() {
  if (!GITHUB_TOKEN) return readPublished();

  try {
    const data = await github(`/repos/${GITHUB_OWNER}/Rox-follow-website/contents/${GITHUB_CONTENTS_PATH}`);
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  } catch {
    return readPublished();
  }
}

function readPublishedLegacy() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function savePublished(data) {
  if (!GITHUB_TOKEN) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return;
  }

  const apiPath = `/repos/${GITHUB_OWNER}/Rox-follow-website/contents/${GITHUB_CONTENTS_PATH}`;
  let sha;

  try {
    const existing = await github(apiPath);
    sha = existing.sha;
  } catch {}

  const body = {
    message: 'Update published APK',
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
  };
  if (sha) body.sha = sha;

  const response = await fetch(`https://api.github.com${apiPath}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Rox-Follow-Website',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to save published APK');
}

async function deletePublished() {
  if (!GITHUB_TOKEN) {
    await deletePublished();
    return;
  }

  const apiPath = `/repos/${GITHUB_OWNER}/Rox-follow-website/contents/${GITHUB_CONTENTS_PATH}`;
  let existing;
  try {
    existing = await github(apiPath);
  } catch {
    return;
  }

  const response = await fetch(`https://api.github.com${apiPath}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Rox-Follow-Website',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Unpublish APK',
      sha: existing.sha
    })
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.message || 'Failed to unpublish APK');
  }
}


  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

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
      published: await readPublishedRemote()
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

    await savePublished(published);

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

app.post('/api/unpublish', adminRequired, async (req, res) => {
  try {
    await deletePublished();

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

app.get('/api/public/apk', async (req, res) => {
  res.json({
    success: true,
    published: await readPublishedRemote()
  });
});

app.listen(PORT, () => {
  console.log(`ROX FOLLOW Website API running on port ${PORT}`);
});
