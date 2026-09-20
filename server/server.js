import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_OWNER = 'RA415428';
const GITHUB_APP_REPO = 'Roxfollowapp';
const GITHUB_WEBSITE_REPO = 'Rox-follow-website';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const PUBLISHED_FILE = 'server-data/published.json';

app.use(cors());
app.use(express.json());

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Rox-Follow-Website'
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  return headers;
}

async function github(pathname, options = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured.');
  }

  const response = await fetch(
    `https://api.github.com${pathname}`,
    {
      ...options,
      headers: {
        ...githubHeaders(),
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `GitHub API error ${response.status}`
    );
  }

  return data;
}

async function getPublishedFile() {
  try {
    const data = await github(
      `/repos/${GITHUB_OWNER}/${GITHUB_WEBSITE_REPO}/contents/${PUBLISHED_FILE}`
    );

    const content = Buffer.from(
      String(data.content || '').replace(/\n/g, ''),
      'base64'
    ).toString('utf8');

    return {
      data: JSON.parse(content),
      sha: data.sha
    };
  } catch (error) {
    if (
      error.message.includes('Not Found') ||
      error.message.includes('404')
    ) {
      return null;
    }

    throw error;
  }
}

async function readPublished() {
  const file = await getPublishedFile();
  return file ? file.data : null;
}

async function savePublished(data) {
  const existing = await getPublishedFile();

  const content = Buffer.from(
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  ).toString('base64');

  const body = {
    message: `Update published APK: ${data.tagName}`,
    content
  };

  if (existing?.sha) {
    body.sha = existing.sha;
  }

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_WEBSITE_REPO}/contents/${PUBLISHED_FILE}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
}

async function deletePublished() {
  const existing = await getPublishedFile();

  if (!existing) {
    return;
  }

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_WEBSITE_REPO}/contents/${PUBLISHED_FILE}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Unpublish APK from website',
        sha: existing.sha
      })
    }
  );
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
      `/repos/${GITHUB_OWNER}/${GITHUB_APP_REPO}/releases?per_page=30`
    );

    const published = await readPublished();

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
      published
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
      `/repos/${GITHUB_OWNER}/${GITHUB_APP_REPO}/releases?per_page=100`
    );

    const release = releases.find(
      (item) => String(item.id) === String(releaseId)
    );

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
  try {
    const published = await readPublished();

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

app.listen(PORT, () => {
  console.log(`ROX FOLLOW Website API running on port ${PORT}`);
});
