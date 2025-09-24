import { ChangeDetectionStrategy, Component, computed, signal, OnInit } from '@angular/core';
import { MatrixRainComponent } from './matrix-rain.component';

type Board = number[][]; // row, col
type Conflicts = boolean[][];
type SelectedCell = { row: number; col: number } | null;
type EditInfo = { row: number; col: number; type: 'manual' | 'hint' } | null;
type Difficulty = 'easy' | 'medium' | 'hard' | 'shared';
type Status = { type: 'playing' | 'win' | 'error'; message: string };
type Page = 'menu' | 'game' | 'leaderboard' | 'help' | 'about' | 'settings';
type Score = { name: string; time: string; difficulty: Difficulty; date: number };
type Settings = { kaleidoscopeCursor: boolean; parallaxBoardEffect: boolean; };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatrixRainComponent],
  host: {
    '(window:keydown)': 'handleKeyboardEvent($event)',
    '(mousemove)': 'onMouseMove($event)',
    '(mouseleave)': 'onMouseLeave()',
  },
})
export class AppComponent implements OnInit {
  
  readonly SIZE = 9;

  // Page navigation state
  currentPage = signal<Page>('menu');

  // Game state
  board = signal<Board>(this.createEmptyBoard());
  initialPuzzle = signal<Board>(this.createEmptyBoard());
  solvedBoard = signal<Board>(this.createEmptyBoard());
  conflicts = signal<Conflicts>(this.createEmptyConflicts());
  selectedCell = signal<SelectedCell>(null);
  gameDifficulty = signal<Difficulty>('easy');
  status = signal<Status>({ type: 'playing', message: 'Select a cell to begin.' });
  history = signal<Board[]>([]);
  redoStack = signal<Board[]>([]);
  isWinning = signal(false);
  lastEditedCell = signal<EditInfo>(null);
  hints = signal<number>(5);

  // Timer state
  startTime = 0;
  timerId: any = null;
  elapsedTime = signal('00:00');

  // Leaderboard state
  leaderboard = signal<Score[]>([]);
  playerName = signal('');

  // Settings state
  settings = signal<Settings>({ kaleidoscopeCursor: true, parallaxBoardEffect: true });
  
  // Share state
  showShareModal = signal(false);
  puzzleCode = signal('');
  shareButtonText = signal('Copy Code');
  codeError = signal<string | null>(null);

  // 3D Visuals state
  boardTransform = signal<string>('rotateX(-25deg) rotateY(0deg)');
  sheenStyle = signal<{ [key: string]: string }>({ opacity: '0' });
  cursorTransform = signal<string>('translate(-100px, -100px)');
  cursorOpacity = signal<number>(0);

  difficulties = [
    { name: 'Easy', level: 'easy' as Difficulty },
    { name: 'Medium', level: 'medium' as Difficulty },
    { name: 'Hard', level: 'hard' as Difficulty }
  ];

