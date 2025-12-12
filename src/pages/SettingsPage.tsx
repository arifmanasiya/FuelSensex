import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { get, post, put, del } from '../api/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../api/queryKeys';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import { pageHeaderConfig } from '../config/pageHeaders';
import type { Jobber, ManagerContact, ServiceCompany, SiteSettings, SiteSummary } from '../types';
import { useJobbers as useCanonJobbers, useSettings as useCanonSettings, useSiteTanks, useUpdateTank } from '../api/hooks';
import { useRef } from 'react';

type SettingsSection = 'notifications' | 'tanks' | 'backoffice' | 'jobbers' | 'services';

const sections: { key: SettingsSection; label: string }[] = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'tanks', label: 'Tank alerts' },
  { key: 'backoffice', label: 'Back office' },
  { key: 'jobbers', label: 'Fuel jobbers' },
  { key: 'services', label: 'Service companies' },
];

export default function SettingsPage() {
  const location = useLocation();
  const initialSection = parseSection(location.hash) || 'tanks';
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [jobbers, setJobbers] = useState<Jobber[]>([]);
  const [serviceCompanies, setServiceCompanies] = useState<ServiceCompany[]>([]);
  const [contacts, setContacts] = useState<ManagerContact[]>([]);
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    notifyCritical: 'IMMEDIATE' as ManagerContact['notifyCritical'],
    notifyWarning: 'HOURLY' as ManagerContact['notifyWarning'],
    notifyInfo: 'DAILY' as ManagerContact['notifyInfo'],
    notifyEmail: true,
    notifySms: true,
    notifyCall: false,
  });
  const [newService, setNewService] = useState({ name: '', contactName: '', phone: '', email: '', notes: '', portalUrl: '', preferredChannel: 'EMAIL' });
  const [newJobber, setNewJobber] = useState({ name: '', contactName: '', phone: '', email: '', preferredChannel: 'EMAIL' });
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddJobber, setShowAddJobber] = useState(false);
  const [isNarrow, setIsNarrow] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false));
  const [cardOpen, setCardOpen] = useState<Record<string, boolean>>({
    alerts: true,
    capacity: false,
    blend: false,
    perTank: false,
  });
  const [confirmDelete, setConfirmDelete] = useState<ManagerContact | null>(null);
  const [confirmJobber, setConfirmJobber] = useState<Jobber | null>(null);
  const [confirmService, setConfirmService] = useState<ServiceCompany | null>(null);
  const qc = useQueryClient();
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [expandedJobberId, setExpandedJobberId] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const { data: canonSettings = [] } = useCanonSettings();
  const { data: canonJobbers = [] } = useCanonJobbers();
  const { data: canonSiteTanks = [] } = useSiteTanks(selectedSiteId);
  const updateTank = useUpdateTank();
  const saveTimer = useRef<number | null>(null);
  const loadRefs = {
    reg: useRef<HTMLInputElement | null>(null),
    prem: useRef<HTMLInputElement | null>(null),
    dsl: useRef<HTMLInputElement | null>(null),
    mid: useRef<HTMLInputElement | null>(null),
  };

  const canonicalSnapshot = useMemo(
    () => {
      const siteSetting = canonSettings.find((s) => s.siteId === selectedSiteId) || canonSettings[0];
      const backOffice = siteSetting?.backOffice;
      const notificationContacts = siteSetting?.notifications?.contacts?.length ?? 0;
      const primaryJobber = siteSetting?.jobberId ? canonJobbers.find((j) => j.id === siteSetting.jobberId) : undefined;
      const primaryJobberName = primaryJobber?.name || (siteSetting?.jobberId ?? 'Not set');
      return {
        backOfficeName: backOffice?.systemName || 'Back office',
        backOfficeStatus: backOffice?.status || 'OK',
        jobberName: primaryJobberName,
        notificationContacts,
      };
    },
    [canonSettings, canonJobbers, selectedSiteId]
  );

  const sectionLabel = useMemo(() => sections.find((s) => s.key === section)?.label || 'Settings', [section]);

  const setSectionAndHash = (next: SettingsSection) => {
    setSection(next);
    window.location.hash = `#${next}`;
  };

  useEffect(() => {
    const nextSection = parseSection(location.hash);
    if (nextSection && nextSection !== section) {
      setSection(nextSection);
    }
  }, [location.hash, section]);

  useEffect(() => {
    document.title = `FuelSense Settings - ${sectionLabel}`;
  }, [sectionLabel]);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleCard = (key: string) => setCardOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const Collapsible: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <div className="card" style={{ margin: 0 }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontWeight: 700 }}>{title}</span>
        <button
          type="button"
          className="button ghost"
          onClick={() => toggleCard(id)}
          aria-expanded={cardOpen[id] ?? true}
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.9rem' }}
        >
          {cardOpen[id] ?? true ? 'Hide' : 'Show'}
        </button>
      </div>
      {cardOpen[id] ?? true ? <div style={{ padding: '0.75rem' }}>{children}</div> : null}
    </div>
  );

  useEffect(() => {
    Promise.all([get<SiteSummary[]>('/sites'), get<Jobber[]>('/jobbers')]).then(([data, jobberData]) => {
      setSites(data);
      setJobbers(jobberData);
      if (data.length) setSelectedSiteId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSiteId) return;
    Promise.all([
      get<SiteSettings>(`/sites/${selectedSiteId}/settings`),
      get<ServiceCompany[]>(`/sites/${selectedSiteId}/service-companies`),
      get<ManagerContact[]>(`/sites/${selectedSiteId}/contacts`),
    ]).then(([settingRes, svcRes, contactsRes]) => {
      setSettings(settingRes);
      setServiceCompanies(svcRes);
      setContacts(contactsRes);
      if (loadRefs.reg.current) loadRefs.reg.current.value = (settingRes.defaultLoadRegGallons ?? '').toString();
      if (loadRefs.prem.current) loadRefs.prem.current.value = (settingRes.defaultLoadPremGallons ?? '').toString();
      if (loadRefs.dsl.current) loadRefs.dsl.current.value = (settingRes.defaultLoadDslGallons ?? '').toString();
      if (loadRefs.mid.current) loadRefs.mid.current.value = (settingRes.defaultLoadMidGallons ?? '').toString();
    });
  }, [selectedSiteId]);

  useEffect(() => () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
  }, []);

  function handleChange<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    if (!settings) return;
    setSaved(false);
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const updated = await put<SiteSettings>(`/sites/${selectedSiteId}/settings`, next);
      setSettings(updated);
      setSaved(true);
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.sites });
    }, 500);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    return;
  }

  async function handleAddServiceCompany() {
    if (!selectedSiteId || !newService.name) return;
    const { portalUrl, preferredChannel, ...rest } = newService as any;
    const created = await post<ServiceCompany>(`/sites/${selectedSiteId}/service-companies`, {
      siteId: selectedSiteId,
      ...rest,
      communication: preferredChannel ? { preferredChannel } : undefined,
      portal: portalUrl ? { url: portalUrl } : undefined,
    });
    setServiceCompanies((prev) => [created, ...prev]);
    setNewService({ name: '', contactName: '', phone: '', email: '', notes: '', portalUrl: '', preferredChannel: 'EMAIL' });
    if (settings) {
      await saveNow({
        serviceCompanyId: created.id,
        serviceContactName: created.contactName,
        servicePhone: created.phone,
        serviceEmail: created.email,
        serviceNotes: created.notes,
      });
    }
  }

  async function handleAddJobber() {
    if (!newJobber.name) return;
    const { portalUrl, preferredChannel, ...rest } = newJobber as any;
    const created = await post<Jobber>('/jobbers', {
      ...rest,
      communication: preferredChannel ? { preferredChannel } : undefined,
      portal: portalUrl ? { url: portalUrl } : undefined,
    });
    setJobbers((prev) => [created, ...prev]);
    setNewJobber({ name: '', contactName: '', phone: '', email: '', preferredChannel: 'EMAIL' });
    if (settings) {
      await saveNow({
        jobberId: created.id,
        jobberContactName: created.contactName,
        jobberPhone: created.phone,
        jobberEmail: created.email,
      });
    }
  }

  function handleSetPrimaryJobber(jobber: Jobber) {
    if (!settings) return;
    saveNow({
      jobberId: jobber.id,
      jobberContactName: jobber.contactName,
      jobberPhone: jobber.phone,
      jobberEmail: jobber.email,
    });
  }

  function handleSetPrimaryService(company: ServiceCompany) {
    if (!settings) return;
    saveNow({
      serviceCompanyId: company.id,
      serviceContactName: company.contactName,
      servicePhone: company.phone,
      serviceEmail: company.email,
      serviceNotes: company.notes,
    });
  }

  async function handleUpdateContact(contactId: string, patch: Partial<ManagerContact>) {
    const updated = await put<ManagerContact>(`/sites/${selectedSiteId}/contacts/${contactId}`, patch);
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
  }

  async function handleUpdateJobber(jobberId: string, patch: Partial<Jobber>) {
    const updated = await put<Jobber>(`/jobbers/${jobberId}`, patch);
    setJobbers((prev) => prev.map((j) => (j.id === jobberId ? updated : j)));
    qc.invalidateQueries({ queryKey: qk.settings });
    qc.invalidateQueries({ queryKey: qk.jobbers });
    qc.invalidateQueries({ queryKey: qk.sites });
  }

  async function handleUpdateService(companyId: string, patch: Partial<ServiceCompany>) {
    const updated = await put<ServiceCompany>(`/sites/${selectedSiteId}/service-companies/${companyId}`, patch);
    setServiceCompanies((prev) => prev.map((c) => (c.id === companyId ? updated : c)));
    qc.invalidateQueries({ queryKey: qk.settings });
    qc.invalidateQueries({ queryKey: qk.sites });
  }

  async function handleDeleteJobber(jobber: Jobber) {
    setConfirmJobber(jobber);
  }

  async function handleDeleteJobberConfirmed() {
    if (!confirmJobber) return;
    await del(`/jobbers/${confirmJobber.id}`);
    setJobbers((prev) => prev.filter((j) => j.id !== confirmJobber.id));
    if (settings?.jobberId === confirmJobber.id) {
      await saveNow({ jobberId: undefined, jobberContactName: undefined, jobberPhone: undefined, jobberEmail: undefined });
    }
    setConfirmJobber(null);
    qc.invalidateQueries({ queryKey: qk.settings });
    qc.invalidateQueries({ queryKey: qk.jobbers });
    qc.invalidateQueries({ queryKey: qk.sites });
  }

  async function handleDeleteService(company: ServiceCompany) {
    setConfirmService(company);
  }

  async function handleDeleteServiceConfirmed() {
    if (!confirmService) return;
    await del(`/sites/${selectedSiteId}/service-companies/${confirmService.id}`);
    setServiceCompanies((prev) => prev.filter((c) => c.id !== confirmService.id));
    if (settings?.serviceCompanyId === confirmService.id) {
      await saveNow({ serviceCompanyId: undefined, serviceContactName: undefined, servicePhone: undefined, serviceEmail: undefined, serviceNotes: undefined });
    }
    setConfirmService(null);
    qc.invalidateQueries({ queryKey: qk.settings });
    qc.invalidateQueries({ queryKey: qk.sites });
  }
  const requestDeleteContact = (contact: ManagerContact) => setConfirmDelete(contact);

  async function handleDeleteContactConfirmed() {
    if (!confirmDelete) return;
    await del(`/sites/${selectedSiteId}/contacts/${confirmDelete.id}`);
    setContacts((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    setConfirmDelete(null);
  }

  async function handleAddContact() {
    if (!selectedSiteId || !newContact.name || !newContact.email) return;
    const created = await post<ManagerContact>(`/sites/${selectedSiteId}/contacts`, newContact);
    setContacts((prev) => [created, ...prev]);
    setNewContact({
      name: '',
      role: '',
      email: '',
      phone: '',
      notifyCritical: 'IMMEDIATE',
      notifyWarning: 'HOURLY',
      notifyInfo: 'DAILY',
      notifyEmail: true,
      notifySms: true,
      notifyCall: false,
    });
    setShowAddContact(false);
  }

  const commitLoadDraft = (key: keyof SiteSettings, ref: HTMLInputElement | null) => {
    if (!ref) return;
    const num = Number(ref.value);
    const nextValue = Number.isFinite(num) ? num : 0;
    handleChange(key, nextValue as SiteSettings[keyof SiteSettings]);
  };

  const saveNow = async (partial: Partial<SiteSettings>) => {
    if (!settings) return;
    setSaved(false);
    const next = { ...settings, ...partial };
    setSettings(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const updated = await put<SiteSettings>(`/sites/${selectedSiteId}/settings`, next);
    setSettings(updated);
    setSaved(true);
    qc.invalidateQueries({ queryKey: qk.settings });
    qc.invalidateQueries({ queryKey: qk.sites });
  };


  function renderSection() {
    if (!settings) return <div className="muted">Select a site to load settings.</div>;

    if (section === 'notifications') {
      return (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {contacts.length ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Store managers & owners</div>
              </div>
              <div className="grid" style={{ gap: '0.75rem' }}>
                {contacts.map((c) => (
                  <div key={c.id} className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div className="muted">{c.role}</div>
                        <div className="muted" style={{ fontSize: '0.9rem' }}>
                          {c.email} {c.phone ? `• ${c.phone}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button className="button ghost" type="button" onClick={() => setExpandedContactId(expandedContactId === c.id ? null : c.id)}>
                          {expandedContactId === c.id ? 'Hide' : 'Show'}
                        </button>
                        <button className="button ghost" type="button" onClick={() => requestDeleteContact(c)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedContactId === c.id ? (
                      <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                          <label className="form-field" style={{ margin: 0 }}>
                            <span>Name</span>
                            <input defaultValue={c.name} onBlur={(e) => handleUpdateContact(c.id, { name: e.target.value })} />
                          </label>
                          <label className="form-field" style={{ margin: 0 }}>
                            <span>Role</span>
                            <input defaultValue={c.role} onBlur={(e) => handleUpdateContact(c.id, { role: e.target.value })} />
                          </label>
                          <label className="form-field" style={{ margin: 0 }}>
                            <span>Email</span>
                            <input
                              type="email"
                              defaultValue={c.email}
                              onBlur={(e) => handleUpdateContact(c.id, { email: e.target.value })}
                            />
                          </label>
                          <label className="form-field" style={{ margin: 0 }}>
                            <span>Phone</span>
                            <input defaultValue={c.phone} onBlur={(e) => handleUpdateContact(c.id, { phone: e.target.value })} />
                          </label>
                        </div>
                        <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                          <div className="form-field">
                            <label>Critical</label>
                            <select
                              value={c.notifyCritical}
                              onChange={(e) =>
                                handleUpdateContact(c.id, { notifyCritical: e.target.value as ManagerContact['notifyCritical'] })
                              }
                            >
                              <option value="IMMEDIATE">Immediate</option>
                              <option value="HOURLY">Hourly</option>
                              <option value="DAILY">Daily</option>
                            </select>
                          </div>
                          <div className="form-field">
                            <label>Warnings</label>
                            <select
                              value={c.notifyWarning}
                              onChange={(e) =>
                                handleUpdateContact(c.id, { notifyWarning: e.target.value as ManagerContact['notifyWarning'] })
                              }
                            >
                              <option value="IMMEDIATE">Immediate</option>
                              <option value="HOURLY">Hourly</option>
                              <option value="DAILY">Daily</option>
                            </select>
                          </div>
                          <div className="form-field">
                            <label>Info</label>
                            <select
                              value={c.notifyInfo}
                              onChange={(e) => handleUpdateContact(c.id, { notifyInfo: e.target.value as ManagerContact['notifyInfo'] })}
                            >
                              <option value="IMMEDIATE">Immediate</option>
                              <option value="HOURLY">Hourly</option>
                              <option value="DAILY">Daily</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                          <label className="form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                            <span>Email</span>
                            <input
                              type="checkbox"
                              checked={!!c.notifyEmail}
                              onChange={(e) => handleUpdateContact(c.id, { notifyEmail: e.target.checked })}
                            />
                          </label>
                          <label className="form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                            <span>Text</span>
                            <input
                              type="checkbox"
                              checked={!!c.notifySms}
                              onChange={(e) => handleUpdateContact(c.id, { notifySms: e.target.checked })}
                            />
                          </label>
                          <label className="form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                            <span>Call</span>
                            <input
                              type="checkbox"
                              checked={!!c.notifyCall}
                              onChange={(e) => handleUpdateContact(c.id, { notifyCall: e.target.checked })}
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button ghost" type="button" onClick={() => setShowAddContact((v) => !v)}>
              {showAddContact ? 'Hide add form' : 'Add contact'}
            </button>
          </div>

          {showAddContact ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Add contact</div>
              </div>
              <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="form-field">
                  <label>Name</label>
                  <input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Role</label>
                  <input value={newContact.role} onChange={(e) => setNewContact((p) => ({ ...p, role: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Critical</label>
                  <select
                    value={newContact.notifyCritical}
                    onChange={(e) =>
                      setNewContact((p) => ({ ...p, notifyCritical: e.target.value as ManagerContact['notifyCritical'] }))
                    }
                  >
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Warnings</label>
                  <select
                    value={newContact.notifyWarning}
                    onChange={(e) =>
                      setNewContact((p) => ({ ...p, notifyWarning: e.target.value as ManagerContact['notifyWarning'] }))
                    }
                  >
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Info</label>
                  <select
                    value={newContact.notifyInfo}
                    onChange={(e) => setNewContact((p) => ({ ...p, notifyInfo: e.target.value as ManagerContact['notifyInfo'] }))}
                  >
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <div className="form-field" style={{ gridColumn: '1 / span 2' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!newContact.notifyEmail}
                        onChange={(e) => setNewContact((p) => ({ ...p, notifyEmail: e.target.checked }))}
                      />{' '}
                      Email
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!newContact.notifySms}
                        onChange={(e) => setNewContact((p) => ({ ...p, notifySms: e.target.checked }))}
                      />{' '}
                      Text
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!newContact.notifyCall}
                        onChange={(e) => setNewContact((p) => ({ ...p, notifyCall: e.target.checked }))}
                      />{' '}
                      Phone call
                    </label>
                  </div>
                </div>
              </div>
              <button className="button" type="button" onClick={handleAddContact} style={{ marginTop: '0.5rem' }}>
                Add contact
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (section === 'tanks') {
      return (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Collapsible id="alerts" title="Alerts & thresholds">
            <div
              className="form-field"
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'nowrap',
                justifyContent: 'flex-start',
                alignSelf: 'flex-start',
                width: 'auto',
              }}
            >
              <div style={{ fontWeight: 700 }}>Alerts</div>
              <button
                type="button"
                onClick={() => handleChange('alertsEnabled', !(settings.alertsEnabled ?? true))}
                aria-pressed={settings.alertsEnabled ?? true}
                style={{
                  width: 56,
                  height: 32,
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: settings.alertsEnabled ?? true ? '#10b981' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                  transition: 'background 120ms ease, transform 120ms ease',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: 24,
                    height: 24,
                    borderRadius: '999px',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transform: settings.alertsEnabled ?? true ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 120ms ease',
                  }}
                />
              </button>
            </div>
            <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-field">
                <label>Warn me when below (%)</label>
                <input
                  type="number"
                  value={settings.lowTankPercent}
                  onChange={(e) => handleChange('lowTankPercent', Number(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label>Urgent alert when below (%)</label>
                <input
                  type="number"
                  value={settings.criticalTankPercent}
                  onChange={(e) => handleChange('criticalTankPercent', Number(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label>Daily loss alert above (gal)</label>
                <input
                  type="number"
                  value={settings.dailyVarianceAlertGallons}
                  onChange={(e) => handleChange('dailyVarianceAlertGallons', Number(e.target.value))}
                />
              </div>
            </div>
          </Collapsible>

          <Collapsible id="capacity" title="Default load per grade">
            <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-field">
                <label>Regular load (gal)</label>
                <input
                  type="number"
                  ref={loadRefs.reg}
                  defaultValue={settings.defaultLoadRegGallons ?? ''}
                  onBlur={(e) => commitLoadDraft('defaultLoadRegGallons', e.target)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitLoadDraft('defaultLoadRegGallons', e.target as HTMLInputElement);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
              <div className="form-field">
                <label>Premium load (gal)</label>
                <input
                  type="number"
                  ref={loadRefs.prem}
                  defaultValue={settings.defaultLoadPremGallons ?? ''}
                  onBlur={(e) => commitLoadDraft('defaultLoadPremGallons', e.target)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitLoadDraft('defaultLoadPremGallons', e.target as HTMLInputElement);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
              <div className="form-field">
                <label>Diesel load (gal)</label>
                <input
                  type="number"
                  ref={loadRefs.dsl}
                  defaultValue={settings.defaultLoadDslGallons ?? ''}
                  onBlur={(e) => commitLoadDraft('defaultLoadDslGallons', e.target)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitLoadDraft('defaultLoadDslGallons', e.target as HTMLInputElement);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
              <div className="form-field">
                <label>Midgrade load (gal)</label>
                <input
                  type="number"
                  ref={loadRefs.mid}
                  defaultValue={settings.defaultLoadMidGallons ?? ''}
                  onBlur={(e) => commitLoadDraft('defaultLoadMidGallons', e.target)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitLoadDraft('defaultLoadMidGallons', e.target as HTMLInputElement);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Capacity notes</label>
                <textarea
                  rows={2}
                  value={settings.capacityNotes || ''}
                  onChange={(e) => handleChange('capacityNotes', e.target.value)}
                  style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}
                  placeholder="e.g., Reg 12k, Prem 8k, Diesel 10k"
                />
              </div>
            </div>
          </Collapsible>

          <Collapsible id="blend" title="Type & blending">
            <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-field">
                <label>Tank type policy</label>
                <select
                  value={settings.tankTypePolicy || 'ALLOW_VIRTUAL'}
                  onChange={(e) => handleChange('tankTypePolicy', e.target.value as SiteSettings['tankTypePolicy'])}
                >
                  <option value="PHYSICAL_ONLY">Physical tanks only</option>
                  <option value="ALLOW_VIRTUAL">Allow virtual/blended tanks</option>
                </select>
              </div>
              <div className="form-field">
                <label>Virtual blend ratio</label>
                <input
                  type="text"
                  value={settings.virtualBlendRatio || ''}
                  onChange={(e) => handleChange('virtualBlendRatio', e.target.value)}
                  placeholder="e.g., 60/40 (Prem/Reg)"
                />
              </div>
            </div>
          </Collapsible>

          <Collapsible id="perTank" title="Per-tank settings">
            <div className="grid" style={{ gap: '0.6rem' }}>
              {canonSiteTanks
                .filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE')
                .map((t) => (
                  <div
                    key={t.id}
                    className="card"
                    style={{ margin: 0, border: '1px solid var(--border)', padding: '0.75rem' }}
                  >
                    <div className="card-header" style={{ margin: 0, padding: 0, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{t.name}</div>
                        <div className="muted">{t.productType}</div>
                      </div>
                      {updateTank.isPending ? <span className="muted">Saving...</span> : null}
                    </div>
                    <div className="grid" style={{ gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="form-field">
                        <label>Capacity (gal)</label>
                        <input
                          type="number"
                          defaultValue={t.capacityGallons}
                          onBlur={(e) =>
                            updateTank.mutate(
                              {
                                siteId: t.siteId,
                                tankId: t.id,
                                data: { capacityGallons: Number(e.target.value) || t.capacityGallons },
                              },
                              {
                                onSettled: () => window.scrollTo({ top: window.scrollY }),
                              },
                            )
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label>Warn below (%)</label>
                        <input
                          type="number"
                          defaultValue={t.alertThresholds?.lowPercent ?? settings.lowTankPercent}
                          onBlur={(e) =>
                            updateTank.mutate(
                              {
                                siteId: t.siteId,
                                tankId: t.id,
                                data: {
                                  alertThresholds: {
                                    lowPercent: Number(e.target.value) || settings.lowTankPercent,
                                    criticalPercent: t.alertThresholds?.criticalPercent ?? settings.criticalTankPercent,
                                  },
                                },
                              },
                              { onSettled: () => window.scrollTo({ top: window.scrollY }) },
                            )
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label>Urgent below (%)</label>
                        <input
                          type="number"
                          defaultValue={t.alertThresholds?.criticalPercent ?? settings.criticalTankPercent}
                          onBlur={(e) =>
                            updateTank.mutate(
                              {
                                siteId: t.siteId,
                                tankId: t.id,
                                data: {
                                  alertThresholds: {
                                    lowPercent: t.alertThresholds?.lowPercent ?? settings.lowTankPercent,
                                    criticalPercent: Number(e.target.value) || settings.criticalTankPercent,
                                  },
                                },
                              },
                              { onSettled: () => window.scrollTo({ top: window.scrollY }) },
                            )
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label>Target fill (gal)</label>
                        <input
                          type="number"
                          defaultValue={t.targetFillGallons ?? ''}
                          onBlur={(e) =>
                            updateTank.mutate(
                              {
                                siteId: t.siteId,
                                tankId: t.id,
                                data: {
                                  targetFillGallons: e.target.value ? Number(e.target.value) : undefined,
                                },
                              },
                              { onSettled: () => window.scrollTo({ top: window.scrollY }) },
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {canonSiteTanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE').length === 0 ? (
                <div className="muted">No physical tanks found for this site.</div>
              ) : null}
            </div>
          </Collapsible>
        </div>
      );
    }

    if (section === 'backoffice') {
      return (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="form-field">
            <label>Back office provider</label>
            <select
              value={settings.backOfficeProvider || 'MODISOFT'}
              onChange={(e) => handleChange('backOfficeProvider', e.target.value as SiteSettings['backOfficeProvider'])}
            >
              <option value="MODISOFT">Modisoft</option>
              <option value="C_STORE">C-Store</option>
            </select>
            <div className="muted" style={{ marginTop: '0.25rem' }}>
              Used for POS/back office syncing and inventory reconciliation.
            </div>
          </div>
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              value={settings.backOfficeUsername || ''}
              onChange={(e) => handleChange('backOfficeUsername', e.target.value)}
              placeholder="e.g. storeowner01"
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={settings.backOfficePassword || ''}
              onChange={(e) => handleChange('backOfficePassword', e.target.value)}
              placeholder="Enter password"
            />
          </div>
        </div>
      );
    }

    if (section === 'jobbers') {
      return (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobbers.length ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Saved jobbers</div>
              </div>
              <div className="grid" style={{ gap: '0.5rem' }}>
                {jobbers.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '0.6rem 0.8rem',
                      display: 'grid',
                      gap: '0.4rem',
                      background: j.id === settings.jobberId ? '#eef2ff' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                          {j.name}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={j.id === settings.jobberId}
                              onChange={() => handleSetPrimaryJobber(j)}
                              aria-label="Primary jobber"
                            />
                            <span className="muted" style={{ fontWeight: 600 }}>Primary</span>
                          </label>
                        </div>
                        <div className="muted">{j.contactName || 'Contact TBD'}</div>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {j.phone || ''} {j.email || ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button className="button ghost" type="button" onClick={() => setExpandedJobberId(expandedJobberId === j.id ? null : j.id)}>
                          {expandedJobberId === j.id ? 'Hide' : 'Show'}
                        </button>
                        <button className="button ghost" type="button" onClick={() => handleDeleteJobber(j)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedJobberId === j.id ? (
                      <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="form-field">
                          <label>Phone</label>
                          <input value={j.phone || ''} onChange={(e) => handleUpdateJobber(j.id, { phone: e.target.value })} />
                        </div>
                        <div className="form-field">
                          <label>Email</label>
                          <input value={j.email || ''} onChange={(e) => handleUpdateJobber(j.id, { email: e.target.value })} />
                        </div>
                        <div className="form-field">
                          <label>Preferred channel</label>
                          <select
                            value={j.communication?.preferredChannel || 'EMAIL'}
                            onChange={(e) => handleUpdateJobber(j.id, { communication: { ...j.communication, preferredChannel: e.target.value as any } })}
                          >
                            <option value="PORTAL">Portal</option>
                            <option value="EMAIL">Email</option>
                            <option value="SMS">Text</option>
                            <option value="CALL">Call</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label>Website</label>
                          <input
                            value={j.portal?.url || ''}
                            onChange={(e) => handleUpdateJobber(j.id, { portal: { ...j.portal, url: e.target.value } })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="form-field">
                          <label>Username</label>
                          <input
                            value={j.portal?.username || ''}
                            onChange={(e) => handleUpdateJobber(j.id, { portal: { ...j.portal, username: e.target.value } })}
                          />
                        </div>
                        <div className="form-field">
                          <label>Password</label>
                          <input
                            type="password"
                            value={j.portal?.password || ''}
                            onChange={(e) => handleUpdateJobber(j.id, { portal: { ...j.portal, password: e.target.value } })}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button ghost" type="button" onClick={() => setShowAddJobber((v) => !v)}>
              {showAddJobber ? 'Hide add form' : 'Add jobber'}
            </button>
          </div>

          {showAddJobber ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Add jobber</div>
              </div>
              <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="form-field">
                  <label>Jobber name</label>
                  <input
                    placeholder="Jobber name"
                    value={newJobber.name}
                    onChange={(e) => setNewJobber((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Contact name</label>
                  <input
                    placeholder="Contact name"
                    value={newJobber.contactName}
                    onChange={(e) => setNewJobber((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input
                    placeholder="Phone"
                    value={newJobber.phone}
                    onChange={(e) => setNewJobber((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    placeholder="Email"
                    value={newJobber.email}
                    onChange={(e) => setNewJobber((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Website</label>
                  <input
                    placeholder="https://jobber-website.com"
                    value={(newJobber as any).portalUrl || ''}
                    onChange={(e) => setNewJobber((prev) => ({ ...prev, portalUrl: e.target.value } as any))}
                  />
                </div>
              </div>
              <button className="button" type="button" onClick={handleAddJobber} style={{ marginTop: '0.5rem' }}>
                Add jobber
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (section === 'services') {
      return (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {serviceCompanies.length ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Saved service partners</div>
              </div>
              <div className="grid" style={{ gap: '0.5rem' }}>
                {serviceCompanies.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '0.6rem 0.8rem',
                      display: 'grid',
                      gap: '0.4rem',
                      background: s.id === settings.serviceCompanyId ? '#eef2ff' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                          {s.name}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={s.id === settings.serviceCompanyId}
                              onChange={() => handleSetPrimaryService(s)}
                              aria-label="Primary service company"
                            />
                            <span className="muted" style={{ fontWeight: 600 }}>Primary</span>
                          </label>
                        </div>
                        <div className="muted">{s.contactName || 'Contact TBD'}</div>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {s.phone || ''} {s.email || ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button className="button ghost" type="button" onClick={() => setExpandedServiceId(expandedServiceId === s.id ? null : s.id)}>
                          {expandedServiceId === s.id ? 'Hide' : 'Show'}
                        </button>
                        <button className="button ghost" type="button" onClick={() => handleDeleteService(s)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedServiceId === s.id ? (
                      <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="form-field">
                          <label>Phone</label>
                          <input value={s.phone || ''} onChange={(e) => handleUpdateService(s.id, { phone: e.target.value })} />
                        </div>
                        <div className="form-field">
                          <label>Email</label>
                          <input value={s.email || ''} onChange={(e) => handleUpdateService(s.id, { email: e.target.value })} />
                        </div>
                        <div className="form-field">
                          <label>Website</label>
                          <input
                            value={s.portal?.url || ''}
                            onChange={(e) => handleUpdateService(s.id, { portal: { ...s.portal, url: e.target.value } })}
                            placeholder="https://serviceco.com"
                          />
                        </div>
                        <div className="form-field">
                          <label>Username</label>
                          <input
                            value={s.portal?.username || ''}
                            onChange={(e) => handleUpdateService(s.id, { portal: { ...s.portal, username: e.target.value } })}
                          />
                        </div>
                        <div className="form-field">
                          <label>Password</label>
                          <input
                            type="password"
                            value={s.portal?.password || ''}
                            onChange={(e) => handleUpdateService(s.id, { portal: { ...s.portal, password: e.target.value } })}
                          />
                        </div>
                        <div className="form-field">
                          <label>Preferred channel</label>
                          <select
                            value={s.communication?.preferredChannel || 'EMAIL'}
                            onChange={(e) =>
                              handleUpdateService(s.id, {
                                communication: { ...s.communication, preferredChannel: e.target.value as any },
                              })
                            }
                          >
                            <option value="PORTAL">Portal</option>
                            <option value="EMAIL">Email</option>
                            <option value="SMS">Text</option>
                            <option value="CALL">Call</option>
                          </select>
                        </div>
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Notes</label>
                          <textarea
                            rows={2}
                            value={s.notes || ''}
                            onChange={(e) => handleUpdateService(s.id, { notes: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button ghost" type="button" onClick={() => setShowAddService((v) => !v)}>
              {showAddService ? 'Hide add form' : 'Add service company'}
            </button>
          </div>

          {showAddService ? (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Add service company</div>
              </div>
              <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="form-field">
                  <label>Company name</label>
                  <input
                    placeholder="Company name"
                    value={newService.name}
                    onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Contact name</label>
                  <input
                    placeholder="Contact name"
                    value={newService.contactName}
                    onChange={(e) => setNewService((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input
                    placeholder="Phone"
                    value={newService.phone}
                    onChange={(e) => setNewService((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    placeholder="Email"
                    value={newService.email}
                    onChange={(e) => setNewService((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / span 2' }}>
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Notes or instructions"
                    value={newService.notes}
                    onChange={(e) => setNewService((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-field">
                  <label>Website</label>
                  <input
                    placeholder="https://serviceco.com"
                    value={(newService as any).portalUrl || ''}
                    onChange={(e) => setNewService((prev) => ({ ...prev, portalUrl: e.target.value } as any))}
                  />
                </div>
                <div className="form-field">
                  <label>Preferred channel</label>
                  <select
                    value={(newService as any).preferredChannel || 'EMAIL'}
                    onChange={(e) => setNewService((prev) => ({ ...prev, preferredChannel: e.target.value } as any))}
                  >
                    <option value="PORTAL">Portal</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">Text</option>
                    <option value="CALL">Call</option>
                  </select>
                </div>
              </div>
              <button className="button" type="button" onClick={handleAddServiceCompany} style={{ marginTop: '0.5rem' }}>
                Add service company
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="form-field">
            <label>Critical</label>
            <select
              value={settings.alertFrequencyCritical || 'IMMEDIATE'}
              onChange={(e) => handleChange('alertFrequencyCritical', e.target.value as SiteSettings['alertFrequencyCritical'])}
            >
              <option value="IMMEDIATE">Immediate</option>
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
          <div className="form-field">
            <label>Warnings</label>
            <select
              value={settings.alertFrequencyWarning || 'HOURLY'}
              onChange={(e) => handleChange('alertFrequencyWarning', e.target.value as SiteSettings['alertFrequencyWarning'])}
            >
              <option value="IMMEDIATE">Immediate</option>
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
          <div className="form-field">
            <label>Info</label>
            <select
              value={settings.alertFrequencyInfo || 'DAILY'}
              onChange={(e) => handleChange('alertFrequencyInfo', e.target.value as SiteSettings['alertFrequencyInfo'])}
            >
              <option value="IMMEDIATE">Immediate</option>
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
        </div>

        <div className="grid" style={{ gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="form-field">
            <label>Preferred notification channel</label>
            <select
              value={settings.preferredComm || 'EMAIL'}
              onChange={(e) => handleChange('preferredComm', e.target.value as SiteSettings['preferredComm'])}
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">Text message</option>
              <option value="CALL">Phone call</option>
            </select>
          </div>
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={settings.notifyByEmail}
                onChange={(e) => handleChange('notifyByEmail', e.target.checked)}
              />{' '}
              Notify by email
            </label>
          </div>
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={settings.notifyBySms}
                onChange={(e) => handleChange('notifyBySms', e.target.checked)}
              />{' '}
              Notify by SMS
            </label>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="page">
      <PageHeader
        title={pageHeaderConfig.settings.title}
        subtitle={pageHeaderConfig.settings.subtitle}
        infoTooltip={pageHeaderConfig.settings.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: sites.map((s) => ({ id: s.id, label: s.name })),
        }}
      />
      <div className="card" style={{ marginBottom: '0.75rem', maxWidth: '1200px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700 }}>Settings at a glance</div>
            <span
              aria-label="Info"
              title="We keep these settings in sync so your dashboard, alerts, and orders all match what you configure here."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#e5e7eb',
                color: '#111827',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'help',
              }}
            >
              i
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="kpi" style={{ minWidth: 180 }}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Back office</span>
              <span
                className={
                  (canonicalSnapshot.backOfficeStatus || 'OK') === 'OK'
                    ? 'badge badge-green'
                    : 'badge badge-yellow'
                }
              >
                {canonicalSnapshot.backOfficeStatus || 'OK'}
              </span>
            </div>
            <div className="value">{canonicalSnapshot.backOfficeName}</div>
          </div>
          <div className="kpi" style={{ minWidth: 160 }}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Jobber</span>
              <span className="badge badge-green">OK</span>
            </div>
            <div className="value">{canonicalSnapshot.jobberName}</div>
          </div>
          <div className="kpi" style={{ minWidth: 200 }}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Notification contacts</span>
              <span className="badge badge-green">OK</span>
            </div>
            <div className="value">{canonicalSnapshot.notificationContacts} contacts</div>
          </div>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '260px 1fr',
          gap: '1rem',
          alignItems: 'start',
      maxWidth: '1200px',
      width: '100%',
    }}
  >
        <aside className="card" style={{ position: isNarrow ? 'static' : 'sticky', top: '1rem' }}>
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSectionAndHash(s.key)}
                className={section === s.key ? 'button' : 'button ghost'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {saved ? <div className="muted" style={{ marginTop: '0.5rem' }}>Saved (auto)</div> : null}
        </aside>

        <div className="card" style={{ minHeight: '480px', width: '100%' }}>
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 700 }}>{sectionLabel}</div>
          </div>
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{renderSection()}</div>
        </div>
      </form>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete contact"
        message={`Remove ${confirmDelete?.name || 'this contact'}? They will no longer receive notifications.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleDeleteContactConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmModal
        open={!!confirmJobber}
        title="Delete jobber"
        message={`Remove ${confirmJobber?.name || 'this jobber'}? This will clear it as the primary for this site.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleDeleteJobberConfirmed}
        onCancel={() => setConfirmJobber(null)}
      />
      <ConfirmModal
        open={!!confirmService}
        title="Delete service company"
        message={`Remove ${confirmService?.name || 'this service company'}? This will clear it as the primary for this site.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleDeleteServiceConfirmed}
        onCancel={() => setConfirmService(null)}
      />
    </div>
  );
}

function parseSection(hash: string): SettingsSection | null {
  const clean = hash.replace('#', '').toLowerCase();
  if (
    clean === 'notifications' ||
    clean === 'tanks' ||
    clean === 'backoffice' ||
    clean === 'jobbers' ||
    clean === 'services'
  ) {
    return clean as SettingsSection;
  }
  return null;
}

