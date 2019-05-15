import { range } from 'lodash';
import VoteTallier from './VoteTallier';
import { ElectionType, CandidateAction } from '../types';
import Ballot from './Ballot';

const consolidator = (votes: string[][]) => {
  const stringifiedVotes = votes.map(vote => JSON.stringify(vote));
  return stringifiedVotes.reduce(
    (pv: { [key: string]: number }, cv: string) => {
      if (!pv[cv]) {
        pv[cv] = 0;
      }
      pv[cv] += 1;
      return pv;
    },
    {}
  );
};

const genVotes = (): { [key: string]: number } => {
  const votes: string[][] = [];
  range(40).forEach(() => {
    votes.push(['ALPHA', 'BETA', 'GAMMA']);
  });
  range(42).forEach(() => {
    votes.push(['ALPHA', 'GAMMA', 'BETA']);
  });
  range(44).forEach(() => {
    votes.push(['BETA', 'ALPHA', 'GAMMA']);
  });
  range(46).forEach(() => {
    votes.push(['GAMMA', 'ALPHA', 'BETA']);
  });
  range(48).forEach(() => {
    votes.push(['GAMMA', 'BETA', 'ALPHA']);
  });
  return consolidator(votes);
};

const genPrimary = (): { [key: string]: number } => {
  const votes: string[][] = [];
  range(400).forEach(() => {
    votes.push(['ALPHA', 'BETA', 'GAMMA']);
  });
  range(420).forEach(() => {
    votes.push(['ALPHA', 'GAMMA', 'BETA']);
  });
  range(440).forEach(() => {
    votes.push(['BETA', 'ALPHA', 'GAMMA']);
  });
  range(460).forEach(() => {
    votes.push(['GAMMA', 'ALPHA', 'BETA']);
  });
  range(480).forEach(() => {
    votes.push(['GAMMA', 'BETA', 'ALPHA']);
  });
  range(400).forEach(() => {
    votes.push(['DELTA', 'BETA', 'GAMMA']);
  });
  range(420).forEach(() => {
    votes.push(['DELTA', 'GAMMA', 'BETA']);
  });
  range(440).forEach(() => {
    votes.push(['BETA', 'DELTA', 'GAMMA']);
  });
  range(460).forEach(() => {
    votes.push(['GAMMA', 'DELTA', 'BETA']);
  });
  range(480).forEach(() => {
    votes.push(['GAMMA', 'BETA', 'DELTA']);
  });
  range(400).forEach(() => {
    votes.push(['DELTA', 'EPSILON', 'GAMMA']);
  });
  range(420).forEach(() => {
    votes.push(['DELTA', 'GAMMA', 'EPSILON']);
  });
  range(440).forEach(() => {
    votes.push(['EPSILON', 'DELTA', 'GAMMA']);
  });
  range(460).forEach(() => {
    votes.push(['GAMMA', 'DELTA', 'EPSILON']);
  });
  range(480).forEach(() => {
    votes.push(['GAMMA', 'EPSILON', 'DELTA']);
  });
  range(400).forEach(() => {
    votes.push(['ALPHA', 'EPSILON', 'GAMMA']);
  });
  range(420).forEach(() => {
    votes.push(['ALPHA', 'ZETA', 'BETA']);
  });
  range(440).forEach(() => {
    votes.push(['BETA', 'ALPHA', 'ZETA']);
  });
  range(460).forEach(() => {
    votes.push(['ZETA', 'ALPHA', 'BETA']);
  });
  range(480).forEach(() => {
    votes.push(['ZETA', 'BETA', 'ALPHA']);
  });
  return consolidator(votes);
};

const sample: { [key: string]: number } = genVotes();
const data: any = {};

describe('genVotes', () => {
  it('has the right lengths', () => {
    expect(sample).toEqual({
      '["ALPHA","BETA","GAMMA"]': 40,
      '["ALPHA","GAMMA","BETA"]': 42,
      '["BETA","ALPHA","GAMMA"]': 44,
      '["GAMMA","ALPHA","BETA"]': 46,
      '["GAMMA","BETA","ALPHA"]': 48,
    });
  });
});

