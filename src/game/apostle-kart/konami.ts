export type KonamiCallback = () => void;

export class KonamiCodeDetector {
  private readonly targetSequence: readonly string[] = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "KeyB",
    "KeyA",
  ];

  private readonly wasdSequence: readonly string[] = [
    "KeyW",
    "KeyW",
    "KeyS",
    "KeyS",
    "KeyA",
    "KeyD",
    "KeyA",
    "KeyD",
    "KeyB",
    "KeyA",
  ];

  private currentBuffer: string[] = [];
  private readonly onTrigger: KonamiCallback;
  private gamepadPrevButtons = new Set<number>();
  private gamepadBuffer: number[] = [];
  // Standard Gamepad indices: 12=Up, 13=Down, 14=Left, 15=Right, 1=B, 0=A
  private readonly gamepadSequence: readonly number[] = [
    12, 12, 13, 13, 14, 15, 14, 15, 1, 0,
  ];

  constructor(onTrigger: KonamiCallback) {
    this.onTrigger = onTrigger;
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDown);

      // Check URL query parameters for instant developer / playtest convenience
      if (
        window.location.search.includes("kart") ||
        window.location.search.includes("konami")
      ) {
        setTimeout(() => {
          this.trigger();
        }, 150);
      }
    }
  }

  public handleKey(codeOrKey: string) {
    let code = codeOrKey;
    if (code === "b" || code === "B") code = "KeyB";
    if (code === "a" || code === "A") code = "KeyA";

    this.currentBuffer.push(code);

    if (this.currentBuffer.length > 20) {
      this.currentBuffer.shift();
    }

    if (
      this.matchesSequence(this.targetSequence) ||
      this.matchesSequence(this.wasdSequence)
    ) {
      this.currentBuffer = [];
      this.trigger();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.handleKey(e.code || e.key);
  };

  private matchesSequence(seq: readonly string[]): boolean {
    if (this.currentBuffer.length < seq.length) return false;
    const slice = this.currentBuffer.slice(-seq.length);
    for (let i = 0; i < seq.length; i++) {
      if (slice[i] !== seq[i]) return false;
    }
    return true;
  }

  public updateGamepad(gamepad?: Gamepad | null) {
    if (!gamepad) return;

    gamepad.buttons.forEach((btn, index) => {
      const isPressed = btn.pressed;
      const wasPressed = this.gamepadPrevButtons.has(index);

      if (isPressed && !wasPressed) {
        // Just pressed
        this.gamepadPrevButtons.add(index);
        this.gamepadBuffer.push(index);
        if (this.gamepadBuffer.length > 20) this.gamepadBuffer.shift();

        // Check gamepad sequence
        if (this.gamepadBuffer.length >= this.gamepadSequence.length) {
          const slice = this.gamepadBuffer.slice(-this.gamepadSequence.length);
          let match = true;
          for (let i = 0; i < this.gamepadSequence.length; i++) {
            if (slice[i] !== this.gamepadSequence[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            this.gamepadBuffer = [];
            this.trigger();
          }
        }
      } else if (!isPressed && wasPressed) {
        this.gamepadPrevButtons.delete(index);
      }
    });
  }

  public trigger() {
    this.onTrigger();
  }

  public dispose() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }
}
