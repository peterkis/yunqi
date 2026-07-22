export interface ObservationContextModel {
  readonly id: string;
  readonly inquiryId: string;
  readonly category?: string;
  readonly recordedValue?: unknown;
}