describe('class VoteTallier', () => {
  describe('VoteTallier.constructor()', () => {
    it('constructs a basic instant runoff vote', () => {
      data.test1 = new VoteTallier({ votes: sample });
      const results1 = data.test1.debug();
      expect(
        results1.ballots.map(
          (ballot: Ballot): { [key: string]: number } => ({
            [JSON.stringify(ballot.candidates)]: ballot.getWeight(),
          })
        )
      ).toEqual([
        { '["ALPHA","BETA","GAMMA"]': 40 },
        { '["ALPHA","GAMMA","BETA"]': 42 },
        { '["BETA","ALPHA","GAMMA"]': 44 },
        { '["GAMMA","ALPHA","BETA"]': 46 },
        { '["GAMMA","BETA","ALPHA"]': 48 },
      ]);
      expect(results1.seats).toEqual(1);
      expect(results1.quota).toEqual(111);
    });
    it('constructs a multiseat vote', () => {
      data.test2 = new VoteTallier({
        votes: sample,
        electionType: ElectionType.MultiSeat,
        seats: 2,
      });
      const results2 = data.test2.debug();
      expect(
        results2.ballots.map((ballot: Ballot) => ({
          candidates: ballot.candidates,
          weight: ballot.getWeight(),
        }))
      ).toEqual([
        { candidates: ['ALPHA', 'BETA', 'GAMMA'], weight: 40 },
        { candidates: ['ALPHA', 'GAMMA', 'BETA'], weight: 42 },
        { candidates: ['BETA', 'ALPHA', 'GAMMA'], weight: 44 },
        { candidates: ['GAMMA', 'ALPHA', 'BETA'], weight: 46 },
        { candidates: ['GAMMA', 'BETA', 'ALPHA'], weight: 48 },
      ]);
      expect(results2.seats).toEqual(2);
      expect(results2.quota).toEqual(74);
    });
  });
  describe('VoteTallier.getInitialReport', () => {
    it('calculates the value of a round', () => {
      const round = data.test1.getInitialReport();
      data.expected = {
        round: 1,
        results: {
          ALPHA: 82,
          BETA: 44,
          GAMMA: 94,
        },
      };
      expect(round).toEqual(data.expected);
    });
  });
  describe('VoteTallier.tallyVotes()', () => {
    it('correctly tallies Instant Runoff', async () => {
      data.test1.tallyVotes();
      const { reports } = data.test1.debug();
      expect(reports).toEqual([
        {
          round: 1,
          results: { ALPHA: 82, BETA: 44, GAMMA: 94 },
          outcome: {
            candidate: 'BETA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 44,
            round: 1,
            seats: 0,
          },
        },
        {
          round: 2,
          results: { ALPHA: 126, GAMMA: 94 },
          outcome: {
            candidate: 'ALPHA',
            action: 'ELECTED - MET QUOTA',
            round: 2,
            seats: 1,
            votesTransferred: 15,
          },
        },
        { round: 3, results: { GAMMA: 109 } },
      ]);
    });
    it('correctly tallies STV', async () => {
      data.test2.tallyVotes();
      const { reports } = data.test2.debug();

      expect(reports).toEqual([
        {
          round: 1,
          results: { ALPHA: 82, BETA: 44, GAMMA: 94 },
          outcome: {
            candidate: 'GAMMA',
            action: 'ELECTED - MET QUOTA',
            round: 1,
            seats: 1,
            votesTransferred: 20,
          },
        },
        {
          round: 2,
          results: { ALPHA: 91.7872340425532, BETA: 54.212765957446805 },
          outcome: {
            candidate: 'ALPHA',
            action: 'ELECTED - MET QUOTA',
            round: 2,
            seats: 1,
            votesTransferred: 17.787234042553195,
          },
        },
        { round: 3, results: { BETA: 72 } },
      ]);
    });
  });
  describe('correctly works with a larger data set', () => {
    data.bigIRV = new VoteTallier({ votes: genPrimary() });
    data.bigSTV = new VoteTallier({
      votes: genPrimary(),
      electionType: ElectionType.MultiSeat,
      seats: 3,
    });
    data.bigPrimary = new VoteTallier({
      votes: genPrimary(),
      electionType: ElectionType.DemocraticPrimary,
      seats: 24,
    });
    it('works for IRV', async () => {
      data.bigIRV.tallyVotes();
      const { reports } = data.bigIRV.debug();

      expect(reports).toEqual([
        {
          round: 1,
          results: {
            ALPHA: 1640,
            BETA: 1320,
            GAMMA: 2820,
            DELTA: 1640,
            EPSILON: 440,
            ZETA: 940,
          },
          outcome: {
            candidate: 'EPSILON',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 440,
            round: 1,
            seats: 0,
          },
        },
        {
          round: 2,
          results: {
            ALPHA: 1640,
            BETA: 1320,
            GAMMA: 2820,
            DELTA: 2080,
            ZETA: 940,
          },
          outcome: {
            candidate: 'ZETA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 940,
            round: 2,
            seats: 0,
          },
        },
        {
          round: 3,
          results: { ALPHA: 2100, BETA: 1800, GAMMA: 2820, DELTA: 2080 },
          outcome: {
            candidate: 'BETA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 1800,
            round: 3,
            seats: 0,
          },
        },
        {
          round: 4,
          results: { ALPHA: 3460, GAMMA: 2820, DELTA: 2520 },
          outcome: {
            candidate: 'DELTA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 2520,
            round: 4,
            seats: 0,
          },
        },
        {
          round: 5,
          results: { ALPHA: 3460, GAMMA: 5340 },
          outcome: {
            candidate: 'GAMMA',
            action: 'ELECTED - MET QUOTA',
            round: 5,
            seats: 1,
            votesTransferred: 939,
          },
        },
        { round: 6, results: { ALPHA: 3625.2921348314603 } },
      ]);
    });
    it('works for STV', () => {
      data.bigSTV.tallyVotes();
      const { reports } = data.bigSTV.debug();

      expect(reports).toEqual([
        {
          round: 1,
          results: {
            ALPHA: 1640,
            BETA: 1320,
            GAMMA: 2820,
            DELTA: 1640,
            EPSILON: 440,
            ZETA: 940,
          },
          outcome: {
            candidate: 'GAMMA',
            action: 'ELECTED - MET QUOTA',
            round: 1,
            seats: 1,
            votesTransferred: 619,
          },
        },
        {
          round: 2,
          results: {
            ALPHA: 1740.9716312056737,
            BETA: 1530.723404255319,
            DELTA: 1841.9432624113474,
            EPSILON: 545.3617021276596,
            ZETA: 940,
          },
          outcome: {
            candidate: 'EPSILON',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 545.3617021276596,
            round: 2,
            seats: 0,
          },
        },
        {
          round: 3,
          results: {
            ALPHA: 1740.9716312056737,
            BETA: 1530.723404255319,
            DELTA: 2387.304964539007,
            ZETA: 940,
          },
          outcome: {
            candidate: 'DELTA',
            action: 'ELECTED - MET QUOTA',
            round: 3,
            seats: 1,
            votesTransferred: 186.30496453900696,
          },
        },
        {
          round: 4,
          results: {
            ALPHA: 1740.9716312056737,
            BETA: 1602.59590887533,
            ZETA: 940,
          },
          outcome: {
            candidate: 'ZETA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 940,
            round: 4,
            seats: 0,
          },
        },
        {
          round: 5,
          results: { ALPHA: 2200.9716312056735, BETA: 2082.5959088753298 },
          outcome: {
            candidate: 'BETA',
            action: 'ELIMINATED - FEWEST VOTES',
            votesTransferred: 2082.5959088753298,
            round: 5,
            seats: 0,
          },
        },
        {
          round: 6,
          results: { ALPHA: 3666.333333333333 },
          outcome: {
            candidate: 'ALPHA',
            action: 'ELECTED - OTHER CANDIDATES ELIMINATED',
            round: 6,
            seats: 1,
            votesTransferred: 0,
          },
        },
        { round: 7, results: {} },
      ]);
    });
    it('works for a Primary', () => {
      const initialSeats = data.bigPrimary.debug().seats;
      data.bigPrimary.tallyVotes();
      const { reports } = data.bigPrimary.debug();
      const totalDelegatesAssigned = reports.reduce((pv: number, cv: any) => {
        if (!cv.outcome || cv.outcome.action === CandidateAction.eliminated) {
          return pv;
        }
        if (
          cv.outcome.action === CandidateAction.elected ||
          cv.outcome.action === CandidateAction.assigned
        ) {
          return pv + cv.outcome.seats;
        }
        return pv;
      }, 0);
      expect(totalDelegatesAssigned).toBe(initialSeats); // sanity check.

      expect(reports).toEqual([
        {
          round: 1,
          results: {
            ALPHA: 1640,
            BETA: 1320,
            GAMMA: 2820,
            DELTA: 1640,
            EPSILON: 440,
            ZETA: 940,
          },
          outcome: {
            candidate: 'GAMMA',
            action: 'ELECTED - MET QUOTA',
            round: 1,
            seats: 7,
            votesTransferred: 349,
          },
        },
        {
          round: 2,
          results: {
            ALPHA: 1696.9290780141844,
            BETA: 1438.8085106382978,
            DELTA: 1753.8581560283687,
            EPSILON: 499.40425531914894,
            ZETA: 940,
          },
          outcome: {
            candidate: 'DELTA',
            action: 'ELECTED - MET QUOTA',
            round: 2,
            seats: 4,
            votesTransferred: 341.85815602836874,
          },
        },
        {
          round: 3,
          results: {
            ALPHA: 1696.9290780141844,
            BETA: 1609.7375886524821,
            EPSILON: 670.3333333333334,
            ZETA: 940,
          },
          outcome: {
            candidate: 'ALPHA',
            action: 'ELECTED - MET QUOTA',
            round: 3,
            seats: 4,
            votesTransferred: 284.92907801418437,
          },
        },
        {
          round: 4,
          results: {
            BETA: 1756.9815701009052,
            EPSILON: 737.4967950727291,
            ZETA: 1010.5216348263655,
          },
          outcome: {
            candidate: 'BETA',
            action: 'ELECTED - MET QUOTA',
            round: 4,
            seats: 4,
            votesTransferred: 344.9815701009052,
          },
        },
        {
          round: 5,
          results: { EPSILON: 737.4967950727291, ZETA: 1096.9151937728493 },
          outcome: {
            candidate: 'ZETA',
            action: 'ELECTED - MET QUOTA',
            round: 5,
            seats: 3,
            votesTransferred: 37.91519377284931,
          },
        },
        {
          round: 6,
          results: { EPSILON: 737.4967950727291 },
          outcome: {
            candidate: 'EPSILON',
            action: 'ELECTED - MET QUOTA',
            round: 6,
            seats: 2,
            votesTransferred: 31.496795072729128,
          },
        },
        { round: 7, results: {} },
      ]);
    });
  });
});
