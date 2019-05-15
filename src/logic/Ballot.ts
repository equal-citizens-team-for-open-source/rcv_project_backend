export default class Ballot {
  private weight: number = 1.0;
  public candidates: string[];
  constructor(candidates: string, voteCount: number) {
    this.weight = voteCount;
    this.candidates = JSON.parse(candidates);
  }

  public getWeight = (): number => this.weight;

  public assignElected = (winner: string, surplusPercentage: number) => {
    if (this.candidates[0] === winner) {
      this.weight = this.weight * surplusPercentage;
    }
    this.eliminateCandidate(winner);
  };

  public eliminateCandidate = (eliminatedCandidate: string) => {
    this.candidates = this.candidates.filter(
      (candidate: string) => candidate !== eliminatedCandidate
    );
  };

  public readBallot = () => ({
    weight: this.weight,
    candidates: this.candidates,
  });
}
