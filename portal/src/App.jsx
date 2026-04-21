import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CoreForm, searchSubmissions, fetchSubmission, defineKqlQuery } from '@kineticdata/react';

// useData hook — not exported by @kineticdata/react, must implement locally
function useData(fn, params) {
  const [[response, lastTimestamp], setData] = useState([null, null]);
  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn(params).then(response => {
        setData(([d, ts]) => {
          if (ts === timestamp) return [response, null];
          else return [d, ts];
        });
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params]);
  useEffect(() => { executeQuery(); }, [executeQuery]);
  return useMemo(() => ({
    initialized: !!params,
    loading: !!params && (!response || !!lastTimestamp),
    response,
    actions: { reloadData: executeQuery },
  }), [params, response, lastTimestamp, executeQuery]);
}

const KAPP = 'ai-testing';

// --- Navigation ---
function Nav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? { fontWeight: 'bold', borderBottom: '2px solid #0066cc' } : {};
  return (
    <nav style={{ borderBottom: '1px solid #ddd', padding: '12px 20px', display: 'flex', gap: 24, alignItems: 'center' }}>
      <strong style={{ marginRight: 16 }}>IT Help Desk</strong>
      <Link to="/" style={isActive('/')}>Tickets</Link>
      <Link to="/approvals" style={isActive('/approvals')}>My Actions</Link>
      <Link to="/requests" style={isActive('/requests')}>Approval Requests</Link>
      <Link to="/kitchen-sink" style={isActive('/kitchen-sink')}>Kitchen Sink</Link>
      <Link to="/new" style={{ marginLeft: 'auto', padding: '6px 14px', background: '#0066cc', color: 'white', textDecoration: 'none', borderRadius: 4 }}>
        New Ticket
      </Link>
    </nav>
  );
}

// --- Submission List (reusable) ---
function SubmissionList({ formSlug, title, columns, detailPath, kqlQuery }) {
  const params = useMemo(() => {
    const p = {
      kapp: KAPP,
      search: { include: ['details', 'values', 'form'], limit: 25 },
    };
    if (formSlug) p.form = formSlug;
    if (kqlQuery) p.search.q = kqlQuery;
    return p;
  }, [formSlug, kqlQuery]);

  const { loading, response, actions } = useData(searchSubmissions, params);
  const submissions = response?.submissions || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{title}</h2>
        <button onClick={actions.reloadData} style={{ padding: '4px 10px' }}>Refresh</button>
      </div>
      {loading && <p>Loading...</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            {columns.map(c => <th key={c.key} style={{ padding: 8 }}>{c.label}</th>)}
            <th style={{ padding: 8 }}>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: 8 }}>
                  {c.link ? <Link to={`${detailPath}/${s.id}`}>{c.render(s)}</Link> : c.render(s)}
                </td>
              ))}
              <td style={{ padding: 8 }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'Draft'}</td>
            </tr>
          ))}
          {!loading && submissions.length === 0 && (
            <tr><td colSpan={columns.length + 1} style={{ padding: 16, textAlign: 'center', color: '#999' }}>None found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Ticket List ---
function TicketList() {
  return (
    <SubmissionList
      formSlug="help-desk-ticket"
      title="Help Desk Tickets"
      detailPath="/tickets"
      columns={[
        { key: 'summary', label: 'Summary', link: true, render: s => s.values?.Summary || '(no summary)' },
        { key: 'category', label: 'Category', render: s => s.values?.Category },
        { key: 'priority', label: 'Priority', render: s => s.values?.Priority },
        { key: 'status', label: 'Status', render: s => s.values?.Status },
      ]}
    />
  );
}

// --- My Actions (kapp-wide search: type=Approval AND coreState=Draft) ---
function MyActions() {
  // Kapp-wide query — no form slug, searches across all forms by type
  const kql = 'type = "Approval" AND coreState = "Draft"';
  return (
    <SubmissionList
      title="My Actions — Pending Approvals"
      kqlQuery={kql}
      detailPath="/approve"
      columns={[
        { key: 'form', label: 'Form', render: s => s.form?.name || '?' },
        { key: 'approver', label: 'Approver', render: s => s.values?.Approver },
        { key: 'origId', label: 'Request ID', link: true, render: s => (s.values?.['Original Submission Id'] || '').slice(0, 8) + '...' },
        { key: 'state', label: 'State', render: s => s.coreState },
      ]}
    />
  );
}

// --- Approval Requests ---
function ApprovalRequests() {
  return (
    <SubmissionList
      formSlug="approval-request"
      title="Approval Requests"
      detailPath="/requests"
      columns={[
        { key: 'summary', label: 'Request', link: true, render: s => s.values?.['Request Summary'] || '(no summary)' },
        { key: 'priority', label: 'Priority', render: s => s.values?.Priority },
        { key: 'status', label: 'Status', render: s => s.values?.Status },
      ]}
    />
  );
}

// --- New Ticket (CoreForm) ---
function NewTicket() {
  const navigate = useNavigate();
  return (
    <div>
      <h2>Submit a Ticket</h2>
      <CoreForm kapp={KAPP} form="help-desk-ticket" completed={() => navigate('/')} />
    </div>
  );
}

// --- New Approval Request (CoreForm) ---
function NewApprovalRequest() {
  const navigate = useNavigate();
  return (
    <div>
      <h2>Submit Approval Request</h2>
      <CoreForm kapp={KAPP} form="approval-request" completed={() => navigate('/requests')} />
    </div>
  );
}

// --- Approve (CoreForm for existing submission) ---
function ApproveSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <Link to="/approvals">← Back to actions</Link>
      <h2>Review Approval</h2>
      <CoreForm submission={id} completed={() => navigate('/approvals')} />
    </div>
  );
}

