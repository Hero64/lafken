export type OutputType = 'arn' | 'id' | (string & {});

export type GetResourceValue<T = string, V = OutputType> = (value: T, type: V) => any;

/**
 * Common fields shared by all resource output definitions.
 *
 * The `value` field does not contain the final resolved AWS value. Instead, it declares
 * which resource property should be exported by the resolver, such as an ARN, ID, URL,
 * or any other attribute exposed by the resource implementation.
 */
export interface OutputBase<T> {
  /**
   * Export name.
   *
   * For `ssm` outputs this is the SSM parameter name.
   * For `output` outputs this is the Terraform output name.
   */
  name: string;
  /** Resource attribute key that should be exported. */
  value: T;
  /** Optional human-readable description for the generated output. */
  description?: string;
}

/**
 * Defines an output that will be persisted in AWS Systems Manager Parameter Store.
 *
 * Use this output type when a resource property must be consumed outside Terraform,
 * for example by Lambda runtime code, other AWS services, external applications,
 * or deployment processes that read values from Parameter Store.
 */
export interface SSMOutput<T> extends OutputBase<T> {
  /** Output backend type discriminator. */
  type: 'ssm';
  /**
   * Stores the parameter as `SecureString` when true.
   * Defaults to a plain `String` when omitted.
   */
  secure?: boolean;
}

/**
 * Defines an output that will be emitted as a Terraform output.
 *
 * Use this output type when the exported value should remain in Terraform state
 * and be consumed through Terraform plans, remote state, or other Terraform workflows.
 */
export interface TerraformOutput<T> extends OutputBase<T> {
  /** Output backend type discriminator. */
  type: 'output';
}

/**
 * Collection of outputs exposed by a resource.
 *
 * A resource can export one or more of its attributes through SSM Parameter Store,
 * Terraform outputs, or both at the same time.
 */
export type ResourceOutputType<T> = (SSMOutput<T> | TerraformOutput<T>)[];
