import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import ActivityController from '@routes/activity/activity.controller';
import { ActivityLog, User } from '@models';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

// Set the timeout of the test to 60 seconds
jest.setTimeout(60000);

/** Express application instance */
const app: Application = express();
app.use(express.json());

/** Activity controller instance */
const activityController = new ActivityController();
app.use('/activities', activityController.routes);

describe('Activity Controller', () => {
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

  describe('POST /activities', () => {
    it('should create a new activity', async () => {
      const response = await request(app)
        .post('/activities')
        .set('context', JSON.stringify(mockUser))
        .send(mockActivity.toJSON());

      expect(response.status).toBe(201);
      expect(response.body.eventType).toBe('navigation');
      expect(response.body.metadata.url).toContain('/applications/');
    });

    it('should return 400 if eventType is missing', async () => {
      const response = await request(app)
        .post('/activities')
        .set('context', JSON.stringify(mockUser))
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /activities', () => {
    it('should return a list of activities', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activities');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return filtered activities', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activities').query({
        user_id: mockUser.user._id.toString(),
      });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /activities/group-by-url', () => {
    it('should return activities grouped by URL', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activities/group-by-url');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /activities/group-by-user', () => {
    it('should return activities grouped by user', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app).get('/activities/group-by-user');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /activities/download', () => {
    it('should download activities as XLSX', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app)
        .post('/activities/download')
        .send({ timeZone: 'UTC' });

      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toContain('attachment');
    });
  });

  describe('POST /activities/group-by-url/download', () => {
    it('should download grouped by URL activities as XLSX', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app)
        .post('/activities/group-by-url/download')
        .send({ timeZone: 'UTC' });

      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toContain('attachment');
    });
  });

  describe('POST /activities/group-by-user/download', () => {
    it('should download grouped by user activities as XLSX', async () => {
      await new ActivityLog(mockActivity).save();

      const response = await request(app)
        .post('/activities/group-by-user/download')
        .send({ timeZone: 'UTC' });

      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toContain('attachment');
    });
  });
});
