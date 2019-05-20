import { Application, Request, Response } from 'express';
import { IElection } from '../../../types';
import {
  dbCreateElection,
  dbRetrieveElection,
  dbCastVote,
  dbUpdateElection,
} from '../../../db/controllers/elections';
// import pick from 'lodash/pick';

const electionRoutes = (app: Application) => {
  // eventually this will have checkJWT & checkRole.
  app.post('/api/v1/elections/create', async (req: Request, res: Response) => {
    const election: IElection & { electionCreator?: string } = req.body;
    const electionCreator: string = req.body.electionCreator;
    try {
      const insertedID: string = await dbCreateElection(
        election,
        electionCreator
      );
      const retrievedElection = await dbRetrieveElection(insertedID);
      res.status(200).send({ ...retrievedElection, _id: insertedID });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  app.get(
    '/api/v1/elections/:electionID',
    async (req: Request, res: Response) => {
      try {
        const election = await dbRetrieveElection(req.params.electionID);
        res.status(200).send({ ...election });
      } catch (err) {
        res.status(500).send(err);
      }
    }
  );

  app.patch(
    '/api/v1/elections/:electionID',
    async (req: Request, res: Response) => {
      const update: any = req.body;
      try {
        await dbUpdateElection(req.params.electionID, update);
        const election = await dbRetrieveElection(req.params.electionID);
        res.status(200).send({ ...election });
      } catch (err) {
        res.status(500).send(err);
      }
    }
  );

  app.patch(
    '/api/v1/elections/:electionID/vote',
    async (req: Request, res: Response) => {
      const { voterId, vote } = req.body;
      const { electionID } = req.params;
      try {
        const { voteCastResult, electionVoterVotedResult } = await dbCastVote(
          electionID,
          voterId,
          vote
        );
        const payload = {
          voteCastOk:
            voteCastResult.ok === 1 && electionVoterVotedResult.ok === 1,
          electionId: electionVoterVotedResult.value._id,
          voteRecordId: electionVoterVotedResult.value.voteRecord,
        };

        res.status(200).send(payload);
      } catch (err) {
        res.status(500).send(err);
      }
    }
  );
  return app;
};

export default electionRoutes;
