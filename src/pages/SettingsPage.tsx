import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { get, post, put } from '../api/apiClient';
import type { Jobber, ManagerContact, ServiceCompany, SiteSettings, SiteSummary } from '../types';

type SettingsSection = 'notifications' | 'tanks' | 'jobbers' | 'services';

const sections: { key: SettingsSection; label: string }[] = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'tanks', label: 'Tank alerts' },
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
  const [newService, setNewService] = useState({ name: '', contactName: '', phone: '', email: '', notes: '' });
  const [newJobber, setNewJobber] = useState({ name: '', contactName: '', phone: '', email: '' });
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddJobber, setShowAddJobber] = useState(false);

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
    });
  }, [selectedSiteId]);

  async function handleChange<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    if (!settings) return;
    setSaved(false);
    const next = { ...settings, [key]: value };
    setSettings(next);
    const updated = await put<SiteSettings>(`/sites/${next.siteId}/settings`, next);
    setSettings(updated);
    setSaved(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    return;
  }

  async function handleAddServiceCompany() {
    if (!selectedSiteId || !newService.name) return;
    const created = await post<ServiceCompany>(`/sites/${selectedSiteId}/service-companies`, {
      siteId: selectedSiteId,
      ...newService,
    });
    setServiceCompanies((prev) => [created, ...prev]);
    setNewService({ name: '', contactName: '', phone: '', email: '', notes: '' });
    if (settings) {
      setSettings({
        ...settings,
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
    const created = await post<Jobber>('/jobbers', newJobber);
    setJobbers((prev) => [created, ...prev]);
    setNewJobber({ name: '', contactName: '', phone: '', email: '' });
    if (settings) {
      setSettings({
        ...settings,
        jobberId: created.id,
        jobberContactName: created.contactName,
        jobberPhone: created.phone,
        jobberEmail: created.email,
      });
    }
  }

  function handleSetPrimaryJobber(jobber: Jobber) {
    if (!settings) return;
    setSettings({
      ...settings,
      jobberId: jobber.id,
      jobberContactName: jobber.contactName,
      jobberPhone: jobber.phone,
      jobberEmail: jobber.email,
    });
  }

  function handleSetPrimaryService(company: ServiceCompany) {
    if (!settings) return;
    setSettings({
      ...settings,
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
                    <div className="card-header">
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div className="muted">{c.role}</div>
                        <div className="muted" style={{ fontSize: '0.9rem' }}>
                          {c.email} {c.phone ? `• ${c.phone}` : ''}
                        </div>
                    </div>
                  </div>
                    <div className="grid" style={{ gap: '0.75rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                      <div className="form-field">
                        <label>Critical alerts</label>
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
                        <label>FYI / info</label>
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
                    <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                      <label className="form-field">
                        <span>Email</span>
                        <input
                          type="checkbox"
                          checked={!!c.notifyEmail}
                          onChange={(e) => handleUpdateContact(c.id, { notifyEmail: e.target.checked })}
                        />
                      </label>
                      <label className="form-field">
                        <span>Text</span>
                        <input
                          type="checkbox"
                          checked={!!c.notifySms}
                          onChange={(e) => handleUpdateContact(c.id, { notifySms: e.target.checked })}
                        />
                      </label>
                      <label className="form-field">
                        <span>Phone call</span>
                        <input
                          type="checkbox"
                          checked={!!c.notifyCall}
                          onChange={(e) => handleUpdateContact(c.id, { notifyCall: e.target.checked })}
                        />
                      </label>
                    </div>
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
                  <label>Critical alerts</label>
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
                  <label>FYI / info</label>
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
          <div className="form-field">
            <label>Warn me when a tank is below (%)</label>
            <input
              type="number"
              value={settings.lowTankPercent}
              onChange={(e) => handleChange('lowTankPercent', Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label>Urgent alert when a tank is below (%)</label>
            <input
              type="number"
              value={settings.criticalTankPercent}
              onChange={(e) => handleChange('criticalTankPercent', Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label>Alert me when daily fuel loss is above (gal)</label>
            <input
              type="number"
              value={settings.dailyVarianceAlertGallons}
              onChange={(e) => handleChange('dailyVarianceAlertGallons', Number(e.target.value))}
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
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: j.id === settings.jobberId ? '#eef2ff' : '#fff',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{j.name}</div>
                      <div className="muted">{j.contactName || 'Contact TBD'}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {j.phone || ''} {j.email || ''}
                      </div>
                    </div>
                    {j.id === settings.jobberId ? null : (
                      <button className="button ghost" type="button" onClick={() => handleSetPrimaryJobber(j)}>
                        Set as primary
                      </button>
                    )}
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
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: s.id === settings.serviceCompanyId ? '#eef2ff' : '#fff',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div className="muted">{s.contactName || 'Contact TBD'}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {s.phone || ''} {s.email || ''}
                      </div>
                    </div>
                    {s.id === settings.serviceCompanyId ? null : (
                      <button className="button ghost" type="button" onClick={() => handleSetPrimaryService(s)}>
                        Set as primary
                      </button>
                    )}
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
            <label>Critical alerts</label>
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
            <label>FYI / info</label>
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
      <h1 style={{ marginBottom: '0.75rem' }}>Settings</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '1rem',
          alignItems: 'start',
          maxWidth: '1200px',
        }}
      >
        <aside className="card" style={{ position: 'sticky', top: '1rem' }}>
          <div className="form-field" style={{ marginBottom: '0.75rem' }}>
            <label>Site</label>
            <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
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
    </div>
  );
}

function parseSection(hash: string): SettingsSection | null {
  const clean = hash.replace('#', '').toLowerCase();
  if (clean === 'notifications' || clean === 'tanks' || clean === 'jobbers' || clean === 'services') {
    return clean as SettingsSection;
  }
  return null;
}
