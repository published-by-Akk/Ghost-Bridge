const http = require('http');
const fs = require('fs');
const path = require('path');

// On Render, files in the root can be wiped on restart. 
// For a truly "permanent" JSON, we use /tmp/ or a disk, but for this project, 
// a local file in the same folder works fine for active sessions.
const FILE = path.join(__dirname, 'bridge.json');

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ session: Date.now(), data: [] }));
}

const server = http.createServer((req, res) => {
    // Standard CORS headers so your HTML files can talk to this server from anywhere
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const input = JSON.parse(body);
                let current = JSON.parse(fs.readFileSync(FILE));

                if (input.clear) {
                    current = { session: Date.now(), data: [] };
                } else {
                    input.ts = Date.now();
                    current.data.push(input);
                }

                fs.writeFileSync(FILE, JSON.stringify(current, null, 2));
                
                // SEND SUCCESS BACK TO ASSISTANT
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'SUCCESS', 
                    delivered_at: new Date().toISOString(),
                    session: current.session 
                }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'ERROR', message: e.message }));
            }
        });
    } else {
        // GET logic for the Receiver
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fs.readFileSync(FILE));
    }
});

// RENDER USES DYNAMIC PORTS - THIS IS CRITICAL
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
