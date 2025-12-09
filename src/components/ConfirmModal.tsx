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
            style={{ width: 36, height: 36, padding: 0, fontSize: '1.1rem' }}
          >
            X
          </button>
        </div>
        <div style={{ marginBottom: '1rem' }}>{message}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="button ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
