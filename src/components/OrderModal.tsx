import type { FormEvent } from 'react';
import type { DeliveryRecord } from '../types';
import type { UITank } from './TankCard';

export interface OrderForm {
  supplier: string;
  gallons: number;
  windowStartDate: string;
  windowStartTime: string;
  windowEndDate: string;
  windowEndTime: string;
  contactName: string;
  contactPhone: string;
  poNumber: string;
  notes: string;
  priority: 'NORMAL' | 'RUSH';
}

interface Props {
  tank: UITank;
  form: OrderForm;
  isOpen: boolean;
  existingOrder?: DeliveryRecord;
  recommendedGallons: number;
  suppliers: string[];
  maxGallons: number;
  onClose: () => void;
  onChange: (form: OrderForm) => void;
  onSubmit: () => void;
  onCancelOrder?: () => void;
}

export default function OrderModal({
  tank,
  form,
  isOpen,
  existingOrder,
  recommendedGallons,
  suppliers,
  maxGallons,
  onClose,
  onChange,
  onSubmit,
  onCancelOrder,
}: Props) {
  if (!isOpen) return null;

  const levelPercent = Math.round((tank.currentGallons / tank.capacityGallons) * 100);
  const hoursText = recommendedGallons ? `Recommended: ${recommendedGallons.toLocaleString()} gal (fills to ~85%)` : '';

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 800 }}>Order fuel — {tank.name}</div>
            <div className="muted">
              Grade {tank.gradeCode} · {levelPercent}% full · Tank {tank.capacityGallons.toLocaleString()} gal
            </div>
            {existingOrder ? <span className="badge badge-yellow">Editing existing order</span> : null}
          </div>
          <button className="button ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
          className="grid"
          style={{ gap: '0.75rem' }}
        >
          <div className="form-field">
            <label>Supplier</label>
            <select value={form.supplier} onChange={(e) => onChange({ ...form, supplier: e.target.value })}>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label>Gallons to deliver</label>
            <input
              type="number"
              min={0}
              max={Math.max(maxGallons, 0)}
              value={form.gallons}
              onChange={(e) => onChange({ ...form, gallons: Number(e.target.value) })}
              required
            />
            <div className="muted">
              {hoursText} {maxGallons > 0 ? `Max this tank: ${maxGallons.toLocaleString()} gal` : 'Tank is near full.'}
            </div>
          </div>

          <div className="form-field">
            <label>Delivery window</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="date"
                value={form.windowStartDate}
                onChange={(e) => onChange({ ...form, windowStartDate: e.target.value })}
              />
              <input
                type="date"
                value={form.windowEndDate}
                onChange={(e) => onChange({ ...form, windowEndDate: e.target.value })}
              />
              <input
                type="time"
                value={form.windowStartTime}
                onChange={(e) => onChange({ ...form, windowStartTime: e.target.value })}
              />
              <input
                type="time"
                value={form.windowEndTime}
                onChange={(e) => onChange({ ...form, windowEndTime: e.target.value })}
              />
            </div>
            <div className="muted">Start date/time → End date/time</div>
          </div>

          <div className="form-field">
            <label>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => onChange({ ...form, priority: e.target.value as OrderForm['priority'] })}
            >
              <option value="NORMAL">Normal</option>
              <option value="RUSH">Rush (run-out risk)</option>
            </select>
          </div>

          <div className="form-field">
            <label>Contact name</label>
            <input
              value={form.contactName}
              onChange={(e) => onChange({ ...form, contactName: e.target.value })}
              placeholder="Who should the driver call?"
            />
          </div>

          <div className="form-field">
            <label>Contact phone</label>
            <input
              value={form.contactPhone}
              onChange={(e) => onChange({ ...form, contactPhone: e.target.value })}
              placeholder="(555) 555-1234"
            />
          </div>

          <div className="form-field">
            <label>PO number (optional)</label>
            <input
              value={form.poNumber}
              onChange={(e) => onChange({ ...form, poNumber: e.target.value })}
              placeholder="PO-12345"
            />
          </div>

          <div className="form-field">
            <label>Notes for driver</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              placeholder="Gate code, site contact, special instructions"
              style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="button" type="submit">
              {existingOrder ? 'Update order (mock)' : 'Submit order (mock)'}
            </button>
            {existingOrder ? (
              <button
                className="button ghost"
                type="button"
                onClick={onCancelOrder}
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
              >
                Cancel order
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
