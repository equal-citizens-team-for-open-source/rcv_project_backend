import moment from 'moment';
import {
  dbCreateElection,
  dbRetrieveElection,
  dbUpdateElection,
  dbCastVote,
} from './elections';
import {
  ElectionStatus,
  ElectionResultsVisibility,
  ElectionType,
} from '../../types';
import { ObjectID } from 'mongodb';

const testElection = {
  title: 'Test Election',
  subtitle: 'testing the database',
  electionStatus: ElectionStatus.DRAFT,
  resultsVisibility: ElectionResultsVisibility.LIVE,
  electionType: ElectionType.DemocraticPrimary,
  seats: 10,
  pollsOpen: moment().toISOString(),
  pollsClose: moment()
    .add({ hours: 24 })
    .toISOString(),
};
const data: any = {};

describe('db/controllers/elections.ts', () => {
  describe('dbCreateElection()', () => {
    it('saves a new election', async () => {
      data.testElectionID = await dbCreateElection(testElection);
      expect(typeof data.testElectionID).toBe('string');
      expect(data.testElectionID).toHaveLength(24);
    });
  });
  describe('dbRetrieveElection()', () => {
    it('retrieves the election we just created', async () => {
      const result = await dbRetrieveElection(data.testElectionID);
      expect(result.voteRecord).toHaveLength(24);
      expect(result.votes._id.toHexString()).toHaveLength(24);
      expect(result.voteRecord).toBe(result.votes._id.toHexString());
      expect(result).toEqual({
        ...testElection,
        _id: new ObjectID(data.testElectionID),
        voteRecord: result.voteRecord,
        voterIds: [],
        votes: result.votes,
      });
    });
  });
  describe('dbUpdateElection()', () => {
    it('updates an election', async () => {
      await dbUpdateElection(data.testElectionID, {
        electionStatus: ElectionStatus.IN_PROGRESS,
      });
      const result = await dbRetrieveElection(data.testElectionID);
      expect(result).toEqual({
        ...testElection,
        electionStatus: 'IN_PROGRESS',
        _id: new ObjectID(data.testElectionID),
        voterIds: [],
        voteRecord: result.voteRecord,
        votes: result.votes,
      });
    });
  });
  describe('dbCastVote', () => {
    it('casts a vote', async () => {
      await dbCastVote(data.testElectionID, 'FIRST', [
        'ALPHA',
        'BETA',
        'GAMMA',
      ]);
      const result = await dbRetrieveElection(data.testElectionID);
      expect(result.voterIds).toEqual(['FIRST']);
      expect(result.votes).toEqual({
        '["ALPHA","BETA","GAMMA"]': 1,
        _id: result.votes._id,
      });
    });
    it('casts another vote', async () => {
      await dbCastVote(data.testElectionID, 'SECOND', [
        'BETA',
        'ALPHA',
        'DELTA',
      ]);
      await dbCastVote(data.testElectionID, 'THIRD', [
        'ALPHA',
        'BETA',
        'GAMMA',
      ]);
      const result = await dbRetrieveElection(data.testElectionID);
      expect(result.votes).toEqual({
        '["ALPHA","BETA","GAMMA"]': 2,
        '["BETA","ALPHA","DELTA"]': 1,
        _id: result.votes._id,
      });

      expect(result.voterIds).toContain('FIRST');
      expect(result.voterIds).toContain('SECOND');
    });
    it('does not let the voter cast twice', async () => {
      await dbCastVote(data.testElectionID, 'FIRST', [
        'ALPHA',
        'BETA',
        'GAMMA',
        'DELTA',
      ]).catch((errMsg: string) => {
        data.errMsg = errMsg;
      });
      expect(data.errMsg).toBe(
        'Voter: FIRST has already cast a ballot in this election'
      );
      const result = await dbRetrieveElection(data.testElectionID);

      expect(result.votes).toEqual({
        '["ALPHA","BETA","GAMMA"]': 2,
        '["BETA","ALPHA","DELTA"]': 1,
        _id: result.votes._id,
      });
      expect(
        result.votes[JSON.stringify(['ALPHA', 'BETA', 'GAMMA', 'DELTA'])]
      ).toBeUndefined();
      expect(result.voterIds).toContain('FIRST');
      expect(result.voterIds).toContain('SECOND');
    });
    it('does not let the voter vote after the poll has closed', async () => {
      await dbUpdateElection(data.testElectionID, {
        pollsClose: moment()
          .subtract({ minutes: 30 })
          .toISOString(),
      });
      const result1 = await dbRetrieveElection(data.testElectionID);
      expect(moment(result1.pollsClose).isBefore(moment())).toBe(true);
      await dbCastVote(data.testElectionID, 'LATE', [
        'ALPHA',
        'BETA',
        'GAMMA',
        'DELTA',
      ]).catch((errMsg: string) => {
        data.errMsg2 = errMsg;
      });
      expect(data.errMsg2.substring(0, 66)).toBe(
        'Your vote was not recorded, because polls have closed for election'
      );
      await dbCastVote(data.testElectionID, 'ALSOLATE', [
        'ALPHA',
        'BETA',
        'GAMMA',
      ]).catch((errMsg: string) => {
        data.errMsg2a = errMsg;
      });
      expect(data.errMsg2.substring(0, 66)).toBe(
        'Your vote was not recorded, because polls have closed for election'
      );

      const result2 = await dbRetrieveElection(data.testElectionID);
      expect(result2.votes).toEqual({
        '["ALPHA","BETA","GAMMA"]': 2,
        '["BETA","ALPHA","DELTA"]': 1,
        _id: result2.votes._id,
      });
      expect(
        result2.votes[JSON.stringify(['ALPHA', 'BETA', 'GAMMA', 'DELTA'])]
      ).toBeUndefined();
      expect(result2.voterIds).toContain('FIRST');
      expect(result2.voterIds).toContain('SECOND');
      expect(result2.voterIds).not.toContain('LATE');
      expect(result2.voterIds).not.toContain('ALSOLATE');
    });
    it('does not let the voter vote early', async () => {
      await dbUpdateElection(data.testElectionID, {
        pollsClose: moment()
          .add({ hours: 12 })
          .toISOString(),
        pollsOpen: moment()
          .add({ hours: 6 })
          .toISOString(),
      });
      const result1 = await dbRetrieveElection(data.testElectionID);
      expect(moment(result1.pollsOpen).isAfter(moment())).toBe(true);
      await dbCastVote(data.testElectionID, 'EARLY', [
        'ALPHA',
        'BETA',
        'GAMMA',
        'DELTA',
      ]).catch((errMsg: string) => {
        data.errMsg2 = errMsg;
      });
      expect(data.errMsg2.substring(0, 61)).toBe(
        'Your vote was not recorded, because polls have not yet opened'
      );

      const result2 = await dbRetrieveElection(data.testElectionID);
      expect(result2.votes).toEqual({
        '["ALPHA","BETA","GAMMA"]': 2,
        '["BETA","ALPHA","DELTA"]': 1,
        _id: result2.votes._id,
      });
      expect(
        result2.votes[JSON.stringify(['ALPHA', 'BETA', 'GAMMA', 'DELTA'])]
      ).toBeUndefined();
      expect(result2.voterIds).toContain('FIRST');
      expect(result2.voterIds).toContain('SECOND');
      expect(result2.voterIds).not.toContain('EARLY');
    });
  });
});
