import { DataLabel } from '../../../components/ui/DataLabel';
import type { GuestHostRelationViewModel } from '../presentation/view-model';

export interface GuestHostRelationDetailProps {
  readonly relation: GuestHostRelationViewModel;
}

export function GuestHostRelationDetail({
  relation,
}: GuestHostRelationDetailProps) {
  return (
    <div className="relation-detail">
      <DataLabel label="气关系" value={relation.qi.label} />
      <DataLabel label="五行关系" value={relation.element.label} />
      <DataLabel label="方向关系" value={relation.direction.label} />
      <DataLabel
        label="传统描述"
        value={relation.traditionalLabel}
      />
    </div>
  );
}
