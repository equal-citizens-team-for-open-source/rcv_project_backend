import Ballot from './Ballot';
import {
  CandidateAction,
  ElectionType,
  IElectedSeat,
  IVoteTallier,
  IVotingRoundReport,
  VoteTuple,
} from '../types';

// seems obvious, but best practice is to avoid "magic numbers";
const ZERO_PERCENT = 0.0;

export default class VoteTallier {
  private ballots: Ballot[];
  private electionType: ElectionType = ElectionType.InstantRunoff;
  private seats: number = 1;
  private quota: number = 0;
  private round: number = 1;
  private reports: IVotingRoundReport[] = [];

  constructor(data: IVoteTallier) {
    this.ballots = Object.entries(data.votes).map(
      ([candidates, voteCount]) => new Ballot(candidates, voteCount)
    );

    if (data.seats) {
      this.seats = data.seats;
    }
    if (data.electionType) {
      this.electionType = data.electionType;
    }
    const totalVotes: number = Object.values(data.votes).reduce(
      (pv: number, cv: number): number => pv + cv,
      0
    );
    this.quota = Math.floor(totalVotes / (this.seats + 1)) + 1;
  }

  public debug = () => {
    const { ballots, electionType, seats, quota, round, reports } = this;
    return {
      ballots,
      electionType,
      seats,
      quota,
      round,
      reports,
    };
  };

  // recursive
  private tallyVotes = (): void => {
    const initialReport: IVotingRoundReport = this.getInitialReport();
    if (this.seats <= 0 || Object.keys(initialReport.results).length === 0) {
      // if we've already assigned all the seats,
      return this.finalReport(initialReport); // returns void.
    }
    const voteValues = Object.values(initialReport.results);
    // if we have an equal number of seats and candidates
    if (voteValues.length === this.seats) {
      this.assignSeatsByDefault(initialReport);
    } else if (voteValues.some((res: number) => res >= this.quota)) {
      this.assignSeat(initialReport);
    } else {
      this.eliminateLastCandidate(initialReport);
    }
    this.tallyVotes(); // call recursively, do not return to save callstack.
  };

  private finalReport = (initialReport: IVotingRoundReport): void => {
    this.reports.push({ round: this.round, results: initialReport.results });
  };

  private getInitialReport = (): IVotingRoundReport => {
    // get this round's ballot in the form of a report
    this.ballots = this.ballots.filter(
      (ballot: Ballot) => ballot.candidates.length > 0
    );
    return this.ballots.reduce(
      (runningCount: IVotingRoundReport, currentBallot: Ballot) => {
        const candidate: string = currentBallot.candidates[0]; // this round's choice
        if (!runningCount.results[candidate]) {
          runningCount.results[candidate] = 0;
        }
        // currentBallot.weight is always 1 on the first ballot,
        // but could be a fraction if we're reassigning a surplus, proportionally.
        runningCount.results[candidate] += currentBallot.getWeight();
        return runningCount;
      },
      { round: this.round, results: {} }
    );
  };

  private assignSeat = (initialReport: IVotingRoundReport): void => {
    const { results } = initialReport;
    const report: IVotingRoundReport = { ...initialReport };
    const [winner, winnerCount] = Object.entries(results).reduce(
      ([prevCand, prevCount]: VoteTuple, [cand, count]: VoteTuple) => {
        return count > prevCount ? [cand, count] : [prevCand, prevCount];
      }
    );
    // we can assign multiple seats to the same candidate in a Dem Primary,
    // otherwise the max is 1.
    const seatsAssigned: number =
      this.electionType === ElectionType.DemocraticPrimary
        ? Math.floor(winnerCount / this.quota)
        : 1;

    const elected: IElectedSeat = {
      candidate: winner,
      action: CandidateAction.elected,
      round: this.round,
      seats: seatsAssigned,
      votesTransferred: winnerCount - seatsAssigned * this.quota,
    };
    // this, along with the existing weight, will determine the new weight of the ballot;
    const surplusPercentage: number = elected.votesTransferred / winnerCount;
    this.ballots.forEach(ballot =>
      ballot.assignElected(winner, surplusPercentage)
    );
    report.outcome = elected;
    this.reports.push(report);
    this.round += 1; // increment the round;
    this.seats += -1; // decrement the number of available seats; Do not change the quota;
  };

  // in the rare scenario where no candidate can pass the quota but there
  // are seats remaining, assign the first seat to the top candidate remaining.
  private assignSeatsByDefault = (initialReport: IVotingRoundReport) => {
    const { results } = initialReport;
    const report: IVotingRoundReport = { ...initialReport };
    const winner = Object.entries(results).reduce(
      ([prevCand, prevCount]: VoteTuple, [cand, count]: VoteTuple) => {
        return count > prevCount ? [cand, count] : [prevCand, prevCount];
      }
    )[0];
    const defaultElected: IElectedSeat = {
      candidate: winner,
      action: CandidateAction.assigned,
      round: this.round,
      seats: 1,
      votesTransferred: 0,
    };
    // we do not transfer votes in this scenario, so set the weight of all ballots of the winner to 0;
    // assigning it normally would result in a negative number.
    this.ballots.forEach(ballot => ballot.assignElected(winner, ZERO_PERCENT));
    report.outcome = defaultElected;
    this.reports.push(report);
    this.round += 1; // increment the round;
    this.seats += -1; // decrement the number of available seats; Do not change the quota;
  };

  private eliminateLastCandidate = (
    initialReport: IVotingRoundReport
  ): void => {
    const { results } = initialReport;
    const report = { ...initialReport };
    // find the candidates with the least votes;
    const [loser, loserVotes] = Object.entries(results).reduce(
      ([prevCand, prevCount]: VoteTuple, [cand, count]: VoteTuple) => {
        return count < prevCount ? [cand, count] : [prevCand, prevCount];
      }
    );
    const lost: IElectedSeat = {
      candidate: loser,
      action: CandidateAction.eliminated,
      votesTransferred: loserVotes,
      round: this.round,
      seats: 0,
    };
    report.outcome = lost;
    this.reports.push(report);
    this.ballots.forEach(ballot => ballot.eliminateCandidate(loser));
    this.round += 1;
  };
}
