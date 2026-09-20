/**
 * Production Web Server for AgentLab
 * 
 * High-performance, zero-dependency Node.js server optimized for hosting
 * on Linux (RHEL, Rocky, Alma, Ubuntu) or container environments.
 * 
 * Default Port: 3002 (Configurable via PORT env var)
 * Default Host: 0.0.0.0 (Configurable via HOST env var)
 */

import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import net from 'node:net'

import { handleApiRequest } from './server/api.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT) || 3002
const HOST = process.env.HOST || '0.0.0.0'
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || path.join(__dirname, 'dist'))
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678'
const BING_TARGET = 'https://www.bing.com'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.map': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.map',
])

function proxyHttpRequest(req, res, targetUrlStr, pathPrefixToRemove, customHeaders = {}) {
  try {
    const targetBase = new URL(targetUrlStr)
    const clientPath = req.url.startsWith(pathPrefixToRemove)
      ? req.url.slice(pathPrefixToRemove.length) || '/'
      : req.url

    const targetUrl = new URL(clientPath, targetBase)

    const isHttps = targetUrl.protocol === 'https:'
    const transport = isHttps ? https : http

    const headers = { ...req.headers }
    delete headers['host']
    headers['host'] = targetUrl.host

    for (const [key, value] of Object.entries(customHeaders)) {
      headers[key.toLowerCase()] = value
    }

    const proxyReq = transport.request(
      targetUrl,
      {
        method: req.method,
        headers,
        rejectUnauthorized: false,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )

    proxyReq.on('error', (err) => {
      console.error(`[Proxy Error] ${req.url} -> ${targetUrlStr}:`, err.message)
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Bad Gateway', details: err.message }))
      }
    })

    req.pipe(proxyReq)
  } catch (err) {
    console.error(`[Proxy Setup Error] ${req.url}:`, err.message)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    }
  }
}

function handleWebSocketUpgrade(req, clientSocket, head) {
  if (!req.url.startsWith('/n8n-mcp')) {
    clientSocket.destroy()
    return
  }

  try {
    const targetBase = new URL(N8N_URL)
    const targetPath = req.url.slice('/n8n-mcp'.length) || '/'
    const port = targetBase.port || (targetBase.protocol === 'https:' ? 443 : 80)

    const targetSocket = net.connect(
      {
        host: targetBase.hostname,
        port: Number(port),
      },
      () => {
        let headersStr = `${req.method} ${targetPath} HTTP/${req.httpVersion}\r\n`
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          const key = req.rawHeaders[i]
          const val = req.rawHeaders[i + 1]
          if (key.toLowerCase() === 'host') {
            headersStr += `Host: ${targetBase.host}\r\n`
          } else {
            headersStr += `${key}: ${val}\r\n`
          }
        }
        headersStr += '\r\n'

        targetSocket.write(headersStr)
        if (head && head.length > 0) {
          targetSocket.write(head)
        }

        targetSocket.pipe(clientSocket)
        clientSocket.pipe(targetSocket)
      }
    )

    targetSocket.on('error', (err) => {
      console.error('[WebSocket Proxy Error]:', err.message)
      clientSocket.destroy()
    })

    clientSocket.on('error', () => {
      targetSocket.destroy()
    })
  } catch (err) {
    console.error('[WebSocket Upgrade Error]:', err.message)
    clientSocket.destroy()
  }
}

