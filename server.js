// ==================================
// BRICK BREAKER BACKEND
// Serves the game files AND stores scores in a SQLite database.
// Needs Node 22.13 or newer. No npm packages required.
// ==================================

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// The most points the game can give: 280 bricks x 10 points.
// Anything higher is a fake score and is rejected.
const MAX_SCORE = 2800;
const MAX_STAGE = 5;


// ==================================
// 1. DATABASE
// ==================================

const db = new DatabaseSync(path.join(__dirname, "scores.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        score      INTEGER NOT NULL,
        stage      INTEGER NOT NULL,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

// "?" are placeholders: the values are passed separately, which blocks SQL injection
const insertScore = db.prepare("INSERT INTO scores (name, score, stage) VALUES (?, ?, ?)");
const getTopScores = db.prepare("SELECT name, score, stage FROM scores ORDER BY score DESC, id ASC LIMIT 10");
const countBetter = db.prepare("SELECT COUNT(*) AS better FROM scores WHERE score > ?");


// ==================================
// 2. HELPERS
// ==================================

function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

// Reads the request body, but refuses anything bigger than 1 KB
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;

            if (body.length > 1024) {
                reject(new Error("too big"));
                req.destroy();
            }
        });

        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

// Allows 10 submissions per minute for each IP address
const recentSubmits = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const times = (recentSubmits.get(ip) || []).filter(t => now - t < 60000);

    times.push(now);
    recentSubmits.set(ip, times);

    return times.length > 10;
}

// Keeps letters, numbers, spaces, _ and - only, max 12 characters
function cleanName(raw) {
    return String(raw)
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .trim()
        .slice(0, 12);
}


// ==================================
// 3. API ROUTES
// ==================================

// GET /api/scores  ->  top 10 list
function handleGetScores(req, res) {
    sendJson(res, 200, getTopScores.all());
}

// POST /api/scores  ->  save one score
async function handlePostScore(req, res) {
    if (isRateLimited(req.socket.remoteAddress)) {
        return sendJson(res, 429, { error: "Too many submissions. Wait a minute." });
    }

    let data;

    try {
        data = JSON.parse(await readBody(req));
    } catch (error) {
        return sendJson(res, 400, { error: "Invalid request." });
    }

    const name = cleanName(data.name ?? "");
    const score = data.score;
    const stage = data.stage;

    if (!name) {
        return sendJson(res, 400, { error: "Please enter a name." });
    }

    if (
        !Number.isInteger(score) || score < 0 || score > MAX_SCORE || score % 10 !== 0 ||
        !Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE
    ) {
        return sendJson(res, 400, { error: "Invalid score." });
    }

    insertScore.run(name, score, stage);

    const rank = countBetter.get(score).better + 1;

    sendJson(res, 201, { ok: true, rank });
}


// ==================================
// 4. SERVE THE GAME FILES
// ==================================

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon"
};

function serveFile(req, res) {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = path.join(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);

    // Block paths like /../server.js that try to leave the public folder
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            return res.end("Not found");
        }

        const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": type });
        res.end(content);
    });
}


// ==================================
// 5. START THE SERVER
// ==================================

const server = http.createServer(async (req, res) => {
    try {
        const pathname = new URL(req.url, "http://localhost").pathname;

        if (pathname === "/api/scores" && req.method === "GET") {
            return handleGetScores(req, res);
        }

        if (pathname === "/api/scores" && req.method === "POST") {
            return await handlePostScore(req, res);
        }

        if (req.method === "GET") {
            return serveFile(req, res);
        }

        res.writeHead(405);
        res.end("Method not allowed");
    } catch (error) {
        console.error(error);
        sendJson(res, 500, { error: "Server error." });
    }
});

server.listen(PORT, () => {
    console.log(`Brick Breaker running at http://localhost:${PORT}`);
});