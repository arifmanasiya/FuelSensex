import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobbers, useSites, useTickets, useCreateTicket, useServiceCompanies, usePageHeaders } from '../api/hooks';
import PageHeader from '../components/PageHeader';

export default function IssuesPage() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const { data: tickets = [] } = useTickets(selectedSiteId || undefined);
  const { data: jobbers = [] } = useJobbers();
  const { data: serviceCompanies = [] } = useServiceCompanies(selectedSiteId || undefined);
  const { data: pageHeaders } = usePageHeaders();
  const createTicket = useCreateTicket();
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    partnerType: 'JOBBER' as 'JOBBER' | 'SERVICE',
    partnerId: '',
    type: 'OTHER' as 'SHORT_DELIVERY' | 'QUALITY_ISSUE' | 'OTHER',
    description: '',
  });
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return tickets.filter((t) => (statusFilter === 'ALL' ? true : t.status === statusFilter));
  }, [tickets, statusFilter]);

  const statusBadge = (status: string) => {
    const base = { fontSize: '0.8rem', padding: '0.15rem 0.4rem' };
    if (status === 'OPEN') return <span className="badge badge-red" style={base}>Open</span>;
    if (status === 'IN_PROGRESS') return <span className="badge badge-yellow" style={base}>In progress</span>;
    return <span className="badge badge-green" style={base}>Resolved</span>;
  };
  const header = pageHeaders?.issues;

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Issues'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: [{ id: '', label: 'All sites' }, ...sites.map((s) => ({ id: s.id, label: s.name }))],
        }}
      />
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700 }}>Filters & actions</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-field" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <button className="button" type="button" onClick={() => setShowModal(true)} disabled={!selectedSiteId}>
              New issue
            </button>
          </div>
        </div>
      </div>

      {showModal ? (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 720 }}>
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Create issue</div>
                <div className="muted">Log a new issue for a jobber or service company.</div>
              </div>
              <button className="button ghost" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
            <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-field">
                <label>Partner type</label>
                <select
                  value={newTicket.partnerType}
                  onChange={(e) => {
                    const val = e.target.value as 'JOBBER' | 'SERVICE';
                    setNewTicket((p) => ({ ...p, partnerType: val, partnerId: '' }));
                  }}
                >
                  <option value="JOBBER">Jobber</option>
                  <option value="SERVICE">Service company</option>
                </select>
              </div>
              <div className="form-field">
                <label>{newTicket.partnerType === 'JOBBER' ? 'Jobber' : 'Service company'}</label>
                <select
                  value={newTicket.partnerId}
                  onChange={(e) => setNewTicket((p) => ({ ...p, partnerId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {newTicket.partnerType === 'JOBBER'
                    ? jobbers.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))
                    : serviceCompanies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                </select>
              </div>
              <div className="form-field">
                <label>Type</label>
                <select
                  value={newTicket.type}
                  onChange={(e) => setNewTicket((p) => ({ ...p, type: e.target.value as typeof newTicket.type }))}
                >
                  <option value="SHORT_DELIVERY">Short delivery</option>
                  <option value="QUALITY_ISSUE">Quality issue</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the issue"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="button ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="button"
                onClick={() => {
                  if (!selectedSiteId || !newTicket.partnerId || !newTicket.description) return;
                  createTicket.mutate(
                    {
                      id: `tkt-${Date.now()}`,
                      siteId: selectedSiteId,
                      jobberId: newTicket.partnerType === 'JOBBER' ? newTicket.partnerId : undefined,
                      serviceCompanyId: newTicket.partnerType === 'SERVICE' ? newTicket.partnerId : undefined,
                      orderId: undefined,
                      type: newTicket.type,
                      description: newTicket.description,
                      status: 'OPEN',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    {
                      onSuccess: () => {
                        setShowModal(false);
                        setNewTicket((p) => ({ ...p, description: '', partnerId: '' }));
                      },
                    },
                  );
                }}
                disabled={!selectedSiteId || !newTicket.partnerId || !newTicket.description || createTicket.isPending}
              >
                {createTicket.isPending ? 'Submitting…' : 'Submit issue'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 700 }}>Tickets</div>
            <div className="muted">{filtered.length} issues</div>
          </div>
        </div>
        <div className="list-grid">
          {filtered.map((t) => (
            <div
              className="list-card"
              key={t.id}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/app/issues/${t.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/app/issues/${t.id}`);
                }
              }}
            >
              <div className="list-meta">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    <Link to={`/app/issues/${t.id}`} className="muted" style={{ fontWeight: 700 }}>
                      {t.type}
                    </Link>
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                {statusBadge(t.status)}
              </div>
              <div className="muted">{t.description}</div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                Order {t.orderId || 'N/A'} • {t.jobberId ? `Jobber ${t.jobberId}` : t.serviceCompanyId ? `Service ${t.serviceCompanyId}` : 'Partner N/A'}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 ? <div className="muted" style={{ padding: '0.75rem' }}>No issues.</div> : null}
      </div>
    </div>
  );
}
