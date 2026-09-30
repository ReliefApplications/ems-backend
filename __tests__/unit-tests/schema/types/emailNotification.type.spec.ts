import { GraphQLBoolean } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { DatasetType } from '@schema/types/emailNotification.type';
import { DatasetInputType } from '@schema/inputs/emailNotification.input';

describe('Email notification dataset schema', () => {
  describe('DatasetType', () => {
    const fields = DatasetType.getFields();

    it('exposes the Common Services users filter', () => {
      expect(fields.csFilter.type).toBe(GraphQLJSON);
    });

    it('exposes the send-separate distribution list toggle', () => {
      expect(fields.individualEmailToDistributionList.type).toBe(
        GraphQLBoolean
      );
    });
  });

  describe('DatasetInputType', () => {
    const fields = DatasetInputType.getFields();

    it('accepts the Common Services users filter', () => {
      expect(fields.csFilter.type).toBe(GraphQLJSON);
    });

    it('accepts the send-separate distribution list toggle', () => {
      expect(fields.individualEmailToDistributionList.type).toBe(
        GraphQLBoolean
      );
    });
  });
});