  isSolved = computed(() => {
    const currentBoard = this.board();
    const currentConflicts = this.conflicts();
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (currentBoard[r][c] === 0 || currentConflicts[r][c]) {
          return false;
        }
      }
    }
    return true;
  });

  ngOnInit() {
    this.loadLeaderboard();
  }

  // --- MOUSE/VISUALS HANDLING ---
  onMouseMove(event: MouseEvent) {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;

    // Kaleidoscope cursor
    if (this.settings().kaleidoscopeCursor && (this.currentPage() === 'game' || this.currentPage() === 'menu')) {
      this.cursorTransform.set(`translate(${clientX}px, ${clientY}px)`);
      this.cursorOpacity.set(1);
    } else {
      this.cursorOpacity.set(0);
    }
    
    // Parallax and Sheen (only on game page)
    if (this.settings().parallaxBoardEffect && this.currentPage() === 'game') {
      const rotY = (clientX - innerWidth / 2) / (innerWidth / 2) * 7;
      const rotX = -(clientY - innerHeight / 2) / (innerHeight / 2) * 7;
      this.boardTransform.set(`rotateX(${rotX}deg) rotateY(${rotY}deg)`);

      const sheenX = clientX / innerWidth * 100;
      const sheenY = clientY / innerHeight * 100;
      this.sheenStyle.set({
          background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(200, 230, 255, 0.15), transparent 40%)`,
          opacity: '1'
      });
    }
  }

  onMouseLeave() {
    if (this.settings().kaleidoscopeCursor) {
      this.cursorOpacity.set(0);
    }
    if (this.settings().parallaxBoardEffect && this.currentPage() === 'game') {
      this.boardTransform.set('rotateX(-25deg) rotateY(0deg)');
      this.sheenStyle.set({ opacity: '0' });
    }
  }

  // --- NAVIGATION ---
  showPage(page: Page) {
    this.currentPage.set(page);
    if (page !== 'game') {
        this.onMouseLeave();
    }
  }

  startGame(difficulty: Difficulty, puzzle?: Board) {
    this.gameDifficulty.set(difficulty);
    this.newGame(puzzle);
    this.showPage('game');
  }

  // --- KEYBOARD HANDLING ---
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.currentPage() !== 'game' || this.isWinning() || this.showShareModal()) return;

    if (this.selectedCell()) {
      const key = parseInt(event.key, 10);
      if (key >= 1 && key <= 9) {
        this.inputNumber(key);
      } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        this.inputNumber(0);
      }
    }
    
    if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') {
            event.preventDefault(); this.undo();
        } else if (event.key === 'y') {
            event.preventDefault(); this.redo();
        }
    }
  }

  // --- GAME LOGIC (2D) ---
  newGame(puzzle?: Board) {
    this.isWinning.set(false);
    this.lastEditedCell.set(null);
    this.codeError.set(null);
    
    if (puzzle) { // For loading a puzzle from code
      const puzzleCopy = JSON.parse(JSON.stringify(puzzle));
      const solved = JSON.parse(JSON.stringify(puzzle));
      this.solveBoard(solved); // We already validated it has a unique solution
      this.solvedBoard.set(solved);
      this.initialPuzzle.set(puzzleCopy);
      this.board.set(puzzle);
    } else { // For generating a random puzzle
      const { puzzle: newPuzzle, solved } = this.generateSudoku(this.gameDifficulty());
      this.solvedBoard.set(solved);
      this.initialPuzzle.set(JSON.parse(JSON.stringify(newPuzzle)));
      this.board.set(newPuzzle);
    }
    
    this.selectedCell.set(null);
    this.history.set([]);
    this.redoStack.set([]);
    this.playerName.set('');

    const difficulty = this.gameDifficulty();
    switch(difficulty) {
      case 'easy': this.hints.set(5); break;
      case 'medium': this.hints.set(3); break;
      case 'hard': this.hints.set(1); break;
      case 'shared': this.hints.set(2); break;
    }

    this.validateBoard();
    this.status.set({ type: 'playing', message: 'New game started. Good luck!' });
    this.startTimer();
  }
  
  selectCell(row: number, col: number) {
    if (this.isWinning() || this.showShareModal()) return;
    const current = this.selectedCell();
    if (current && current.row === row && current.col === col) {
      this.selectedCell.set(null);
    } else {
      this.selectedCell.set({ row, col });
    }
  }

  inputNumber(num: number) {
    const sel = this.selectedCell();
    if (!sel || this.isWinning() || this.showShareModal()) return;

    if (this.initialPuzzle()[sel.row][sel.col] === 0) {
      const currentBoard = this.board();
      if (currentBoard[sel.row][sel.col] !== num) {
        this.history.update(h => [...h, JSON.parse(JSON.stringify(currentBoard))]);
        this.redoStack.set([]);
      }
      
      this.board.update(b => {
        b[sel.row][sel.col] = num;
        return b;
      });
      this.lastEditedCell.set({ ...sel, type: 'manual' });
      this.validateBoard();
      
      if (this.isSolved()) {
        this.stopTimer();
        this.status.set({ type: 'win', message: 'SYSTEM::SOLVED! MATRIX RECOMPILED.' });
        this.isWinning.set(true);
      }
    }
  }

  undo() {
    if (this.history().length === 0 || this.isWinning()) return;
    this.redoStack.update(rs => [...rs, JSON.parse(JSON.stringify(this.board()))]);
    const previousBoard = this.history().pop()!;
    this.board.set(previousBoard);
    this.history.update(h => h);
    this.lastEditedCell.set(null);
    this.validateBoard();
  }

  redo() {
    if (this.redoStack().length === 0 || this.isWinning()) return;
    this.history.update(h => [...h, JSON.parse(JSON.stringify(this.board()))]);
    const nextBoard = this.redoStack().pop()!;
    this.board.set(nextBoard);
    this.redoStack.update(rs => rs);
    this.lastEditedCell.set(null);
    this.validateBoard();
  }

  useHint() {
    if (this.hints() <= 0 || this.isWinning()) return;

    const emptyCells: { row: number, col: number }[] = [];
    this.board().forEach((row, r) => row.forEach((cell, c) => {
      if (cell === 0) emptyCells.push({ row: r, col: c });
    }));

    if (emptyCells.length === 0) return;

    this.hints.update(h => h - 1);
    const hintCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = hintCell;
    const correctValue = this.solvedBoard()[row][col];
    
    this.selectCell(row, col);
    this.inputNumber(correctValue);
    this.lastEditedCell.set({ ...hintCell, type: 'hint' });

    if (!this.isSolved()) {
       this.status.set({ type: 'playing', message: `SYSTEM::HINT REVEALED A ${correctValue}` });
    }
  }

  solvePuzzle() {
    if (this.isWinning()) return;

    const boardCopy = JSON.parse(JSON.stringify(this.board()));
    
    if (this.solveBoard(boardCopy)) {
      this.board.set(boardCopy);
      this.validateBoard();
      this.stopTimer();
      this.status.set({ type: 'win', message: 'SYSTEM::SOLVED! MATRIX RECOMPILED.' });
      this.isWinning.set(true);
    } else {
      this.status.set({ type: 'error', message: 'ERROR::UNSOLVABLE STATE' });
    }
  }

  // --- PUZZLE SHARING ---
  sharePuzzle() {
    this.puzzleCode.set(this.encodeBoardToString(this.initialPuzzle()));
    this.shareButtonText.set('Copy Code');
    this.showShareModal.set(true);
  }

  copyShareCode() {
    navigator.clipboard.writeText(this.puzzleCode());
    this.shareButtonText.set('Copied!');
  }

  loadPuzzleFromCode() {
    const code = this.puzzleCode().trim();
    this.codeError.set(null);

    if (code.length !== 81 || !/^[0-9]+$/.test(code)) {
      this.codeError.set('Invalid code. Must be 81 digits.');
      return;
    }

    const puzzle = this.decodeStringToBoard(code);
    const puzzleCopy = JSON.parse(JSON.stringify(puzzle));
    const solutionCount = this.countSolutions(puzzleCopy);

    if (solutionCount !== 1) {
      this.codeError.set('Invalid puzzle. Code must have a unique solution.');
      return;
    }
    
    this.startGame('shared', puzzle);
  }

  private encodeBoardToString(board: Board): string {
    return board.flat().join('');
  }

  private decodeStringToBoard(code: string): Board {
    const board = this.createEmptyBoard();
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      board[row][col] = parseInt(code[i], 10);
    }
    return board;
  }

  // --- BOARD GENERATION & VALIDATION (2D) ---
  private solveBoard(board: Board): boolean {
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (board[r][c] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (this.isValid(board, r, c, num)) {
              board[r][c] = num;
              if (this.solveBoard(board)) {
                return true;
              }
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  private createEmptyBoard(): Board {
    return Array(this.SIZE).fill(0).map(() => Array(this.SIZE).fill(0));
  }
  private createEmptyConflicts(): Conflicts {
    return Array(this.SIZE).fill(false).map(() => Array(this.SIZE).fill(false));
  }
  
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  private countSolutions(board: Board): number {
    let count = 0;
    
    const findEmpty = (): { r: number, c: number } | null => {
      for (let r = 0; r < this.SIZE; r++) {
        for (let c = 0; c < this.SIZE; c++) {
          if (board[r][c] === 0) {
            return { r, c };
          }
        }
      }
      return null;
    };

    const solveCounter = (): void => {
      const emptyPos = findEmpty();
      if (!emptyPos) {
        count++;
        return;
      }

      const { r, c } = emptyPos;
      for (let num = 1; num <= 9 && count < 2; num++) {
        if (this.isValid(board, r, c, num)) {
          board[r][c] = num;
          solveCounter();
          board[r][c] = 0;
        }
      }
    };

    solveCounter();
    return count;
  }
  
  private generateSudoku(difficulty: Difficulty): { puzzle: Board, solved: Board } {
    const solved = this.createSolvedGrid();
    const puzzle = JSON.parse(JSON.stringify(solved));
    
    let cluesToRemove: number;
    switch(difficulty) {
      case 'easy':   cluesToRemove = 36; break;
      case 'medium': cluesToRemove = 48; break;
      case 'hard':   cluesToRemove = 52; break;
      default: cluesToRemove = 48;
    }
    
    const positions: { r: number, c: number }[] = [];
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        positions.push({ r, c });
      }
    }
    this.shuffleArray(positions);
    
    let removedCount = 0;
    for (const pos of positions) {
      if (removedCount >= cluesToRemove) break;

      const { r, c } = pos;
      const temp = puzzle[r][c];
      puzzle[r][c] = 0;
      
      const puzzleCopy = JSON.parse(JSON.stringify(puzzle));
      const solutionCount = this.countSolutions(puzzleCopy);
      
      if (solutionCount !== 1) {
        puzzle[r][c] = temp;
      } else {
        removedCount++;
      }
    }
    
    return { puzzle, solved };
  }
  
  private createSolvedGrid(): Board {
      const board = this.createEmptyBoard();
      this.solve(board);
      return board;
  }

  private solve(board: Board): boolean {
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (board[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (this.isValid(board, r, c, num)) {
              board[r][c] = num;
              if (this.solve(board)) {
                return true;
              }
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  private isValid(board: Board, r: number, c: number, num: number): boolean {
    for (let i = 0; i < this.SIZE; i++) {
      if (board[r][i] === num) return false;
      if (board[i][c] === num) return false;
    }
    const boxRowStart = Math.floor(r / 3) * 3;
    const boxColStart = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRowStart + i][boxColStart + j] === num) return false;
      }
    }
    return true;
  }

  private validateBoard() {
    const newConflicts = this.createEmptyConflicts();
    const board = this.board();
    let hasConflict = false;

    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        const val = board[r][c];
        if (val === 0) continue;
        if (!this.isValidForConflict(board, r, c, val)) {
          newConflicts[r][c] = true;
          hasConflict = true;
        }
      }
    }
    this.conflicts.set(newConflicts);
    if (!this.isSolved()) {
      this.status.set({ type: hasConflict ? 'error' : 'playing', message: hasConflict ? 'ERROR::CONFLICT DETECTED' : 'SYSTEM::AWAITING INPUT' });
    }
  }

  private isValidForConflict(board: Board, r: number, c: number, num: number): boolean {
    for (let i = 0; i < this.SIZE; i++) {
        if (i !== c && board[r][i] === num) return false;
        if (i !== r && board[i][c] === num) return false;
    }
    const boxRowStart = Math.floor(r / 3) * 3;
    const boxColStart = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((boxRowStart + i !== r || boxColStart + j !== c) && board[boxRowStart + i][boxColStart + j] === num) return false;
        }
    }
    return true;
  }

  // --- UI/STYLING ---
  getCellClasses(r: number, c: number): string {
    const sel = this.selectedCell();
    const isSelected = sel?.row === r && sel?.col === c;
    const cellValue = this.board()[r][c];
    const hasValue = cellValue !== 0;
    const selectedValue = sel ? this.board()[sel.row][sel.col] : 0;
    
    let isHighlighted = false;
    let isSameNumberHighlighted = false;

    if (sel && !isSelected) {
      if (sel.row === r || sel.col === c || (Math.floor(r / 3) === Math.floor(sel.row / 3) && Math.floor(c / 3) === Math.floor(sel.col / 3))) {
          isHighlighted = true;
      }
      if (hasValue && selectedValue !== 0 && cellValue === selectedValue) {
          isSameNumberHighlighted = true;
      }
    }
    
    let classes = 'aspect-square flex items-center justify-center text-lg sm:text-2xl font-bold transition-all duration-150 relative cursor-pointer [transform-style:preserve-3d] ';

    if (isSelected) {
      classes += 'bg-fuchsia-800/80 text-white z-10 shadow-inner shadow-fuchsia-500/70 rounded-md [transform:translateZ(-20px)] ';
    } else if (isSameNumberHighlighted) {
      classes += 'bg-cyan-400/60 rounded-md ';
    } else if (isHighlighted) {
      classes += 'bg-cyan-900/50 ';
    } else {
      classes += 'bg-transparent hover:bg-cyan-400/20 rounded-md ';
    }

    if (this.conflicts()[r][c] && hasValue) {
      classes += 'text-red-400 text-glow-fuchsia ring-2 ring-red-500/70 ring-inset animate-shake ';
    } else if (this.initialPuzzle()[r][c] !== 0) {
      classes += 'text-yellow-400 font-semibold ';
    } else {
      classes += 'text-cyan-300 ';
    }
    
    if ((r + 1) % 3 === 0 && r < this.SIZE - 1) classes += 'border-b-2 border-cyan-800/70 ';
    if ((c + 1) % 3 === 0 && c < this.SIZE - 1) classes += 'border-r-2 border-cyan-800/70 ';

    return classes;
  }

  // --- TIMER ---
  startTimer() {
    this.stopTimer();
    this.startTime = Date.now();
    this.elapsedTime.set('00:00');
    this.timerId = setInterval(() => {
      const seconds = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.elapsedTime.set(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // --- LEADERBOARD ---
  loadLeaderboard() {
    const data = localStorage.getItem('sudoku-leaderboard');
    if (data) {
      const scores: Score[] = JSON.parse(data);
      scores.sort((a, b) => {
        const timeA = a.time.split(':').reduce((acc, val) => acc * 60 + +val, 0);
        const timeB = b.time.split(':').reduce((acc, val) => acc * 60 + +val, 0);
        return timeA - timeB;
      });
      this.leaderboard.set(scores);
    }
  }

  saveScore() {
    const name = this.playerName().trim();
    if (!name) {
      this.playerName.set('ANONYMOUS');
    }
    const newScore: Score = {
      name: this.playerName() || 'ANONYMOUS',
      time: this.elapsedTime(),
      difficulty: this.gameDifficulty(),
      date: Date.now()
    };
    const scores = [...this.leaderboard(), newScore];
    localStorage.setItem('sudoku-leaderboard', JSON.stringify(scores));
    this.loadLeaderboard();
    this.isWinning.set(false);
    this.showPage('leaderboard');
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  // --- SETTINGS ---
  toggleSetting(setting: keyof Settings) {
    this.settings.update(s => ({ ...s, [setting]: !s[setting] }));
  }
}