const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({ filename: 'gateway.log' })
    ]
});

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:8080', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    }
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const healthChecks = {
        gateway: { status: 'healthy', timestamp: new Date().toISOString() },
        services: {}
    };

    // Check all backend services
    const services = [
        { name: 'sudoku-solver-cpp', url: 'http://localhost:8081/health' },
        { name: 'user-management-csharp', url: 'http://localhost:8082/api/users/health' },
        { name: 'leaderboard-php', url: 'http://localhost:8083/health' }
    ];

    for (const service of services) {
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(service.url, { timeout: 5000 });
            healthChecks.services[service.name] = {
                status: response.ok ? 'healthy' : 'unhealthy',
                httpStatus: response.status
            };
        } catch (error) {
            healthChecks.services[service.name] = {
                status: 'unreachable',
                error: error.message
            };
        }
    }

    const allHealthy = Object.values(healthChecks.services).every(s => s.status === 'healthy');
    res.status(allHealthy ? 200 : 503).json(healthChecks);
});

// API versioning middleware
app.use('/api/v1', (req, res, next) => {
    req.headers['x-api-version'] = 'v1';
    next();
});

// Service routing configuration
const serviceConfig = {
    '/api/v1/solver': {
        target: 'http://localhost:8081',
        pathRewrite: { '^/api/v1/solver': '' },
        description: 'C++ High-Performance Sudoku Solver'
    },
    '/api/v1/users': {
        target: 'http://localhost:8082',
        pathRewrite: { '^/api/v1/users': '/api/users' },
        description: 'C# User Management Service'
    },
    '/api/v1/leaderboard': {
        target: 'http://localhost:8083',
        pathRewrite: { '^/api/v1/leaderboard': '' },
        description: 'PHP Leaderboard Service'
    },
    '/api/v1/statistics': {
        target: 'http://localhost:8083',
        pathRewrite: { '^/api/v1/statistics': '/statistics' },
        description: 'PHP Statistics Service'
    }
};

// Setup proxy middleware for each service
Object.entries(serviceConfig).forEach(([path, config]) => {
    const proxy = createProxyMiddleware({
        target: config.target,
        changeOrigin: true,
        pathRewrite: config.pathRewrite,
        timeout: 30000,
        proxyTimeout: 30000,
        onError: (err, req, res) => {
            logger.error(`Proxy error for ${path}: ${err.message}`);
            res.status(503).json({
                error: 'Service temporarily unavailable',
                service: path,
                message: 'The requested service is not responding'
            });
        },
        onProxyReq: (proxyReq, req, res) => {
            // Add custom headers
            proxyReq.setHeader('X-Forwarded-Gateway', 'sudoku-matrix-gateway');
            proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || `req_${Date.now()}`);
        },
        onProxyRes: (proxyRes, req, res) => {
            // Add response headers
            proxyRes.headers['X-Served-By'] = 'sudoku-matrix-gateway';
        }
    });

    app.use(path, proxy);
    logger.info(`Configured proxy: ${path} -> ${config.target} (${config.description})`);
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    const apiDocs = {
        title: '3D Sudoku Matrix API Gateway',
        version: '1.0.0',
        description: 'Multi-language microservices architecture following OSI model',
        baseUrl: `http://localhost:${PORT}`,
        services: Object.entries(serviceConfig).map(([path, config]) => ({
            path,
            target: config.target,
            description: config.description
        })),
        endpoints: {
            'GET /health': 'Gateway and services health check',
            'GET /api/docs': 'API documentation',
            'POST /api/v1/solver/solve': 'Solve sudoku puzzle (C++)',
            'POST /api/v1/solver/validate': 'Validate sudoku board (C++)',
            'POST /api/v1/users/register': 'Register new user (C#)',
            'GET /api/v1/users/{id}': 'Get user details (C#)',
            'POST /api/v1/users/{id}/scores': 'Add user score (C#)',
            'GET /api/v1/leaderboard': 'Get leaderboard (PHP)',
            'POST /api/v1/leaderboard': 'Add leaderboard entry (PHP)',
            'GET /api/v1/statistics': 'Get game statistics (PHP)'
        },
        architecture: {
            'Layer 7 (Application)': 'Multi-language microservices',
            'Layer 6 (Presentation)': 'JSON/XML data serialization',
            'Layer 5 (Session)': 'HTTP sessions and JWT tokens',
            'Layer 4 (Transport)': 'HTTP/HTTPS protocols',
            'Layer 3 (Network)': 'RESTful API routing',
            'Layer 2 (Data Link)': 'WebSocket connections',
            'Layer 1 (Physical)': 'CDN and web delivery'
        }
    };

    res.json(apiDocs);
});

// WebSocket support for real-time features
const { createServer } = require('http');
const { Server } = require('socket.io');

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:4200', 'http://localhost:8080'],
        methods: ['GET', 'POST']
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('join-game', (data) => {
        socket.join(`game-${data.gameId}`);
        logger.info(`Client ${socket.id} joined game ${data.gameId}`);
    });

    socket.on('game-move', (data) => {
        socket.to(`game-${data.gameId}`).emit('opponent-move', data);
        logger.info(`Game move broadcasted for game ${data.gameId}`);
    });

    socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error(`Gateway error: ${error.message}`);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.method} ${req.url} was not found`,
        availableEndpoints: ['/health', '/api/docs', '/api/v1/*']
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    logger.info('='.repeat(60));
    logger.info('🚀 3D Sudoku Matrix API Gateway Started');
    logger.info('='.repeat(60));
    logger.info(`📍 Server: http://0.0.0.0:${PORT}`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    logger.info('📡 WebSocket: Real-time multiplayer enabled');
    logger.info('🔧 Services configured:');
    Object.entries(serviceConfig).forEach(([path, config]) => {
        logger.info(`   ${path} -> ${config.target}`);
    });
    logger.info('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Gateway server closed');
        process.exit(0);
    });
});

module.exports = app;