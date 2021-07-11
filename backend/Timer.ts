

export class Timer {
    private startTime: number;

    constructor() {
        this.startTimer();
    }

    public startTimer(): void {
        this.startTime = Date.now();
    }

    public getElapsed(): number {
        return Date.now() - this.startTime;
    }

    public setElapsed(time: number): void {
        this.startTime = Date.now() - time;
    }
}