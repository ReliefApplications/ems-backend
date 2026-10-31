import { isPlainObject } from 'lodash';
import {
  allowedCustomStageOperators,
  forbiddenPipelineOperators,
  PipelineStage,
} from '@const/aggregation';

/** Reasons a custom stage can be rejected */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum CustomStageErrorCode {
  /** Raw value is not a string or is not valid JSON */
  INVALID = 'invalid',
  /** Stage uses an operator that is not allowed */
  FORBIDDEN = 'forbidden',
}

/**
 * Error thrown when a custom aggregation stage cannot be used.
 */
export class CustomStageError extends Error {
  /**
   * Error thrown when a custom aggregation stage cannot be used.
   *
   * @param code reason the stage was rejected
   * @param operator operator that caused the rejection, if any
   */
  constructor(public code: CustomStageErrorCode, public operator?: string) {
    super(
      code === CustomStageErrorCode.FORBIDDEN
        ? `Custom stage uses forbidden operator ${operator}`
        : 'Custom stage cannot be parsed'
    );
    this.name = 'CustomStageError';
  }
}

/**
 * Recursively walks a parsed value and throws if any key, at any depth,
 * is a forbidden pipeline operator.
 *
 * @param value value to inspect
 */
const assertNoForbiddenOperator = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenOperator);
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (forbiddenPipelineOperators.includes(key)) {
        throw new CustomStageError(CustomStageErrorCode.FORBIDDEN, key);
      }
      assertNoForbiddenOperator((value as Record<string, unknown>)[key]);
    }
  }
};

/**
 * Parses and validates the raw JSON of a custom aggregation stage.
 *
 * The check is done on the parsed object (never on the raw string, which
 * could hide operator names behind JSON escape sequences):
 * - the stage must be a plain object with exactly one key,
 * - that key must be an allowed stage operator,
 * - no forbidden operator may appear at any depth.
 *
 * @param raw raw JSON string of the custom stage
 * @returns the parsed stage, safe to push in a pipeline
 */
export const parseCustomStage = (raw: unknown): Record<string, any> => {
  if (typeof raw !== 'string') {
    throw new CustomStageError(CustomStageErrorCode.INVALID);
  }
  let stage: unknown;
  try {
    stage = JSON.parse(raw);
  } catch {
    throw new CustomStageError(CustomStageErrorCode.INVALID);
  }
  if (!isPlainObject(stage)) {
    throw new CustomStageError(CustomStageErrorCode.INVALID);
  }
  const keys = Object.keys(stage as Record<string, unknown>);
  if (keys.length !== 1) {
    throw new CustomStageError(CustomStageErrorCode.INVALID);
  }
  const [operator] = keys;
  if (!allowedCustomStageOperators.includes(operator)) {
    throw new CustomStageError(CustomStageErrorCode.FORBIDDEN, operator);
  }
  assertNoForbiddenOperator((stage as Record<string, unknown>)[operator]);
  return stage as Record<string, any>;
};

/**
 * Validates every custom stage of an aggregation pipeline definition
 * (as stored on a resource / reference data, or received from the builder).
 * Throws a CustomStageError on the first invalid stage.
 *
 * @param pipeline aggregation pipeline definition
 */
export const validatePipelineCustomStages = (pipeline: unknown): void => {
  if (!Array.isArray(pipeline)) {
    return;
  }
  for (const stage of pipeline) {
    if (stage?.type === PipelineStage.CUSTOM) {
      parseCustomStage(stage.form?.raw);
    }
  }
};

/**
 * Gets the i18n key of the error message to display for a rejected custom stage.
 *
 * @param err error thrown by parseCustomStage / validatePipelineCustomStages
 * @returns i18n key
 */
export const getCustomStageErrorKey = (err: unknown): string =>
  err instanceof CustomStageError && err.code === CustomStageErrorCode.FORBIDDEN
    ? 'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    : 'utils.aggregation.buildPipeline.errors.invalidCustomStage';
