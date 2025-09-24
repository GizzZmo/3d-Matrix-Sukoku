<?php
declare(strict_types=1);

require_once 'vendor/autoload.php';

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Slim\Middleware\CorsMiddleware;

class LeaderboardService
{
    private array $leaderboard = [];
    
    public function __construct()
    {
        // Initialize with some sample data
        $this->leaderboard = [
            [
                'id' => 1,
                'username' => 'MatrixNeo',
                'difficulty' => 'hard',
                'time' => 245,
                'completed_at' => '2024-01-15T10:30:00Z',
                'score' => 1200
            ],
            [
                'id' => 2,
                'username' => 'CyberAgent',
                'difficulty' => 'medium',
                'time' => 180,
                'completed_at' => '2024-01-14T15:22:00Z',
                'score' => 950
            ],
            [
                'id' => 3,
                'username' => 'DigitalRunner',
                'difficulty' => 'easy',
                'time' => 120,
                'completed_at' => '2024-01-13T09:15:00Z',
                'score' => 600
            ]
        ];
    }

    public function getLeaderboard(string $difficulty = 'all', int $limit = 50): array
    {
        $filtered = $this->leaderboard;
        
        if ($difficulty !== 'all') {
            $filtered = array_filter($filtered, function($entry) use ($difficulty) {
                return $entry['difficulty'] === $difficulty;
            });
        }
        
        // Sort by score (descending) then by time (ascending)
        usort($filtered, function($a, $b) {
            if ($a['score'] === $b['score']) {
                return $a['time'] <=> $b['time'];
            }
            return $b['score'] <=> $a['score'];
        });
        
        return array_slice($filtered, 0, $limit);
    }
    
    public function addScore(array $scoreData): array
    {
        $newEntry = [
            'id' => count($this->leaderboard) + 1,
            'username' => $scoreData['username'] ?? 'Anonymous',
            'difficulty' => $scoreData['difficulty'] ?? 'easy',
            'time' => $scoreData['time'] ?? 0,
            'completed_at' => date('c'),
            'score' => $this->calculateScore($scoreData['difficulty'] ?? 'easy', $scoreData['time'] ?? 0)
        ];
        
        $this->leaderboard[] = $newEntry;
        return $newEntry;
    }
    
    private function calculateScore(string $difficulty, int $timeInSeconds): int
    {
        $baseScore = match($difficulty) {
            'easy' => 300,
            'medium' => 600,
            'hard' => 1000,
            default => 300
        };
        
        // Bonus points for faster completion (max 300 bonus)
        $timeBonus = max(0, 300 - intval($timeInSeconds / 5));
        
        return $baseScore + $timeBonus;
    }
    
    public function getStatistics(): array
    {
        if (empty($this->leaderboard)) {
            return [
                'total_games' => 0,
                'total_players' => 0,
                'average_time' => 0,
                'difficulty_breakdown' => []
            ];
        }
        
        $totalGames = count($this->leaderboard);
        $uniquePlayers = count(array_unique(array_column($this->leaderboard, 'username')));
        $totalTime = array_sum(array_column($this->leaderboard, 'time'));
        $averageTime = round($totalTime / $totalGames, 2);
        
        $difficultyBreakdown = [];
        foreach ($this->leaderboard as $entry) {
            $diff = $entry['difficulty'];
            if (!isset($difficultyBreakdown[$diff])) {
                $difficultyBreakdown[$diff] = 0;
            }
            $difficultyBreakdown[$diff]++;
        }
        
        return [
            'total_games' => $totalGames,
            'total_players' => $uniquePlayers,
            'average_time' => $averageTime,
            'difficulty_breakdown' => $difficultyBreakdown
        ];
    }
}

// Create Slim app
$app = AppFactory::create();

// Add CORS middleware
$corsOptions = [
    'origin' => ['*'],
    'methods' => ['GET', 'POST', 'OPTIONS'],
    'headers.allow' => ['Content-Type', 'Authorization'],
    'headers.expose' => [],
    'credentials' => false,
    'cache' => 86400
];

$cors = new CorsMiddleware($corsOptions);
$app->add($cors);

// Add JSON parsing middleware
$app->addBodyParsingMiddleware();

// Initialize service
$leaderboardService = new LeaderboardService();

// Health check endpoint
$app->get('/health', function (Request $request, Response $response) {
    $data = [
        'status' => 'healthy',
        'service' => 'leaderboard-php',
        'version' => '1.0.0',
        'timestamp' => date('c')
    ];
    
    $response->getBody()->write(json_encode($data));
    return $response->withHeader('Content-Type', 'application/json');
});

// Get leaderboard
$app->get('/leaderboard', function (Request $request, Response $response) use ($leaderboardService) {
    $queryParams = $request->getQueryParams();
    $difficulty = $queryParams['difficulty'] ?? 'all';
    $limit = intval($queryParams['limit'] ?? 50);
    
    $leaderboard = $leaderboardService->getLeaderboard($difficulty, $limit);
    
    $data = [
        'leaderboard' => $leaderboard,
        'total' => count($leaderboard),
        'difficulty' => $difficulty
    ];
    
    $response->getBody()->write(json_encode($data));
    return $response->withHeader('Content-Type', 'application/json');
});

// Add new score
$app->post('/leaderboard', function (Request $request, Response $response) use ($leaderboardService) {
    $data = $request->getParsedBody();
    
    if (empty($data['username']) || empty($data['difficulty']) || !isset($data['time'])) {
        $error = ['error' => 'Missing required fields: username, difficulty, time'];
        $response->getBody()->write(json_encode($error));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $newEntry = $leaderboardService->addScore($data);
    
    $response->getBody()->write(json_encode($newEntry));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
});

// Get statistics
$app->get('/statistics', function (Request $request, Response $response) use ($leaderboardService) {
    $stats = $leaderboardService->getStatistics();
    
    $response->getBody()->write(json_encode($stats));
    return $response->withHeader('Content-Type', 'application/json');
});

// Handle preflight OPTIONS requests
$app->options('/{routes:.+}', function (Request $request, Response $response) {
    return $response;
});

echo "Starting PHP Leaderboard Service on port 8083...\n";
$app->run();
?>