function serveStaticFile(req, res, filePath, ext) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }

    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
    const headers = {
      'Content-Type': mimeType,
      'X-Content-Type-Options': 'nosniff',
    }

    // Cache headers
    if (
      filePath.includes(`${path.sep}js${path.sep}`) ||
      filePath.includes(`${path.sep}styles${path.sep}`) ||
      filePath.includes(`${path.sep}fonts${path.sep}`) ||
      filePath.includes(`${path.sep}images${path.sep}`) ||
      filePath.includes(`${path.sep}assets${path.sep}`)
    ) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    } else if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    } else {
      headers['Cache-Control'] = 'public, max-age=3600'
    }

    // Support 304 Not Modified
    const ifModifiedSince = req.headers['if-modified-since']
    if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
      res.writeHead(304, headers)
      res.end()
      return
    }
    headers['Last-Modified'] = stats.mtime.toUTCString()

    if (req.method === 'HEAD') {
      headers['Content-Length'] = stats.size
      res.writeHead(200, headers)
      res.end()
      return
    }

    // Check compression
    const acceptEncoding = req.headers['accept-encoding'] || ''
    const shouldCompress = COMPRESSIBLE_EXTENSIONS.has(ext) && stats.size > 1024

    const fileStream = fs.createReadStream(filePath)

    if (shouldCompress && /\bgzip\b/.test(acceptEncoding)) {
      headers['Content-Encoding'] = 'gzip'
      res.writeHead(200, headers)
      fileStream.pipe(zlib.createGzip()).pipe(res)
    } else if (shouldCompress && /\bdeflate\b/.test(acceptEncoding)) {
      headers['Content-Encoding'] = 'deflate'
      res.writeHead(200, headers)
      fileStream.pipe(zlib.createDeflate()).pipe(res)
    } else {
      headers['Content-Length'] = stats.size
      res.writeHead(200, headers)
      fileStream.pipe(res)
    }
  })
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(parsedUrl.pathname)

  // 1. Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'AgentLab',
        port: PORT,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    )
    return
  }

  // 2. Reverse proxy: n8n MCP
  if (pathname.startsWith('/n8n-mcp')) {
    proxyHttpRequest(req, res, N8N_URL, '/n8n-mcp')
    return
  }

  // 3. Reverse proxy: Bing web search
  if (pathname.startsWith('/proxy/bing')) {
    proxyHttpRequest(req, res, BING_TARGET, '/proxy/bing', {
      Referer: 'https://www.bing.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    return
  }

  // 4. PostgreSQL Database & Auth REST APIs
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res)
      .then((handled) => {
        if (!handled && !res.headersSent) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'API route not found' }))
        }
      })
      .catch((err) => {
        console.error('[API Server Error]:', err)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Internal server error: ' + err.message }))
        }
      })
    return
  }

  // Only GET and HEAD for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Method Not Allowed')
    return
  }

  // Safe path resolution to prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '')
  let targetPath = path.join(STATIC_DIR, safePath)

  // Ensure path is inside STATIC_DIR
  if (!targetPath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  fs.stat(targetPath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html')
    }

    fs.stat(targetPath, (fileErr, fileStats) => {
      if (!fileErr && fileStats.isFile()) {
        const ext = path.extname(targetPath).toLowerCase()
        serveStaticFile(req, res, targetPath, ext)
        return
      }

      // If file has a specific asset extension and doesn't exist, return 404
      const requestedExt = path.extname(safePath).toLowerCase()
      if (requestedExt && requestedExt !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
        return
      }

      // SPA Fallback: Serve index.html for all other routes
      const indexPath = path.join(STATIC_DIR, 'index.html')
      serveStaticFile(req, res, indexPath, '.html')
    })
  })
})

// Handle WebSocket upgrade for n8n MCP
server.on('upgrade', handleWebSocketUpgrade)

server.listen(PORT, HOST, () => {
  console.log('====================================================')
  console.log(`🚀 AgentLab Production Server Started`)
  console.log(`🌐 Local:   http://localhost:${PORT}`)
  console.log(`📡 Network: http://${HOST === '0.0.0.0' ? '<server-ip>' : HOST}:${PORT}`)
  console.log(`📁 Static:  ${STATIC_DIR}`)
  console.log(`🩺 Health:  http://localhost:${PORT}/health`)
  console.log('====================================================')
})

function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down AgentLab server...`)
  server.close(() => {
    console.log('Server closed successfully.')
    process.exit(0)
  })

  // Force close after 10s if connections linger
  setTimeout(() => {
    console.error('Forcefully terminating after timeout.')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))
