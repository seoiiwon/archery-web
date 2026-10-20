import { BowController } from "./BowController";
/** Input/identity only. Match history is indexed independently by player ID. */
export class Player {
  readonly bow = new BowController();
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}
