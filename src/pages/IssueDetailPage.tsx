import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJobbers, useSites, useTicket, useUpdateTicket, useAddTicketComment } from '../api/hooks';
import { get } from '../api/apiClient';
import type { ServiceCompany } from '../models/types';

export default function IssueDetailPage() {
  const { ticketId } = useParams();
  const { data: ticket } = useTicket(ticketId);
  const { data: sites = [] } = useSites();
  const { data: jobbers = [] } = useJobbers();
  const updateTicket = useUpdateTicket();
  const addComment = useAddTicketComment();
  const [commentText, setCommentText] = useState('');
  const [serviceCompanies, setServiceCompanies] = useState<ServiceCompany[]>([]);

  const siteObj = useMemo(() => sites.find((s) => s.id === ticket?.siteId), [sites, ticket]);
  const siteName = siteObj?.name || ticket?.siteId || 'Site';
  const partnerLabel = useMemo(() => {
    if (!ticket) return 'Partner';
    const servicePartner = ticket.serviceCompanyId ? serviceCompanies.find((s) => s.id === ticket.serviceCompanyId) : undefined;
    const jobberName = jobbers.find((j) => j.id === ticket.jobberId)?.name;
    if (jobberName) return `Jobber • ${jobberName}`;
    if (servicePartner) return `Service • ${servicePartner.name}`;
    if (ticket.serviceCompanyId) return `Service • ${ticket.serviceCompanyId}`;
    return 'Partner';
  }, [jobbers, serviceCompanies, ticket]);

  const statusBadge = (status: string) => {
    const base = { fontSize: '0.9rem', padding: '0.15rem 0.5rem' };
    if (status === 'OPEN') return <span className="badge badge-red" style={base}>Open</span>;
    if (status === 'IN_PROGRESS') return <span className="badge badge-yellow" style={base}>In progress</span>;
    return <span className="badge badge-green" style={base}>Resolved</span>;
  };

  const isResolved = ticket?.status === 'RESOLVED';

  useEffect(() => {
    if (!ticket?.siteId || !ticket.serviceCompanyId) return;
    get<ServiceCompany[]>(`/api/sites/${ticket.siteId}/service-companies`).then(setServiceCompanies);
  }, [ticket?.siteId, ticket?.serviceCompanyId]);

  if (!ticket) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-header">
            <div style={{ fontWeight: 700 }}>Issue not found</div>
            <Link className="button ghost" to="/issues">
              Back to issues
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Issue {ticket.id}</div>
            <div className="muted">
              {siteName} • {partnerLabel} • {ticket.type.replace('_', ' ')}
            </div>
          </div>
          {statusBadge(ticket.status)}
        </div>
        <div style={{ padding: '0.75rem', display: 'grid', gap: '0.5rem' }}>
          <div>
            <div className="label">Description</div>
            <div>{ticket.description}</div>
          </div>
          <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <div className="label">Store</div>
              <div>{siteName}</div>
              {siteObj?.address ? <div className="muted" style={{ fontSize: '0.9rem' }}>{siteObj.address}</div> : null}
            </div>
            <div>
              <div className="label">Partner</div>
              <div>
                {ticket.serviceCompanyId
                  ? serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.name || ticket.serviceCompanyId
                  : ticket.jobberId
                  ? jobbers.find((j) => j.id === ticket.jobberId)?.name || ticket.jobberId
                  : 'Not provided'}
              </div>
              {ticket.serviceCompanyId ? (
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.contactName || 'Contact TBD'}
                  {serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.phone
                    ? ` • ${serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.phone}`
                    : ''}
                  {serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.email
                    ? ` • ${serviceCompanies.find((s) => s.id === ticket.serviceCompanyId)?.email}`
                    : ''}
                </div>
              ) : null}
            </div>
            <div>
              <div className="label">Tank</div>
              <div>Not provided</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            Created {new Date(ticket.createdAt).toLocaleString()}
          </div>
          <div className="form-field" style={{ maxWidth: 220 }}>
            <label>Status</label>
            <select
              value={ticket.status}
              disabled={isResolved}
              onChange={(e) => updateTicket.mutate({ id: ticket.id, data: { status: e.target.value as typeof ticket.status } })}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
        <div style={{ padding: '0.75rem', display: 'grid', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Comments</div>
            <div className="stack" style={{ display: 'grid', gap: '0.5rem' }}>
              {(ticket.comments || []).length === 0 ? <div className="muted">No comments yet.</div> : null}
              {(ticket.comments || []).map((c) => (
                <div key={c.id} className="card" style={{ margin: 0, padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{c.author || 'User'}</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
            {isResolved ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                <div className="muted">Issue is resolved. Comments and status are locked.</div>
                <Link className="button ghost" to="/issues">
                  Back to issues
                </Link>
              </div>
            ) : (
              <>
                <div className="form-field" style={{ marginTop: '0.5rem' }}>
                  <label>Add comment</label>
                  <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                  <Link className="button ghost" to="/issues">
                    Back to issues
                  </Link>
                  <button
                    className="button"
                    onClick={() => {
                      if (!commentText.trim() || !ticket.id) return;
                      addComment.mutate(
                        { id: ticket.id, text: commentText.trim() },
                        {
                          onSuccess: () => setCommentText(''),
                        },
                      );
                    }}
                    disabled={addComment.isPending || !commentText.trim()}
                  >
                    {addComment.isPending ? 'Posting…' : 'Post comment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
