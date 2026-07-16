export class InvalidArgumentError extends RangeError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidArgumentError';
  }
}
