import runServer from '../../init';
import axios from 'axios';
import moment from 'moment';
import {
  ElectionStatus,
  ElectionResultsVisibility,
  ElectionType,
} from '../../../types';
const testElection = {
  title: 'API Test Election',
  subtitle: 'testing the database',
  electionStatus: ElectionStatus.DRAFT,
  resultsVisibility: ElectionResultsVisibility.LIVE,
  electionType: ElectionType.InstantRunoff,
  seats: 1,
  pollsOpen: moment().toISOString(),
  pollsClose: moment()
    .add({ hours: 12 })
    .toISOString(),
};
const MR_TEST = `Mr.Test${Math.random().toString()}`;

const cache: any = {};
// TODO: test 500 route responses;
describe('server/api/v1/elections', () => {
  beforeAll(async () => {
    cache.server = await runServer(4444);
    return cache.server;
  });
  describe('POST localhost:4444/api/v1/elections/create', () => {
    it('posts a new election', async () => {
      const { data }: any = await axios({
        method: 'post',
        url: 'http://localhost:4444/api/v1/elections/create',
        data: { ...testElection, electionCreator: MR_TEST },
      }).catch(console.warn);
      cache.id = data._id;
      expect(data).toEqual({
        _id: data._id,
        ...testElection,
        voteRecord: data.voteRecord,
        votes: data.votes,
        voterIds: [],
        createdAt: data.createdAt,
        electionCreator: MR_TEST,
      });
      expect(data.voteRecord).toHaveLength(24);
    });
  });
  describe('GET http://localhost:4444/api/v1/elections/:electionID', () => {
    it("gets an election's data", async () => {
      const { data }: any = await axios({
        method: 'get',
        url: `http://localhost:4444/api/v1/elections/${cache.id}`,
      }).catch(console.warn);
      expect(data).toEqual({
        ...testElection,
        votes: data.votes,
        voteRecord: data.voteRecord,
        voterIds: [],
        _id: cache.id,
        createdAt: data.createdAt,
        electionCreator: MR_TEST,
      });
    });
  });
  describe('PATCH http://localhost:4444/api/v1/elections/:electionID', () => {
    it("alter's an election's data", async () => {
      const { data }: any = await axios({
        method: 'patch',
        url: `http://localhost:4444/api/v1/elections/${cache.id}`,
        data: {
          subtitle: 'updated subtitle',
        },
      }).catch(console.warn);
      expect(data).toEqual({
        ...testElection,
        subtitle: 'updated subtitle',
        voteRecord: data.voteRecord,
        voterIds: [],
        votes: data.votes,
        _id: cache.id,
        createdAt: data.createdAt,
        electionCreator: MR_TEST,
      });
    });
  });
  describe('PATCH http://localhost:4444/api/v1/elections/:electionID/vote', () => {
    it('casts a ballot', async () => {
      const { data }: any = await axios({
        method: 'patch',
        url: `http://localhost:4444/api/v1/elections/${cache.id}/vote`,
        data: {
          voterId: 'API FIRST',
          vote: ['LAZERHAWK', 'PURTURBATOR', 'KAVINSKY'],
        },
      }).catch(console.warn);
      expect(data).toEqual({
        electionId: cache.id,
        voteCastOk: true,
        voteRecordId: data.voteRecordId,
      });
      cache.voteRecordId = data.voteRecordId;
    });
    it('casts a 2nd ballot', async () => {
      const { data }: any = await axios({
        method: 'patch',
        url: `http://localhost:4444/api/v1/elections/${cache.id}/vote`,
        data: {
          voterId: 'API SECOND',
          vote: ['LAZERHAWK', 'KAVINSKY', 'STROM'],
        },
      }).catch(console.warn);
      expect(data).toEqual({
        electionId: cache.id,
        voteCastOk: true,
        voteRecordId: data.voteRecordId,
      });
    });
    it("won't let anyone vote twice", async () => {
      const something: any = await axios({
        method: 'patch',
        url: `http://localhost:4444/api/v1/elections/${cache.id}/vote`,
        data: {
          voterId: 'API SECOND',
          vote: ['LAZERHAWK', 'KAVINSKY', 'STROM'],
        },
      }).catch(err => {
        cache.catcherr = err.response.data;
      });
      expect(something).toBeUndefined();
      expect(cache.catcherr).toBe(
        `Voter: API SECOND has already cast a ballot in this election`
      );
    });
    describe('GET http://localhost:4444/api/v1/elections/:electionID', () => {
      it("gets an election's data after the votes", async () => {
        const { data }: any = await axios({
          method: 'get',
          url: `http://localhost:4444/api/v1/elections/${cache.id}`,
        }).catch(console.warn);
        expect(data).toEqual({
          ...testElection,
          votes: {
            _id: data.votes._id,
            '["LAZERHAWK","KAVINSKY","STROM"]': 1,
            '["LAZERHAWK","PURTURBATOR","KAVINSKY"]': 1,
          },
          subtitle: 'updated subtitle',
          voteRecord: data.voteRecord,
          voterIds: ['API FIRST', 'API SECOND'],
          _id: cache.id,
          createdAt: data.createdAt,
          electionCreator: MR_TEST,
        });
      });
    });
  });
  afterAll(async () => {
    return cache.server.close();
  });
});
