import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';

export interface SolveRequest {
  board: number[][];
}

export interface SolveResponse {
  solved: boolean;
  solvingTime: number;
  board: number[][];
}

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  scores: GameScore[];
}

export interface GameScore {
  id: number;
  difficulty: string;
  timeInSeconds: number;
  completedAt: string;
  gameMode: string;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  difficulty: string;
  time: number;
  completed_at: string;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': 'sudoku-matrix-client'
    })
  };

  // Real-time connection status
  private connectionStatus = new BehaviorSubject<boolean>(true);
  public connectionStatus$ = this.connectionStatus.asObservable();

  // Performance metrics
  private performanceMetrics = new BehaviorSubject<any>({});
  public performanceMetrics$ = this.performanceMetrics.asObservable();

  constructor(private http: HttpClient) {
    this.checkConnectionStatus();
  }

  // Health check for all services
  checkHealth(): Observable<any> {
    return this.http.get(`http://localhost:8080/health`).pipe(
      tap((health: any) => {
        this.connectionStatus.next(true);
        console.log('Health check successful:', health);
      }),
      catchError(error => {
        this.connectionStatus.next(false);
        console.error('Health check failed:', error);
        return throwError(() => error);
      })
    );
  }

  // C++ Sudoku Solver Service
  solvePuzzle(board: number[][]): Observable<any> {
    const startTime = performance.now();
    
    return this.http.post<any>(`${this.baseUrl}/solver/solve`, 
      { board }, 
      this.httpOptions
    ).pipe(
      tap(response => {
        const endTime = performance.now();
        const clientTime = endTime - startTime;
        
        this.updatePerformanceMetrics('solve', {
          clientTime,
          serverTime: response.solvingTime,
          totalTime: clientTime + response.solvingTime
        });
      }),
      retry(2),
      catchError(this.handleError('solvePuzzle'))
    );
  }

  validatePuzzle(board: number[][]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/solver/validate`, 
      { board }, 
      this.httpOptions
    ).pipe(
      retry(1),
      catchError(this.handleError('validatePuzzle'))
    );
  }

  // C# User Management Service
  registerUser(username: string, email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/register`, 
      { username, email }, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError('registerUser'))
    );
  }

  getUser(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users/${id}`).pipe(
      catchError(this.handleError('getUser'))
    );
  }

  addUserScore(userId: number, difficulty: string, timeInSeconds: number, gameMode: string = 'standard'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/${userId}/scores`, 
      { difficulty, timeInSeconds, gameMode }, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError('addUserScore'))
    );
  }

  getUserScores(userId: number, limit: number = 10): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users/${userId}/scores?limit=${limit}`).pipe(
      catchError(this.handleError('getUserScores'))
    );
  }

  // PHP Leaderboard Service
  getLeaderboard(difficulty: string = 'all', limit: number = 50): Observable<any> {
    const params = new URLSearchParams();
    if (difficulty !== 'all') params.append('difficulty', difficulty);
    params.append('limit', limit.toString());

    return this.http.get<any>(`${this.baseUrl}/leaderboard?${params}`).pipe(
      catchError(this.handleError('getLeaderboard'))
    );
  }

  addLeaderboardEntry(username: string, difficulty: string, time: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leaderboard`, 
      { username, difficulty, time }, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError('addLeaderboardEntry'))
    );
  }

  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics`).pipe(
      catchError(this.handleError('getStatistics'))
    );
  }

  // WebAssembly C++ solver for offline functionality
  async solvePuzzleWasm(board: number[][]): Promise<any> {
    try {
      // Load WebAssembly module (placeholder for actual WASM implementation)
      console.log('Using WebAssembly solver for offline mode');
      
      // This would be replaced with actual WASM module call
      const wasmModule = await this.loadWasmModule();
      const result = wasmModule.solveSudoku(board);
      
      return {
        solved: result.solved,
        solvingTime: result.time,
        board: result.board
      };
    } catch (error) {
      throw new Error('WebAssembly solver failed: ' + error);
    }
  }

  private async loadWasmModule(): Promise<any> {
    // Placeholder for WebAssembly module loading
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          solveSudoku: (board: number[][]) => ({
            solved: true,
            time: 150,
            board: board // Simplified for demo
          })
        });
      }, 100);
    });
  }

  private checkConnectionStatus(): void {
    setInterval(() => {
      this.checkHealth().subscribe({
        next: () => this.connectionStatus.next(true),
        error: () => this.connectionStatus.next(false)
      });
    }, 30000); // Check every 30 seconds
  }

  private updatePerformanceMetrics(operation: string, metrics: any): void {
    const current = this.performanceMetrics.value;
    current[operation] = {
      ...metrics,
      timestamp: new Date().toISOString()
    };
    this.performanceMetrics.next(current);
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Log error to monitoring service
      this.logError(operation, error);
      
      // Let the app keep running by returning an empty result
      return throwError(() => new Error(`${operation} failed: ${error.message}`));
    };
  }

  private logError(operation: string, error: any): void {
    // Send error to monitoring service
    const errorData = {
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('API Error:', errorData);
    // In production, send to monitoring service
    // this.http.post('/api/v1/errors', errorData).subscribe();
  }
}