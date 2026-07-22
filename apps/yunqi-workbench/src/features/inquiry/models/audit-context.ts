export interface AuditContextModel {
  readonly actorId: string;
  readonly action: string;
  readonly timestamp: string;
  readonly targetId?: string;
}
