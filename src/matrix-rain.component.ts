import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

@Component({
  selector: 'matrix-rain-bg',
  standalone: true,
  template: `
    <canvas #canvas class="fixed top-0 left-0 w-full h-full z-0"></canvas>
  `,
})
export class MatrixRainComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId!: number;

  private columns = 0;
  private drops: number[] = [];
  private words = [
    'CYBERPUNK', 'NEON', 'MATRIX', 'CHROME', 'NETRUNNER', 'GLITCH', 
    'CODE', 'SYSTEM', 'DATA', 'AI', 'VIRTUAL', 'HACK', 'RUNTIME', 
    'AUGMENTED', 'PROTOCOL', 'NODE', 'ICE', 'DAEMON'
  ];
  private fontSize = 16;
  private wordColor = '#00f0f0'; // Neon Cyan

  // Interactive properties
  private mouse = { x: -200, y: -200 };
  private interactionRadius = 180; // Make the effect radius larger

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setup();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
  }

  @HostListener('window:resize')
  onResize() {
    this.setup();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.mouse.x = -200;
    this.mouse.y = -200;
  }

  private setup() {
    this.canvasRef.nativeElement.width = window.innerWidth;
    this.canvasRef.nativeElement.height = window.innerHeight;
    this.columns = Math.floor(this.canvasRef.nativeElement.width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = 1 + Math.random() * this.canvasRef.nativeElement.height;
    }
  }

  private draw() {
    // Semi-transparent black background for a fading effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    for (let i = 0; i < this.drops.length; i++) {
      const text = this.words[Math.floor(Math.random() * this.words.length)];
      const xPos = i * this.fontSize;
      const yPos = this.drops[i] * this.fontSize;

      // Calculate distance to mouse
      const dx = xPos - this.mouse.x;
      const dy = yPos - this.mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.interactionRadius) {
        // Interactive style with a smooth falloff
        const proximity = Math.max(0, 1 - (distance / this.interactionRadius)); // 1 at center, 0 at edge
        
        // Interpolate color from default cyan (#00F0F0) to bright white
        const r = Math.round(0 + 255 * proximity);
        const g = Math.round(240 + 15 * proximity);
        const b = Math.round(240 + 15 * proximity);
        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Interpolate font size
        const interactiveFontSize = this.fontSize + (18 * proximity); // Increased font size effect
        this.ctx.font = `${interactiveFontSize}px 'Share Tech Mono', monospace`;
        
        // Interpolate shadow for a glow effect
        this.ctx.shadowColor = `rgba(220, 255, 255, ${proximity})`; 
        this.ctx.shadowBlur = 30 * proximity; // Increased glow
        
        this.ctx.fillText(text, xPos, yPos);
        
        // Reset shadow for the next iteration
        this.ctx.shadowBlur = 0;
      } else {
        // Default style
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = this.wordColor;
        this.ctx.font = `${this.fontSize}px 'Share Tech Mono', monospace`;
        this.ctx.fillText(text, xPos, yPos);
      }

      // Resetting the drop when it reaches the bottom of the screen
      if (yPos > this.canvasRef.nativeElement.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }

      this.drops[i]++;
    }
  }

  private animate = () => {
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
}