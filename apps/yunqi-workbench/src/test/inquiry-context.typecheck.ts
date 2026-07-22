import type {
  AuditContextModel,
  InquiryContextModel,
  ObservationContextModel,
  PatientContextModel,
  PermissionContextModel,
} from '../features/inquiry/models';

// @ts-expect-error Inquiry Context Models have no feature-root public barrel.
import type { PatientContextModel as PublicPatientContextModel } from '../features/inquiry';

declare const patient: PatientContextModel;
declare const inquiry: InquiryContextModel;
declare const observation: ObservationContextModel;
declare const permission: PermissionContextModel;
declare const audit: AuditContextModel;

const patientId: string = patient.id;
const patientDisplayName: string | undefined = patient.displayName;
const inquiryId: string = inquiry.id;
const inquiryPatientId: string = inquiry.patientId;
const observationId: string = observation.id;
const observationInquiryId: string = observation.inquiryId;
const observationCategory: string | undefined = observation.category;
const observationValue: unknown = observation.recordedValue;
const permissionActorId: string = permission.actorId;
const auditActorId: string = audit.actorId;
const auditAction: string = audit.action;
const auditTimestamp: string = audit.timestamp;
const auditTargetId: string | undefined = audit.targetId;

void {
  patientId,
  patientDisplayName,
  inquiryId,
  inquiryPatientId,
  observationId,
  observationInquiryId,
  observationCategory,
  observationValue,
  permissionActorId,
  auditActorId,
  auditAction,
  auditTimestamp,
  auditTargetId,
};

// @ts-expect-error Context Model fields are readonly.
patient.id = 'patient-2';
// @ts-expect-error Patient Context has no open metadata bag.
void patient.metadata;
// @ts-expect-error Inquiry lifecycle is not defined in Phase3-C4.
void inquiry.status;
// @ts-expect-error Inquiry timestamps belong to future workflow/audit contracts.
void inquiry.createdAt;
// @ts-expect-error Observation operation time belongs to Audit Context.
void observation.recordedAt;
// @ts-expect-error Observation actor metadata belongs to Audit Context.
void observation.recordedBy;
// @ts-expect-error Observation Context cannot carry a diagnosis field.
void observation.diagnosis;
// @ts-expect-error Permission roles are not frozen in Phase3-C4.
void permission.role;
// @ts-expect-error Permission role collections are not frozen in Phase3-C4.
void permission.roles;
// @ts-expect-error Audit Context cannot carry medical facts.
void audit.diagnosis;

void (null as unknown as PublicPatientContextModel);
