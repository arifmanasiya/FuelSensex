import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJobbers, useSites, useTicket, useSiteDetails, useUpdateTicket, useAddTicketComment } from '../api/hooks';
import { get } from '../api/apiClient';
import type { ServiceCompany, Site } from '../models/types';

export default function IssueDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { data: ticket } = useTicket(ticketId);
  const { data: sites = [] } = useSites();
  const siteDetailsQuery = useSiteDetails(ticket?.siteId || '');
  const siteDetails = siteDetailsQuery.data as Site | undefined;
  const { data: jobbers = [] } = useJobbers();
  const updateTicket = useUpdateTicket();
  const addComment = useAddTicketComment();
  const [commentText, setCommentText] = useState('');
  const [serviceCompanies, setServiceCompanies] = useState<ServiceCompany[]>([]);

  const siteObj = useMemo(() => sites.find((s) => s.id === ticket?.siteId), [sites, ticket]);
   const siteName = siteObj?.name || ticket?.siteId || 'Site';
  const alertDescription = useMemo(() => {
    if (!ticket?.description) return 'Alert details unavailable';
    return ticket.description.replace(/Service needed for alert:\s*/gi, '').trim();
  }, [ticket]);
  const issueTank = useMemo(() => {
    if (!alertDescription || !siteDetails?.tanks?.length) return undefined;
    const normalized = alertDescription.toLowerCase();
    const tanks = siteDetails.tanks;
    const byName = tanks.find((tank) => normalized.includes(tank.name.toLowerCase()));
    if (byName) return byName;
    const gradeLookup: Record<string, string> = {
      diesel: 'DIESEL',
      reg: 'REGULAR',
      regular: 'REGULAR',
      super: 'PREMIUM',
      premium: 'PREMIUM',
      midgrade: 'VIRTUAL_MIDGRADE',
      mid: 'VIRTUAL_MIDGRADE',
    };
    const gradeMatch = Object.entries(gradeLookup).find(([keyword]) => normalized.includes(keyword));
    if (gradeMatch) {
      const gradeTank = tanks.find((tank) => tank.productType === gradeMatch[1]);
      if (gradeTank) return gradeTank;
    }
    return undefined;
  }, [alertDescription, siteDetails]);

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
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              Issue detail
              <span
                className="muted"
                title="Tickets > issue ID includes service context, comments, and next steps."
                style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4" strokeLinecap="round"></path>
                  <path d="M12 8h.01" strokeLinecap="round"></path>
                </svg>
              </span>
            </div>
            <div className="muted">Tickets &gt; {ticket.id}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="button ghost" type="button" onClick={() => navigate('/app/issues')}>
              Back to issues
            </button>
          </div>
        </div>
        <div style={{ fontSize: '0.95rem' }}>Reference {ticket.id} for service context, comments, and next steps.</div>
      </div>
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 800,
            fontSize: '1.2rem',
            marginBottom: '0.75rem',
          }}
        >
          <span>{alertDescription}</span>
          <span className="badge badge-red" style={{ fontSize: '0.9rem', padding: '0.15rem 0.5rem' }}>
            {ticket.status === 'OPEN'
              ? 'Open'
              : ticket.status === 'IN_PROGRESS'
              ? 'In progress'
              : 'Resolved'}
          </span>
        </div>
        <div className="muted" style={{ fontSize: '0.9rem' }}>
          Created {new Date(ticket.createdAt).toLocaleString()}
        </div>
        <div style={{ padding: '0.75rem', display: 'grid', gap: '0.5rem' }}>
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
              {issueTank ? (
                <>
                  <div>{issueTank.name}</div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {issueTank.productType} · {issueTank.currentVolumeGallons.toLocaleString()} / {issueTank.capacityGallons.toLocaleString()}{' '}
                    gal
                  </div>
                </>
              ) : (
                <div>Not provided</div>
              )}
            </div>
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
          {!isResolved ? (
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
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link className="button ghost" to="/issues">
                Back to issues
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
