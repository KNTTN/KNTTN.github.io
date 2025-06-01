export function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  export function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  export function smoothLerp(a, b, t) {
    return lerp(a,b, t**2 * (-2*t + 3));
  }
  
  export function drawCenteredRect(ctx, width, height) {
    const x = (ctx.canvas.width - width) / 2;
    const y = (ctx.canvas.height - height) / 2;
    ctx.fillRect(x, y, width, height);
  }

  export function drawRect(ctx, x1, y1, x2, y2) {
    const width = x2 - x1;
    const height = y2 - y1;
    ctx.fillRect(x1, y1, width, height);
  }

export function drawCircle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

export class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Add another vector
    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    // Subtract another vector
    sub(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    // Multiply by scalar
    mult(n) {
        return new Vector2D(this.x * n, this.y * n);
    }

    // Dot product with another vector
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    // Get magnitude (length)
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // Normalize vector (make length 1)
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            return this.div(m);
        }
        return new Vector2D(0, 0);
    }

    // Linear interpolation between vectors
    lerp(v, t) {
        return new Vector2D(
            lerp(this.x, v.x, t),
            lerp(this.y, v.y, t)
        );
    }

    // Copy vector
    copy() {
        return new Vector2D(this.x, this.y);
    }

    // Static methods
    static random() {
        return new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }

    static fromAngle(angle) {
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }
}