// --- Submission Detail ---
function SubmissionDetail({ backPath, backLabel }) {
  const { id } = useParams();
  const params = useMemo(() => id ? { id, include: 'details,values' } : null, [id]);
  const { loading, response } = useData(fetchSubmission, params);
  const sub = response?.submission;

  if (loading) return <p>Loading...</p>;
  if (!sub) return <p>Not found</p>;

  return (
    <div>
      <Link to={backPath}>← {backLabel}</Link>
      <h2>{sub.label || sub.values?.Summary || sub.values?.['Request Summary'] || 'Submission'}</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {Object.entries(sub.values || {}).map(([k, v]) => (
            <tr key={k} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8, fontWeight: 'bold', verticalAlign: 'top' }}>{k}</td>
              <td style={{ padding: 8 }}>{Array.isArray(v) ? v.join(', ') : String(v || '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: '#666', marginTop: 16 }}>State: {sub.coreState} | Submitted: {sub.submittedAt}</p>
    </div>
  );
}

// --- Kitchen Sink (CoreForm) ---
function KitchenSink() {
  const navigate = useNavigate();
  return (
    <div>
      <h2>Kitchen Sink Form</h2>
      <p style={{ color: '#666' }}>Tests every field type, property variation, choice source, constraint, expression, and layout element.</p>
      <CoreForm kapp={KAPP} form="kitchen-sink" completed={() => navigate('/')} />
    </div>
  );
}

// --- App Shell ---
export function App({ initialized, loggedIn, loginProps }) {
  if (!initialized) return <div style={{ padding: 40, textAlign: 'center' }}>Initializing...</div>;

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
        <h1>IT Help Desk — Login</h1>
        <form onSubmit={loginProps.onLogin}>
          <div style={{ marginBottom: 12 }}>
            <label>Username<br/>
              <input value={loginProps.username} onChange={loginProps.onChangeUsername} style={{ width: '100%', padding: 8 }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Password<br/>
              <input type="password" value={loginProps.password} onChange={loginProps.onChangePassword} style={{ width: '100%', padding: 8 }} />
            </label>
          </div>
          <button type="submit" disabled={loginProps.pending} style={{ padding: '8px 16px' }}>
            {loginProps.pending ? 'Logging in...' : 'Log In'}
          </button>
          {loginProps.error && <p style={{ color: 'red' }}>{loginProps.error}</p>}
        </form>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <Routes>
          <Route path="/" element={<TicketList />} />
          <Route path="/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<SubmissionDetail backPath="/" backLabel="Back to tickets" />} />
          <Route path="/approvals" element={<MyActions />} />
          <Route path="/approve/:id" element={<ApproveSubmission />} />
          <Route path="/requests" element={<ApprovalRequests />} />
          <Route path="/requests/new" element={<NewApprovalRequest />} />
          <Route path="/requests/:id" element={<SubmissionDetail backPath="/requests" backLabel="Back to requests" />} />
          <Route path="/kitchen-sink" element={<KitchenSink />} />
        </Routes>
      </div>
    </>
  );
}
