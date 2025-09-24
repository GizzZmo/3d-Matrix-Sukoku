Imports System
Imports System.IO
Imports System.Net.Http
Imports System.Text
Imports System.Text.Json
Imports System.Threading.Tasks
Imports System.Collections.Generic

Namespace LegacyDataMigration
    Public Class LegacyScore
        Public Property Username As String = ""
        Public Property Difficulty As String = ""
        Public Property CompletionTime As Integer
        Public Property CompletedDate As DateTime
        Public Property LegacyScore As Integer
    End Class

    Public Class DataMigrationService
        Private ReadOnly httpClient As HttpClient
        Private ReadOnly baseUrl As String = "http://localhost"

        Public Sub New()
            httpClient = New HttpClient()
        End Sub

        Public Function ReadLegacyScoreFile(filePath As String) As List(Of LegacyScore)
            Dim scores As New List(Of LegacyScore)()
            
            Try
                If Not File.Exists(filePath) Then
                    Console.WriteLine($"Legacy file not found: {filePath}")
                    Return scores
                End If

                Dim lines() As String = File.ReadAllLines(filePath)
                Console.WriteLine($"Reading {lines.Length} lines from legacy file...")

                For Each line As String In lines
                    If String.IsNullOrWhiteSpace(line) OrElse line.StartsWith("#") Then
                        Continue For
                    End If

                    Dim parts() As String = line.Split("|"c)
                    If parts.Length >= 5 Then
                        Dim score As New LegacyScore() With {
                            .Username = parts(0).Trim(),
                            .Difficulty = parts(1).Trim(),
                            .CompletionTime = Integer.Parse(parts(2).Trim()),
                            .CompletedDate = DateTime.Parse(parts(3).Trim()),
                            .LegacyScore = Integer.Parse(parts(4).Trim())
                        }
                        scores.Add(score)
                    End If
                Next

                Console.WriteLine($"Successfully parsed {scores.Count} legacy scores")
            Catch ex As Exception
                Console.WriteLine($"Error reading legacy file: {ex.Message}")
            End Try

            Return scores
        End Function

        Public Function CreateLegacyScoreFile(scores As List(Of LegacyScore), filePath As String) As Boolean
            Try
                Using writer As New StreamWriter(filePath, False, Encoding.UTF8)
                    writer.WriteLine("# Legacy Sudoku Scores - Format: Username|Difficulty|Time|Date|Score")
                    writer.WriteLine($"# Generated on: {DateTime.Now}")
                    writer.WriteLine("# Time in seconds, Score is legacy format")
                    
                    For Each score As LegacyScore In scores
                        Dim line As String = String.Join("|", 
                            score.Username,
                            score.Difficulty,
                            score.CompletionTime.ToString(),
                            score.CompletedDate.ToString("yyyy-MM-dd HH:mm:ss"),
                            score.LegacyScore.ToString())
                        writer.WriteLine(line)
                    Next
                End Using

                Console.WriteLine($"Successfully created legacy file with {scores.Count} scores")
                Return True
            Catch ex As Exception
                Console.WriteLine($"Error creating legacy file: {ex.Message}")
                Return False
            End Try
        End Function

        Public Async Function MigrateToModernAPI(scores As List(Of LegacyScore)) As Task(Of Integer)
            Dim successCount As Integer = 0
            
            Console.WriteLine($"Starting migration of {scores.Count} scores to modern API...")

            For Each score As LegacyScore In scores
                Try
                    ' First, register user if needed
                    Await RegisterUserIfNeeded(score.Username)
                    
                    ' Then migrate the score
                    Dim success As Boolean = Await MigrateScoreToLeaderboard(score)
                    If success Then
                        successCount += 1
                        Console.WriteLine($"Migrated score for {score.Username}: {score.Difficulty} - {score.CompletionTime}s")
                    End If
                    
                    ' Add small delay to avoid overwhelming the API
                    Await Task.Delay(100)
                    
                Catch ex As Exception
                    Console.WriteLine($"Failed to migrate score for {score.Username}: {ex.Message}")
                End Try
            Next

            Console.WriteLine($"Migration completed: {successCount}/{scores.Count} scores migrated successfully")
            Return successCount
        End Function

        Private Async Function RegisterUserIfNeeded(username As String) As Task
            Try
                Dim userData As New Dictionary(Of String, Object) From {
                    {"username", username},
                    {"email", $"{username.ToLower()}@legacy.migration"}
                }
                
                Dim jsonData As String = JsonSerializer.Serialize(userData)
                Dim content As New StringContent(jsonData, Encoding.UTF8, "application/json")
                
                Dim response As HttpResponseMessage = Await httpClient.PostAsync($"{baseUrl}:8082/api/users/register", content)
                ' Ignore conflicts (user already exists)
                
            Catch ex As Exception
                ' Ignore registration errors - user might already exist
            End Try
        End Function

        Private Async Function MigrateScoreToLeaderboard(score As LegacyScore) As Task(Of Boolean)
            Try
                Dim scoreData As New Dictionary(Of String, Object) From {
                    {"username", score.Username},
                    {"difficulty", score.Difficulty},
                    {"time", score.CompletionTime}
                }
                
                Dim jsonData As String = JsonSerializer.Serialize(scoreData)
                Dim content As New StringContent(jsonData, Encoding.UTF8, "application/json")
                
                Dim response As HttpResponseMessage = Await httpClient.PostAsync($"{baseUrl}:8083/leaderboard", content)
                Return response.IsSuccessStatusCode
                
            Catch ex As Exception
                Return False
            End Try
        End Function

        Public Sub GenerateSampleLegacyData(filePath As String)
            Dim sampleScores As New List(Of LegacyScore)()
            
            ' Generate some sample legacy data
            sampleScores.Add(New LegacyScore() With {
                .Username = "OldSchoolPlayer",
                .Difficulty = "easy",
                .CompletionTime = 185,
                .CompletedDate = DateTime.Now.AddDays(-30),
                .LegacyScore = 750
            })
            
            sampleScores.Add(New LegacyScore() With {
                .Username = "RetroGamer",
                .Difficulty = "medium", 
                .CompletionTime = 245,
                .CompletedDate = DateTime.Now.AddDays(-25),
                .LegacyScore = 890
            })
            
            sampleScores.Add(New LegacyScore() With {
                .Username = "ClassicSolver",
                .Difficulty = "hard",
                .CompletionTime = 320,
                .CompletedDate = DateTime.Now.AddDays(-20),
                .LegacyScore = 1150
            })

            CreateLegacyScoreFile(sampleScores, filePath)
        End Sub

        Public Sub ShowHealth()
            Console.WriteLine("=== VB.NET Legacy Data Migration Service ===")
            Console.WriteLine($"Service: legacy-migration-vb")
            Console.WriteLine($"Version: 1.0.0")
            Console.WriteLine($"Status: Healthy")
            Console.WriteLine($"Timestamp: {DateTime.Now}")
            Console.WriteLine("============================================")
        End Sub

        Protected Overrides Sub Finalize()
            httpClient?.Dispose()
            MyBase.Finalize()
        End Sub
    End Class

    Module Program
        Sub Main(args As String())
            Console.WriteLine("Starting VB.NET Legacy Data Migration Service...")
            
            Dim service As New DataMigrationService()
            service.ShowHealth()

            Dim legacyFile As String = "legacy_scores.txt"
            
            ' Check if we have command line arguments
            If args.Length > 0 Then
                Select Case args(0).ToLower()
                    Case "generate"
                        service.GenerateSampleLegacyData(legacyFile)
                        Console.WriteLine($"Generated sample legacy data in {legacyFile}")
                        
                    Case "migrate"
                        Dim scores As List(Of LegacyScore) = service.ReadLegacyScoreFile(legacyFile)
                        If scores.Count > 0 Then
                            Dim migrated As Integer = service.MigrateToModernAPI(scores).Result
                            Console.WriteLine($"Migration complete: {migrated} scores migrated")
                        Else
                            Console.WriteLine("No legacy scores found to migrate")
                        End If
                        
                    Case "health"
                        service.ShowHealth()
                        
                    Case Else
                        Console.WriteLine("Usage: LegacyMigration.exe [generate|migrate|health]")
                End Select
            Else
                ' Interactive mode
                Console.WriteLine()
                Console.WriteLine("Available commands:")
                Console.WriteLine("1. generate - Create sample legacy data")
                Console.WriteLine("2. migrate - Migrate legacy data to modern APIs")
                Console.WriteLine("3. health - Show service status")
                Console.WriteLine()
                Console.Write("Enter command: ")
                
                Dim command As String = Console.ReadLine()
                If Not String.IsNullOrEmpty(command) Then
                    Main({command})
                End If
            End If
            
            Console.WriteLine("Press any key to exit...")
            Console.ReadKey()
        End Sub
    End Module
End Namespace