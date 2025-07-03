import { HEIGHT, WIDTH, ballRadius, obstacleRadius } from '../constants';
import { createObstacles, createSinks } from '../objects';
import type { Obstacle, Sink, Risk } from '../objects';
import { pad, unpad } from '../padding';
import { Ball } from './balls';

export class BallManager {
  private balls: Ball[];
  private canvasRef: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private obstacles: Obstacle[];
  private sinks: Sink[];
  private risk: Risk;
  private requestId?: number;
  private onFinish?: (index: number, startX?: number) => void;

  constructor(
    canvasRef: HTMLCanvasElement,
    rows: number,
    risk: Risk = 'Low',
    onFinish?: (index: number, startX?: number) => void
  ) {
    this.balls = [];
    this.canvasRef = canvasRef;
    const ctx = this.canvasRef.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas!');
    this.ctx = ctx;
    this.risk = risk;
    this.obstacles = createObstacles(rows);
    this.sinks = createSinks(rows, risk);
    this.update();
    this.onFinish = onFinish;
  }

  addBall(startX?: number) {
    const newBall = new Ball(
      startX || pad(WIDTH / 2 + 13),
      pad(50),
      ballRadius,
      'red',
      this.ctx,
      this.obstacles,
      this.sinks,
      index => {
        this.balls = this.balls.filter(ball => ball !== newBall);
        this.onFinish?.(index, startX);
      }
    );
    this.balls.push(newBall);
  }

  drawObstacles() {
    this.ctx.fillStyle = 'white';
    this.obstacles.forEach(obstacle => {
      this.ctx.beginPath();
      this.ctx.arc(
        unpad(obstacle.x),
        unpad(obstacle.y),
        obstacle.radius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.closePath();
    });
  }

  getColor(index: number) {
    if (index < 3 || index > this.sinks.length - 3) {
      return { background: '#ff003f', color: 'white' };
    }
    if (index < 6 || index > this.sinks.length - 6) {
      return { background: '#ff7f00', color: 'white' };
    }
    if (index < 9 || index > this.sinks.length - 9) {
      return { background: '#ffbf00', color: 'black' };
    }
    if (index < 12 || index > this.sinks.length - 12) {
      return { background: '#ffff00', color: 'black' };
    }
    if (index < 15 || index > this.sinks.length - 15) {
      return { background: '#bfff00', color: 'black' };
    }
    return { background: '#7fff00', color: 'black' };
  }
  drawSinks() {
    const dynamicRadius = this.obstacles[0]?.radius ?? obstacleRadius;
    const SPACING = dynamicRadius * 2;

    for (let i = 0; i < this.sinks.length; i++) {
      const sink = this.sinks[i];
      const colorSet = this.getColor(i);

      const width = sink.width - SPACING;
      const height = sink.height;
      const radius = 8;
      const shadowColor = 'rgba(0,0,0,0.2)';

      this.drawRoundedRect(
        sink.x,
        sink.y - height / 2,
        width,
        height,
        radius,
        colorSet.background,
        shadowColor,
        `${sink.multiplier}x`,
        colorSet.color
      );
    }
  }

  drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor: string,
    shadowColor: string,
    text: string,
    textColor: string
  ) {
    this.ctx.fillStyle = shadowColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + radius);
    this.ctx.arcTo(x, y + height, x + radius, y + height, radius);
    this.ctx.arcTo(
      x + width,
      y + height,
      x + width,
      y + height - radius,
      radius
    );
    this.ctx.arcTo(x + width, y, x + width - radius, y, radius);
    this.ctx.arcTo(x, y, x, y + radius, radius);
    this.ctx.closePath();
    this.ctx.fill();

    const offsetY = -4;
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + offsetY + radius);
    this.ctx.arcTo(
      x,
      y + offsetY + height,
      x + radius,
      y + offsetY + height,
      radius
    );
    this.ctx.arcTo(
      x + width,
      y + offsetY + height,
      x + width,
      y + offsetY + height - radius,
      radius
    );
    this.ctx.arcTo(
      x + width,
      y + offsetY,
      x + width - radius,
      y + offsetY,
      radius
    );
    this.ctx.arcTo(x, y + offsetY, x, y + offsetY + radius, radius);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + width / 2, y + offsetY + height / 2);
  }

  draw() {
    this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawObstacles();
    this.drawSinks();
    this.balls.forEach(ball => {
      ball.draw();
      ball.update();
    });
  }

  update() {
    this.draw();
    this.requestId = requestAnimationFrame(this.update.bind(this));
  }

  stop() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
  }
}
