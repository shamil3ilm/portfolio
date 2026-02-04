import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

@Component({
    selector: 'app-mouse-follower',
    standalone: true,
    imports: [CommonModule],
    template: `
    <canvas #canvas [class.light-mode]="!themeService.isDarkMode()"></canvas>
  `,
    styles: [`
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      mix-blend-mode: screen;
      opacity: 0.6;
      
      &.light-mode {
        mix-blend-mode: multiply;
        opacity: 0.3;
      }
    }
  `]
})
export class MouseFollowerComponent implements OnInit, OnDestroy {
    @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
    themeService = inject(ThemeService);

    private ctx!: CanvasRenderingContext2D;
    private particles: Particle[] = [];
    private animationId: number = 0;
    private mouseX = 0;
    private mouseY = 0;

    // Theme colors + Antigravity inspired accents
    private colors = [
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#0ea5e9', // Sky (darker for light mode)
        '#FBBC04', // Yellow (Antigravity accent)
        '#34A853', // Green (Antigravity accent)
        '#EA4335'  // Red (Antigravity accent)
    ];

    constructor(private ngZone: NgZone) { }

    ngOnInit() {
        this.initCanvas();
        this.createParticles();
        this.animate();
    }

    ngOnDestroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    @HostListener('window:resize')
    onResize() {
        this.initCanvas();
        this.createParticles();
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    private initCanvas() {
        const canvas = this.canvasRef.nativeElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.ctx = canvas.getContext('2d')!;
    }

    private createParticles() {
        const particleCount = window.innerWidth < 768 ? 40 : 80;
        this.particles = [];

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                color: this.colors[Math.floor(Math.random() * this.colors.length)]
            });
        }
    }

    private animate() {
        this.ngZone.runOutsideAngular(() => {
            const loop = () => {
                this.draw();
                this.update();
                this.animationId = requestAnimationFrame(loop);
            };
            loop();
        });
    }

    private draw() {
        const canvas = this.canvasRef.nativeElement;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });
    }

    private update() {
        const width = this.canvasRef.nativeElement.width;
        const height = this.canvasRef.nativeElement.height;

        this.particles.forEach(p => {
            // Base movement
            p.x += p.vx;
            p.y += p.vy;

            // Mouse interaction (Repel/Swirl effect)
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 200;

            if (distance < maxDistance) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (maxDistance - distance) / maxDistance;
                const directionX = forceDirectionX * force * 5; // Strength
                const directionY = forceDirectionY * force * 5;

                // Push away
                p.x -= directionX;
                p.y -= directionY;
            }

            // Edge wrapping
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        });
    }
}
