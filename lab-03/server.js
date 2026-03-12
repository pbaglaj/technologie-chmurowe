const http = require('http');

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "ok", service: "backend-api" }));
    } 
    else if (req.method === 'GET' && req.url === '/items') {
        res.writeHead(200);
        res.end(JSON.stringify({ items: ["item1", "item2", "item3"] }));
    } 
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not Found" }));
    }
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});