export interface PayloadProps {
  /**
   * Payload name.
   *
   * Specifies the name of the payload, which is used to identify
   * it within the application or during data processing.
   */
  name?: string;
}

export interface PayloadMetadata extends Required<PayloadProps> {
  id: string;
}

export interface CreatePayloadDecoratorProps<P extends PayloadProps, M> {
  enableInLambdaInvocation?: boolean;
  createUniqueId?: boolean;
  getMetadata?: (props?: P) => Omit<M, keyof PayloadMetadata>;
}
