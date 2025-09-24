using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace UserManagementService;

public class User
{
    public int Id { get; set; }
    [Required]
    public string Username { get; set; } = "";
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
    public List<GameScore> Scores { get; set; } = new();
}

public class GameScore
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    [Required]
    public string Difficulty { get; set; } = "";
    public int TimeInSeconds { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    public string GameMode { get; set; } = "standard";
}

public class UserContext : DbContext
{
    public UserContext(DbContextOptions<UserContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<GameScore> GameScores { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
        
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<GameScore>()
            .HasOne(gs => gs.User)
            .WithMany(u => u.Scores)
            .HasForeignKey(gs => gs.UserId);
    }
}

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserContext _context;
    
    public UsersController(UserContext context)
    {
        _context = context;
    }

    [HttpGet("health")]
    public ActionResult GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            service = "user-management-csharp",
            version = "1.0.0",
            timestamp = DateTime.UtcNow
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult<User>> RegisterUser([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return Conflict(new { error = "Username already exists" });
        }

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return Conflict(new { error = "Email already registered" });
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await _context.Users
            .Include(u => u.Scores)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return user;
    }

    [HttpPost("{id}/scores")]
    public async Task<ActionResult<GameScore>> AddScore(int id, [FromBody] ScoreRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var score = new GameScore
        {
            UserId = id,
            Difficulty = request.Difficulty,
            TimeInSeconds = request.TimeInSeconds,
            CompletedAt = DateTime.UtcNow,
            GameMode = request.GameMode ?? "standard"
        };

        _context.GameScores.Add(score);
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetScore), new { scoreId = score.Id }, score);
    }

    [HttpGet("scores/{scoreId}")]
    public async Task<ActionResult<GameScore>> GetScore(int scoreId)
    {
        var score = await _context.GameScores
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == scoreId);

        if (score == null)
        {
            return NotFound(new { error = "Score not found" });
        }

        return score;
    }

    [HttpGet("{id}/scores")]
    public async Task<ActionResult<IEnumerable<GameScore>>> GetUserScores(int id, [FromQuery] int? limit = 10)
    {
        var scores = await _context.GameScores
            .Where(s => s.UserId == id)
            .OrderByDescending(s => s.CompletedAt)
            .Take(limit ?? 10)
            .ToListAsync();

        return Ok(scores);
    }
}

public class RegisterRequest
{
    [Required]
    public string Username { get; set; } = "";
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
}

public class ScoreRequest
{
    [Required]
    public string Difficulty { get; set; } = "";
    public int TimeInSeconds { get; set; }
    public string? GameMode { get; set; }
}

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container
        builder.Services.AddDbContext<UserContext>(options =>
            options.UseInMemoryDatabase("UserManagementDB"));

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // Add CORS
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors();
        app.UseRouting();
        app.MapControllers();

        Console.WriteLine("Starting C# User Management Service on port 8082...");
        app.Run("http://0.0.0.0:8082");
    }
}