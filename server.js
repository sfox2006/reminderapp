const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

http
  .createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/") pathname = "/index.html";

    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      if (request.method === "HEAD") {
        response.end();
      } else {
        response.end(data);
      }
    });
  })
  .listen(4173, "127.0.0.1", () => {
    console.log("Reminder Studio is running at http://127.0.0.1:4173");
  });
