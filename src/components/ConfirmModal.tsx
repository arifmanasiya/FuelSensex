interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="card-header">
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button
            className="button ghost"
            type="button"
            aria-label="Close"
            onClick={onCancel}
            style={{ width: 38, height: 38, padding: 0, fontSize: '1.2rem', color: 'inherit' }}
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '1rem' }}>{message}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="button" style={{ minWidth: 120 }} onClick={onConfirm}>
            {confirmLabel}
          </button>
          {cancelLabel ? (
            <button className="button ghost" style={{ minWidth: 120 }} onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
