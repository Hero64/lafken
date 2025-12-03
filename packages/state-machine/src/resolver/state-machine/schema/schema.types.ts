import type {
  CsvDelimiter,
  HeaderLocation,
  ResultOutputType,
  ResultTransformation,
} from '../../../main';
import type { LambdaStates, StateNames } from './schema.utils';

export interface Retry {
  ErrorEquals: string[];
  IntervalSeconds?: number;
  MaxAttempts?: number;
  BackoffRate?: number;
  MaxDelaySeconds?: number;
}

export interface Catch {
  ErrorEquals: string[];
  Next: string;
}

export interface StateTask {
  Type: 'Task';
  Resource: string;
  Arguments: {
    Payload: string | Record<string, any>;
    FunctionName: string;
  };
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
  Next?: string;
  End?: boolean;
  Retry?: Retry[];
  Catch?: Catch[];
}

export interface ParallelBranch {
  StartAt: string;
  States: Record<string, States>;
}

export interface ParallelTask {
  Type: 'Parallel';
  Branches: ParallelBranch[];
  Arguments?: Record<string, any>;
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
  Next?: string;
  End?: boolean;
  Retry?: Retry[];
  Catch?: Catch[];
}

export type ExecutionType = 'EXPRESS' | 'STANDARD';

export interface DistributedProcessorConfig {
  Mode: 'DISTRIBUTED';
  ExecutionType: ExecutionType;
}

export interface InlineProcessorConfig {
  Mode: 'INLINE';
}

export interface ItemProcessor extends ParallelBranch {
  ProcessorConfig: DistributedProcessorConfig | InlineProcessorConfig;
}

export type ItemReaderTypes = 'CSV' | 'JSON' | 'JSONL' | 'PARQUET' | 'MANIFEST';

export interface ItemReader {
  Resource: 'arn:aws:states:::s3:getObject';
  ReaderConfig: {
    InputType: ItemReaderTypes;
    CSVHeaderLocation?: HeaderLocation;
    CSVHeaders?: string[];
    Transformation?: 'NONE' | 'LOAD_AND_FLATTEN';
    ManifestType?: 'ATHENA_DATA' | 'S3_INVENTORY';
    CSVDelimiter?: CsvDelimiter;
    MaxItems?: number;
  };
  Arguments: {
    Bucket: string;
    Key: string;
    VersionId?: string;
  };
}

interface ResultWriter {
  Resource: 'arn:aws:states:::s3:putObject';
  WriterConfig?: {
    Transformation?: ResultTransformation;
    OutputType?: ResultOutputType;
  };
  Arguments: {
    Bucket: string;
    Prefix?: string;
  };
}

interface ItemBatcher {
  MaxItemsPerBatch?: number | string;
}

export interface MapTask {
  Type: 'Map';
  ItemProcessor: ItemProcessor;
  ItemReader?: ItemReader;
  ResultWriter?: ResultWriter;
  ItemBatcher?: ItemBatcher;
  Items?: any[] | string;
  MaxConcurrency?: number;
  ToleratedFailurePercentage?: string;
  ToleratedFailureCount?: number;
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
  Next?: string;
  End?: boolean;
  Retry?: Retry[];
  Catch?: Catch[];
}

export interface PassTask {
  Type: 'Pass';
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
  Next?: string;
  End?: boolean;
}

export interface WaitTask {
  Type: 'Wait';
  Seconds?: string | number;
  Timestamp?: string;
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
  Next?: string;
  End?: boolean;
}

export interface ChoiceCondition {
  Condition: string;
  Next: string;
}

export interface ChoiceTask {
  Type: 'Choice';
  Choices: ChoiceCondition[];
  Default?: string;
  Output?: string | Record<string, any>;
  Assign?: Record<string, any>;
}

export interface SucceedTask {
  Type: 'Succeed';
  Output?: string | Record<string, any>;
}

export interface FailTask {
  Type: 'Fail';
  Error?: string;
  Cause?: string;
}

export type States =
  | StateTask
  | ParallelTask
  | MapTask
  | ChoiceTask
  | WaitTask
  | PassTask
  | SucceedTask
  | FailTask;

export type StatesWithCatchErrors = StateTask | ParallelTask | MapTask;

export interface SchemaProps {
  initializeAssets?: boolean;
  stateNames?: StateNames | undefined;
  lambdas?: LambdaStates | undefined;
}
