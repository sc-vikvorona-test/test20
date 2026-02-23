const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const app = express();
const PORT = 3333;
const CLAUDE_DIR = path.join(os.homedir(), '.claude');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/stats', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(CLAUDE_DIR, 'stats-cache.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/projects', (req, res) => {
  try {
    const projectsDir = path.join(CLAUDE_DIR, 'projects');
    const entries = fs.readdirSync(projectsDir);
    const projects = [];

    for (const entry of entries) {
      const indexPath = path.join(projectsDir, entry, 'sessions-index.json');
      if (!fs.existsSync(indexPath)) continue;

      try {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const sessions = index.entries || [];
        if (sessions.length === 0) continue;

        const name = entry
          .replace(/^-Users-[^-]+-/, '')
          .replace(/^-/, '')
          .replace(/-/g, '/')
          .replace(/^Projects\//, '');

        const totalMessages = sessions.reduce((s, e) => s + (e.messageCount || 0), 0);
        const lastModified = sessions.reduce((max, e) => {
          const t = new Date(e.modified).getTime();
          return t > max ? t : max;
        }, 0);
        const firstCreated = sessions.reduce((min, e) => {
          const t = new Date(e.created).getTime();
          return t < min ? t : min;
        }, Infinity);

        projects.push({
          id: entry,
          name,
          sessionCount: sessions.length,
          totalMessages,
          lastActive: lastModified ? new Date(lastModified).toISOString() : null,
          firstActive: firstCreated < Infinity ? new Date(firstCreated).toISOString() : null,
          recentSessions: sessions
            .sort((a, b) => new Date(b.modified) - new Date(a.modified))
            .slice(0, 5)
            .map(s => ({
              sessionId: s.sessionId,
              firstPrompt: s.firstPrompt,
              summary: s.summary,
              messageCount: s.messageCount,
              created: s.created,
              modified: s.modified,
              gitBranch: s.gitBranch,
            })),
        });
      } catch {
        // skip malformed
      }
    }

    projects.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const historyPath = path.join(CLAUDE_DIR, 'history.jsonl');
    const lines = [];
    const rl = readline.createInterface({ input: fs.createReadStream(historyPath) });
    for await (const line of rl) {
      if (line.trim()) {
        try { lines.push(JSON.parse(line)); } catch {}
      }
    }
    const recent = lines
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 200)
      .map(l => ({
        display: l.display,
        timestamp: l.timestamp,
        project: l.project ? path.basename(l.project) : null,
      }));
    res.json(recent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Claude Stats running at http://localhost:${PORT}`);
});
