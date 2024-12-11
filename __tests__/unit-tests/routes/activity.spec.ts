import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import router from '@routes/activity';
import { ActivityLog, User } from '@models';
import { DatabaseHelpers } from '../../helpers/database-helpers';

// Set the timeout of the test to 60 seconds
jest.setTimeout(60000);

/** Express application instance */
const app: Application = express();
app.use(express.json());

// Middleware to manipulate the request object
app.use((req, res, next) => {
  const contextHeader = req.headers.context;
  if (contextHeader) {
    req.context = JSON.parse(
      Array.isArray(contextHeader) ? contextHeader[0] : contextHeader
    );
  }
  next();
});

app.use('/activity', router);

describe('Activity Routes', () => {
  const mockUser = {
    user: new User({
      _id: new mongoose.Types.ObjectId(),
      attributes: {},
    }),
  };
  const mockActivity = new ActivityLog({
    eventType: 'navigation',
    metadata: {
      url: '/applications/' + new mongoose.Types.ObjectId(),
      applicationId: new mongoose.Types.ObjectId(),
    },
  });

  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {});

  describe('POST /activity', () => {
    it('should log new activity', async () => {
      const response = await request(app)
        .post('/activity')
        .set('context', JSON.stringify(mockUser))
        .send(mockActivity.toJSON());

      expect(response.status).toBe(200);
      expect(response.body.eventType).toBe('navigation');
      expect(response.body.metadata.url).toContain('/applications/');
    });

    it('should return 500 if an error occurs', async () => {
      const response = await request(app)
        .post('/activity')
        .set('context', JSON.stringify(mockUser))
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe('GET /activity', () => {
    it('should return activities', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return filtered activities', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activity').query({
        user_id: mockUser.user._id.toString(),
      });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /activity/group-by-user', () => {
    it('should return activities grouped by user', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activity/group-by-user');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /activity/download', () => {
    it('should download activities as XLSX', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app)
        .post('/activity/download')
        .send({ timeZone: 'UTC' });

      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toContain('attachment');
    });
  });
});
