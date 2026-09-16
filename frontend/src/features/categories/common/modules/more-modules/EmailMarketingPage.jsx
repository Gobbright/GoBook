import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, Bot, CheckCircle2, ChevronDown, ChevronRight,
  Edit3, FileText, Gauge, Layers3, Mail, MoreVertical, Plus,
  Search, Send, ShieldOff, Trash2, UserX, Users, XCircle,
} from 'lucide-react';

import { apiClient } from '../../../../../services/apiClient.js';

const EMPTY = {
  name: '',
  campaignType: 'Promotional',
  description: '',
  tags: '',
  audienceType: 'Customers',
  audienceName: 'VIP Customers',
  fromName: 'GoBook Store',
  fromEmail: 'marketing@store.com',
  subject: '',
  previewText: '',
  body: '',
  recipientsText: '',
  sendMode: 'Schedule',
  scheduledAt: '',
  openTracking: true,
  clickTracking: true,
  utmTracking: true,
};
const EMPTY_LIST = { name: '', contacts: '' };
const TABS = ['Dashboard', 'Campaigns', 'Templates', 'Contacts', 'Segments', 'Automations', 'Sequences', 'Analytics', 'Suppression List'];
const CAMPAIGN_TYPES = ['Promotional', 'Newsletter', 'Product', 'Event', 'Lead Nurturing', 'Customer Retention'];
const CAMPAIGN_STATUSES = ['All', 'Draft', 'Scheduled', 'Sending', 'Sent', 'Failed', 'Paused'];
const DATE_FILTERS = ['All Dates', 'Today', 'Last 7 days', 'Last 30 days', 'Custom Range'];
const AUDIENCES = ['All Audiences', 'All Contacts', 'Customers', 'Leads', 'VIP Customers', 'Subscribers'];
const WIZARD_STEPS = ['Details', 'Audience', 'Content', 'Settings', 'Review'];
const TEMPLATE_CATEGORIES = [
  'All', 'Promotional', 'Offers & Discounts', 'Product Launch', 'Newsletter', 'Festival', 'Event Invitation',
  'Announcement', 'Seasonal Campaign', 'Welcome', 'Thank You', 'Birthday', 'Customer Feedback', 'Review Request',
  'Re-engagement', 'Customer Anniversary', 'New Lead', 'Lead Follow-up', 'Lead Nurturing', 'Sales Offer',
  'Quotation Follow-up', 'Abandoned Cart', 'Transactional', 'Invoice', 'Payment Reminder', 'Payment Received',
  'Order Confirmation', 'Purchase Order', 'Quotation', 'Delivery', 'Credit Note', 'Debit Note',
];
const TEMPLATE_TYPES = ['All Types', 'Marketing', 'Transactional'];
const TEMPLATE_STATUSES = ['All Status', 'Draft', 'Active', 'Archived'];
const TEMPLATE_CREATORS = ['All Creators', 'My Templates', 'GoBook Templates'];
const EMAIL_BLOCKS = ['Text', 'Heading', 'Image', 'Button', 'Divider', 'Spacer', 'Video', 'Social'];
const ERP_BLOCKS = ['Product', 'Product Grid', 'Price', 'Discount', 'Coupon', 'Invoice', 'Payment', 'Order', 'Customer Details'];
const TEMPLATE_VARIABLES = {
  Customer: ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'City'],
  Business: ['Company Name', 'Website', 'Phone'],
  Invoice: ['Invoice Number', 'Invoice Date', 'Total', 'Due Date'],
  Product: ['Product Name', 'Price', 'Discount', 'SKU'],
};
const TEMPLATE_LIBRARY = [];
const CONTACT_TYPES = ['All Types', 'Customer', 'Lead', 'Prospect', 'Subscriber', 'Supplier', 'Other'];
const CONTACT_STATUSES = ['All Status', 'Subscribed', 'Unsubscribed', 'Pending', 'Bounced', 'Suppressed', 'Not Specified'];
const CONTACT_SOURCES = ['All Sources', 'GoBook Customers', 'GoBook CRM', 'Website Contact Form', 'Lead Form', 'CSV Import', 'Manual Entry', 'API Integration', 'Landing Page'];
const CONTACT_TAGS = ['All Tags', 'VIP', 'Retail', 'Wholesale', 'New Customer', 'Inactive', 'High Value', 'Festival Campaign', 'Electronics'];
const CONTACT_TABS = ['All Contacts', 'Subscribers', 'Customers', 'Leads', 'Suppressed'];
const CONTACT_LIBRARY = [];
const EMPTY_CONTACT = { firstName: '', lastName: '', email: '', phone: '', company: '', type: 'Customer', source: 'Manual Entry', tags: 'VIP, Retail', status: 'Subscribed', consentSource: 'Website Form', consentDate: '2026-09-12' };
const SEGMENT_TYPES = ['All Types', 'Dynamic', 'Static'];
const SEGMENT_SOURCES = ['All Sources', 'All Email Contacts', 'GoBook Customers', 'CRM Leads', 'Website Leads', 'Imported Contacts', 'Existing Segment'];
const SEGMENT_SORTS = ['Recently Updated', 'Most Contacts', 'Most Used', 'Name'];
const SEGMENT_CATEGORIES = ['Customers', 'Leads', 'Prospects', 'Subscribers', 'Purchase-based', 'Email engagement', 'CRM activity', 'Custom'];
const SEGMENT_RULE_FIELDS = ['Contact Type', 'Total Purchase Value', 'Marketing Consent', 'Last Purchase Date', 'Email Engagement', 'Lead Status', 'Tags', 'City'];
const SEGMENT_OPERATORS = ['is', 'is not', 'greater than', 'less than', 'contains', 'does not contain', 'more than days ago'];
const SEGMENT_LIBRARY = [];
const SEGMENT_TEMPLATES = ['New Customers', 'VIP Customers', 'Repeat Customers', 'Inactive Customers', 'Hot Leads', 'Warm Leads', 'Highly Engaged Contacts', 'Never Opened Emails', 'No Purchase in 30 Days', 'Purchased Specific Product'];
const EMPTY_SEGMENT = { name: '', description: '', type: 'Dynamic', category: 'Customers', tags: 'VIP, Retail', source: 'GoBook Customers', matchMode: 'AND', rules: [{ field: 'Contact Type', operator: 'is', value: 'Customer' }, { field: 'Marketing Consent', operator: 'is', value: 'Subscribed' }] };
const AUTOMATION_STATUSES = ['All', 'Active', 'Draft', 'Paused', 'Archived', 'Error'];
const AUTOMATION_TRIGGERS = ['All Triggers', 'Customer Created', 'New Lead', 'Order Completed', 'No Purchase 60d', 'Invoice Overdue', 'Email Opened', 'Link Clicked', 'Contact Subscribed'];
const AUTOMATION_SORTS = ['Recently Updated', 'Most Enrolled', 'Most Executions', 'Name'];
const AUTOMATION_LIBRARY = [];
const AUTOMATION_TEMPLATES = ['New Customer Welcome', 'New Lead Nurturing', 'Post-Purchase Follow-up', 'Inactive Customer', 'Birthday Campaign', 'Invoice Payment Reminder', 'Payment Confirmation', 'Welcome New Subscriber'];
const AUTOMATION_NODE_TYPES = ['Send Email', 'Send Template', 'Add Contact Tag', 'Remove Contact Tag', 'Add to Segment', 'Update Contact Field', 'Wait', 'Add Condition', 'Split Audience', 'Notify Salesperson', 'Notify Admin', 'End Workflow'];
const EMPTY_AUTOMATION = { name: '', description: '', category: 'Customer Marketing', tags: '', trigger: 'Customer Created', status: 'Draft', enrollment: 'Once per contact', senderEmail: 'marketing@store.com', replyTo: 'support@store.com', sendingHours: '9 AM - 6 PM', timezone: 'IST', nodes: ['TRIGGER: Customer Created', 'SEND EMAIL: Welcome Email', 'WAIT: 3 Days'] };
const SEQUENCE_STATUSES = ['All', 'Active', 'Draft', 'Paused', 'Archived', 'Error'];
const SEQUENCE_TYPES = ['All Types', 'Customer Onboarding', 'Sales', 'Customer', 'Retention', 'Marketing', 'Education'];
const SEQUENCE_SORTS = ['Recently Updated', 'Most Enrolled', 'Most Steps', 'Name'];
const SEQUENCE_WIZARD_STEPS = ['Details', 'Audience', 'Sequence Builder', 'Settings', 'Review & Activate'];
const SEQUENCE_TEMPLATES = ['New Customer Welcome', 'New Lead Nurturing', 'Post-Purchase Follow-up', 'Customer Win-Back', 'Newsletter Series', 'Festival Promotion', 'Product Education', 'Review Request'];
const SEQUENCE_STEP_TYPES = ['Email', 'Delay', 'Condition'];
const SEQUENCE_LIBRARY = [];
const EMPTY_SEQUENCE = { name: '', description: '', type: 'Customer Onboarding', tags: 'Welcome, Customer', owner: 'Marketing Team', language: 'English', defaultSender: 'GoBook Store <marketing@store.com>', timezone: 'IST', audienceSource: 'Select Segment', audience: 'New Customers', enrollmentMethod: 'Enroll from CRM trigger', enrollmentRule: 'One enrollment per contact', goal: 'Purchase completed', sendWindow: '10:00 AM', stopOnUnsubscribe: true, stopOnSuppressed: true, exitOnGoal: true, steps: [{ type: 'Email', name: 'Welcome Email', timing: 'Immediately', template: 'Welcome Customer', subject: 'Welcome to {{company.name}}' }, { type: 'Delay', name: 'Wait 2 Days', timing: '2 days', template: '', subject: '' }, { type: 'Email', name: 'Product Guide', timing: 'After previous step', template: 'Product Education', subject: 'A quick guide for {{customer.name}}' }] };
const SUPPRESSION_TYPES = ['All', 'Unsubscribed', 'Hard Bounce', 'Soft Bounce', 'Spam Complaint', 'Manual', 'Domain Blocked'];
const SUPPRESSION_SOURCES = ['All Sources', 'Campaign', 'Automation', 'Sequence', 'Import', 'Manual', 'System', 'Email Provider'];
const SUPPRESSION_DATES = ['All Dates', 'Today', 'Last 7 Days', 'Last 30 Days', 'Custom Range'];
const SUPPRESSION_LIBRARY = [];
const EMPTY_SUPPRESSION = { name: '', email: '', type: 'Subscriber', suppressionType: 'Manual', reason: '', source: 'Manual', notes: '', expiryDate: '', category: 'Marketing emails', applyTo: 'Marketing emails' };

const STATUS_STYLES = {
  Draft: 'bg-amber-50 text-amber-700',
  Scheduled: 'bg-blue-50 text-blue-700',
  Sent: 'bg-emerald-50 text-emerald-700',
  Sending: 'bg-violet-50 text-violet-700',
  Failed: 'bg-red-50 text-red-700',
  Paused: 'bg-slate-100 text-slate-600',
};
const STATUS_DOTS = { Sent: 'bg-emerald-500', Scheduled: 'bg-blue-500', Draft: 'bg-amber-500', Sending: 'bg-violet-500', Failed: 'bg-red-500', Paused: 'bg-slate-400' };

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function pct(n, d, digits = 1) {
  if (!d) return '0%';
  return `${((Number(n || 0) / Number(d || 0)) * 100).toFixed(digits)}%`;
}

function campaignType(row) {
  return row.campaignType || row.type || 'Promotional';
}

function audienceName(row) {
  return row.audienceName || row.audience || 'Customers';
}

function campaignRecipients(row) {
  return Number(row.recipientCount || (row.recipients ?? []).length || 0);
}

function campaignDate(row) {
  return row.status === 'Scheduled' ? row.scheduledAt : (row.sentOn || row.createdAt);
}

function isWithinDateFilter(row, filter) {
  if (filter === 'All Dates' || filter === 'Custom Range') return true;
  const value = campaignDate(row);
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  if (filter === 'Today') start.setHours(0, 0, 0, 0);
  if (filter === 'Last 7 days') start.setDate(now.getDate() - 7);
  if (filter === 'Last 30 days') start.setDate(now.getDate() - 30);
  return date >= start;
}

function isWithinSimpleDate(value, filter) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  if (filter === 'Today') start.setHours(0, 0, 0, 0);
  if (filter === 'Yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }
  if (filter === 'Last 7 Days') start.setDate(now.getDate() - 7);
  if (filter === 'Last 30 Days') start.setDate(now.getDate() - 30);
  return date >= start;
}

function actionItemsForStatus(status) {
  if (status === 'Draft') return ['Edit', 'Duplicate', 'Send Test', 'Delete'];
  if (status === 'Scheduled') return ['View', 'Edit', 'Reschedule', 'Pause', 'Duplicate', 'Cancel'];
  if (status === 'Sent') return ['View Report', 'Duplicate', 'View Campaign', 'Export Report'];
  if (status === 'Paused') return ['Resume', 'Edit', 'Duplicate', 'Archive', 'Delete'];
  return ['View Report', 'Edit', 'Duplicate', 'Send Test', 'Archive', 'Delete'];
}

function Card({ children, className = '' }) {
  return <section className={`min-w-0 rounded-lg border border-[#dfe7f1] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>;
}

function IconButton({ title, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MiniChart({ totals }) {
  const base = Math.max(1, totals.sent);
  const bars = [
    ['Emails Sent', totals.sent, '#2563eb'],
    ['Delivered', Math.max(0, totals.sent - totals.failed), '#059669'],
    ['Opened', totals.opened, '#6d28d9'],
    ['Clicked', totals.clicked, '#f97316'],
  ];
  return (
    <div className="relative min-h-[240px] rounded-md border border-[#edf2f7] bg-white px-5 py-4">
      <div className="mb-4 flex flex-wrap gap-6 text-[12px] font-bold text-[#536173]">
        {bars.map(([label, , color]) => (
          <span key={label} className="inline-flex items-center gap-2"><span className="h-1.5 w-4 rounded-full" style={{ background: color }} />{label}</span>
        ))}
      </div>
      <div className="grid h-36 grid-cols-4 items-end gap-4 border-b border-[#e7eef7]">
        {bars.map(([label, value, color]) => (
          <div key={label} className="flex h-full flex-col justify-end gap-2">
            <div className="mx-auto w-full max-w-[76px] rounded-t-md" style={{ height: `${Math.max(6, (value / base) * 100)}%`, background: `${color}24`, borderTop: `3px solid ${color}` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-4 text-center text-[11px] text-[#536173]">
        {bars.map(([label]) => <span key={label}>{label.split(' ')[0]}</span>)}
      </div>
    </div>
  );
}

export function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [listForm, setListForm] = useState(EMPTY_LIST);
  const [emailLists, setEmailLists] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [campaignFilters, setCampaignFilters] = useState({ status: 'All', type: 'All Types', date: 'All Dates', audience: 'All Audiences' });
  const [summaryFilter, setSummaryFilter] = useState('All');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [templates, setTemplates] = useState(TEMPLATE_LIBRARY);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilters, setTemplateFilters] = useState({ category: 'All', type: 'All Types', status: 'All Status', createdBy: 'All Creators' });
  const [templateView, setTemplateView] = useState('grid');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateDraft, setTemplateDraft] = useState({ name: '', category: 'Promotional', description: '', tags: '', subject: '', previewText: '', aiPrompt: '', previewMode: 'Desktop', columns: '3', primaryColor: '#2563eb', secondaryColor: '#0f172a', font: 'Inter', buttonStyle: 'Rounded', testEmail: '' });
  const [contacts, setContacts] = useState(CONTACT_LIBRARY);
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilters, setContactFilters] = useState({ type: 'All Types', status: 'All Status', source: 'All Sources', tag: 'All Tags' });
  const [contactTab, setContactTab] = useState('All Contacts');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showImportContacts, setShowImportContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [segments, setSegments] = useState(SEGMENT_LIBRARY);
  const [segmentSearch, setSegmentSearch] = useState('');
  const [segmentFilters, setSegmentFilters] = useState({ type: 'All Types', source: 'All Sources', sort: 'Recently Updated' });
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false);
  const [segmentForm, setSegmentForm] = useState(EMPTY_SEGMENT);
  const [editingSegment, setEditingSegment] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [previewSegment, setPreviewSegment] = useState(null);
  const [automationRows, setAutomationRows] = useState(AUTOMATION_LIBRARY);
  const [automationSearch, setAutomationSearch] = useState('');
  const [automationFilters, setAutomationFilters] = useState({ status: 'All', trigger: 'All Triggers', sort: 'Recently Updated' });
  const [automationTab, setAutomationTab] = useState('All');
  const [showAutomationBuilder, setShowAutomationBuilder] = useState(false);
  const [automationForm, setAutomationForm] = useState(EMPTY_AUTOMATION);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [sequenceRows, setSequenceRows] = useState(SEQUENCE_LIBRARY);
  const [sequenceSearch, setSequenceSearch] = useState('');
  const [sequenceFilters, setSequenceFilters] = useState({ status: 'All', type: 'All Types', sort: 'Recently Updated' });
  const [sequenceTab, setSequenceTab] = useState('All');
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false);
  const [sequenceStep, setSequenceStep] = useState(0);
  const [sequenceForm, setSequenceForm] = useState(EMPTY_SEQUENCE);
  const [editingSequence, setEditingSequence] = useState(null);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [analyticsFilters, setAnalyticsFilters] = useState({ date: 'Last 30 Days', campaign: 'All Campaigns', segment: 'All Segments', device: 'All Devices' });
  const [suppressionRows, setSuppressionRows] = useState(SUPPRESSION_LIBRARY);
  const [suppressionSearch, setSuppressionSearch] = useState('');
  const [suppressionFilters, setSuppressionFilters] = useState({ type: 'All', source: 'All Sources', date: 'All Dates' });
  const [suppressionTab, setSuppressionTab] = useState('All');
  const [selectedSuppressionIds, setSelectedSuppressionIds] = useState([]);
  const [selectedSuppression, setSelectedSuppression] = useState(null);
  const [showSuppressionForm, setShowSuppressionForm] = useState(false);
  const [suppressionForm, setSuppressionForm] = useState(EMPTY_SUPPRESSION);

  async function load() {
    try {
      const data = await apiClient('/more-modules/email-campaigns');
      setCampaigns(data.campaigns ?? []);
      setStats(data.stats ?? {});
    } catch (err) {
      setNotice(err.message || 'Unable to load email campaigns.');
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [c.name, c.subject, c.status, campaignType(c), audienceName(c)].some((value) => String(value ?? '').toLowerCase().includes(q));
    const matchesStatus = campaignFilters.status === 'All' || c.status === campaignFilters.status;
    const matchesSummary = summaryFilter === 'All' || c.status === summaryFilter;
    const matchesType = campaignFilters.type === 'All Types' || campaignType(c) === campaignFilters.type;
    const matchesAudience = campaignFilters.audience === 'All Audiences' || audienceName(c) === campaignFilters.audience || campaignFilters.audience === c.audienceType;
    return matchesSearch && matchesStatus && matchesSummary && matchesType && matchesAudience && isWithinDateFilter(c, campaignFilters.date);
  });

  const statusCounts = useMemo(() => CAMPAIGN_STATUSES.reduce((acc, status) => {
    acc[status] = status === 'All' ? campaigns.length : campaigns.filter((item) => item.status === status).length;
    return acc;
  }, {}), [campaigns]);

  const totals = useMemo(() => {
    const totalSent = Number(stats.totalSent || 0) || campaigns.reduce((sum, c) => sum + Number(c.sent || 0), 0);
    const totalOpened = Number(stats.totalOpened || 0) || campaigns.reduce((sum, c) => sum + Number(c.opened || 0), 0);
    const totalClicked = Number(stats.totalClicked || 0) || campaigns.reduce((sum, c) => sum + Number(c.clicked || 0), 0);
    const totalBounced = Number(stats.totalBounced || 0) || campaigns.reduce((sum, c) => sum + Number(c.bounced || 0), 0);
    return {
      campaignsSent: campaigns.filter((c) => c.status === 'Sent').length,
      sent: totalSent,
      delivered: Math.max(0, totalSent - totalBounced),
      opened: totalOpened,
      clicked: totalClicked,
      failed: totalBounced,
    };
  }, [campaigns, stats]);

  const topCampaigns = [...campaigns]
    .sort((a, b) => (Number(b.opened || 0) / Math.max(1, Number(b.sent || 0))) - (Number(a.opened || 0) / Math.max(1, Number(a.sent || 0))))
    .slice(0, 5);

  const filteredTemplates = templates.filter((template) => {
    const q = templateSearch.trim().toLowerCase();
    const matchesSearch = !q || [template.name, template.category, template.description, ...(template.tags || [])].some((value) => String(value ?? '').toLowerCase().includes(q));
    const matchesCategory = templateFilters.category === 'All' || template.category === templateFilters.category;
    const matchesType = templateFilters.type === 'All Types' || template.type === templateFilters.type;
    const matchesStatus = templateFilters.status === 'All Status' || template.status === templateFilters.status;
    const matchesCreator = templateFilters.createdBy === 'All Creators' || template.createdBy === templateFilters.createdBy;
    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesCreator;
  });

  const filteredContacts = contacts.filter((contact) => {
    const q = contactSearch.trim().toLowerCase();
    const matchesSearch = !q || [contact.firstName, contact.lastName, contact.email, contact.company, contact.type, contact.source, contact.status, ...(contact.tags || [])].some((value) => String(value ?? '').toLowerCase().includes(q));
    const matchesType = contactFilters.type === 'All Types' || contact.type === contactFilters.type;
    const matchesStatus = contactFilters.status === 'All Status' || contact.status === contactFilters.status;
    const matchesSource = contactFilters.source === 'All Sources' || contact.source === contactFilters.source;
    const matchesTag = contactFilters.tag === 'All Tags' || (contact.tags || []).includes(contactFilters.tag);
    const matchesTab = contactTab === 'All Contacts'
      || (contactTab === 'Subscribers' && contact.status === 'Subscribed')
      || (contactTab === 'Customers' && contact.type === 'Customer')
      || (contactTab === 'Leads' && contact.type === 'Lead')
      || (contactTab === 'Suppressed' && ['Suppressed', 'Unsubscribed', 'Bounced'].includes(contact.status));
    return matchesSearch && matchesType && matchesStatus && matchesSource && matchesTag && matchesTab;
  });

  const contactStats = useMemo(() => ({
    total: contacts.length,
    subscribed: contacts.filter((item) => item.status === 'Subscribed').length,
    unsubscribed: contacts.filter((item) => item.status === 'Unsubscribed').length,
    bounced: contacts.filter((item) => item.status === 'Bounced').length,
    engaged: contacts.filter((item) => !['Never opened', ''].includes(item.engagement)).length,
  }), [contacts]);

  const filteredSegments = useMemo(() => {
    const q = segmentSearch.trim().toLowerCase();
    const rows = segments.filter((segment) => {
      const matchesSearch = !q || [segment.name, segment.description, segment.category, segment.type, segment.source].some((value) => String(value ?? '').toLowerCase().includes(q));
      const matchesType = segmentFilters.type === 'All Types' || segment.type === segmentFilters.type;
      const matchesSource = segmentFilters.source === 'All Sources' || segment.source === segmentFilters.source;
      return matchesSearch && matchesType && matchesSource;
    });
    return [...rows].sort((a, b) => {
      if (segmentFilters.sort === 'Most Contacts') return b.contacts - a.contacts;
      if (segmentFilters.sort === 'Most Used') return b.usedIn - a.usedIn;
      if (segmentFilters.sort === 'Name') return a.name.localeCompare(b.name);
      return new Date(b.updatedOn) - new Date(a.updatedOn);
    });
  }, [segments, segmentSearch, segmentFilters]);

  const segmentStats = useMemo(() => ({
    total: segments.length,
    active: segments.filter((segment) => segment.status === 'Active').length,
    dynamic: segments.filter((segment) => segment.type === 'Dynamic').length,
    static: segments.filter((segment) => segment.type === 'Static').length,
  }), [segments]);

  const filteredAutomations = useMemo(() => {
    const q = automationSearch.trim().toLowerCase();
    const rows = automationRows.filter((row) => {
      const matchesSearch = !q || [row.name, row.trigger, row.status, row.category, row.description].some((value) => String(value ?? '').toLowerCase().includes(q));
      const matchesStatus = automationFilters.status === 'All' || row.status === automationFilters.status;
      const matchesTab = automationTab === 'All' || row.status === automationTab;
      const matchesTrigger = automationFilters.trigger === 'All Triggers' || row.trigger === automationFilters.trigger;
      return matchesSearch && matchesStatus && matchesTab && matchesTrigger;
    });
    return [...rows].sort((a, b) => {
      if (automationFilters.sort === 'Most Enrolled') return b.enrolled - a.enrolled;
      if (automationFilters.sort === 'Most Executions') return b.executions - a.executions;
      if (automationFilters.sort === 'Name') return a.name.localeCompare(b.name);
      return new Date(b.lastRun || 0) - new Date(a.lastRun || 0);
    });
  }, [automationRows, automationSearch, automationFilters, automationTab]);

  const automationStats = useMemo(() => ({
    total: automationRows.length,
    active: automationRows.filter((row) => row.status === 'Active').length,
    draft: automationRows.filter((row) => row.status === 'Draft').length,
    executions: automationRows.reduce((sum, row) => sum + Number(row.executions || 0), 0),
  }), [automationRows]);

  const filteredSequences = useMemo(() => {
    const q = sequenceSearch.trim().toLowerCase();
    const rows = sequenceRows.filter((row) => {
      const matchesSearch = !q || [row.name, row.type, row.status, row.audience, row.description, row.goal].some((value) => String(value ?? '').toLowerCase().includes(q));
      const matchesStatus = sequenceFilters.status === 'All' || row.status === sequenceFilters.status;
      const matchesTab = sequenceTab === 'All' || row.status === sequenceTab;
      const matchesType = sequenceFilters.type === 'All Types' || row.type === sequenceFilters.type;
      return matchesSearch && matchesStatus && matchesTab && matchesType;
    });
    return [...rows].sort((a, b) => {
      if (sequenceFilters.sort === 'Most Enrolled') return b.enrolled - a.enrolled;
      if (sequenceFilters.sort === 'Most Steps') return b.steps.length - a.steps.length;
      if (sequenceFilters.sort === 'Name') return a.name.localeCompare(b.name);
      return new Date(b.updatedOn || 0) - new Date(a.updatedOn || 0);
    });
  }, [sequenceRows, sequenceSearch, sequenceFilters, sequenceTab]);

  const sequenceStats = useMemo(() => ({
    total: sequenceRows.length,
    active: sequenceRows.filter((row) => row.status === 'Active').length,
    draft: sequenceRows.filter((row) => row.status === 'Draft').length,
    enrolled: sequenceRows.reduce((sum, row) => sum + Number(row.enrolled || 0), 0),
  }), [sequenceRows]);

  const filteredSuppressions = useMemo(() => {
    const q = suppressionSearch.trim().toLowerCase();
    return suppressionRows.filter((row) => {
      const matchesSearch = !q || [row.name, row.email, row.phone, row.customerId, row.company, row.reason, row.suppressionType].some((value) => String(value ?? '').toLowerCase().includes(q));
      const matchesType = suppressionFilters.type === 'All' || row.suppressionType === suppressionFilters.type;
      const matchesTab = suppressionTab === 'All' || row.suppressionType === suppressionTab;
      const matchesSource = suppressionFilters.source === 'All Sources' || row.source === suppressionFilters.source;
      const matchesDate = suppressionFilters.date === 'All Dates' || suppressionFilters.date === 'Custom Range' || isWithinSimpleDate(row.addedDate, suppressionFilters.date);
      return matchesSearch && matchesType && matchesTab && matchesSource && matchesDate;
    });
  }, [suppressionRows, suppressionSearch, suppressionFilters, suppressionTab]);

  const suppressionStats = useMemo(() => ({
    total: suppressionRows.filter((row) => row.status === 'Suppressed').length,
    unsubscribed: suppressionRows.filter((row) => row.suppressionType === 'Unsubscribed').length,
    hardBounce: suppressionRows.filter((row) => row.suppressionType === 'Hard Bounce').length,
    spam: suppressionRows.filter((row) => row.suppressionType === 'Spam Complaint').length,
    manual: suppressionRows.filter((row) => row.suppressionType === 'Manual').length,
    blocked: suppressionRows.filter((row) => row.suppressionType === 'Domain Blocked').length,
    recentlyAdded: suppressionRows.filter((row) => isWithinSimpleDate(row.addedDate, 'Last 7 Days')).length,
    removed: suppressionRows.filter((row) => row.status === 'Removed').length,
  }), [suppressionRows]);

  function updateForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function updateListForm(k, v) { setListForm((f) => ({ ...f, [k]: v })); }
  function updateTemplateDraft(k, v) { setTemplateDraft((draft) => ({ ...draft, [k]: v })); }
  function updateContactForm(k, v) { setContactForm((draft) => ({ ...draft, [k]: v })); }
  function updateSegmentForm(k, v) { setSegmentForm((draft) => ({ ...draft, [k]: v })); }
  function updateAutomationForm(k, v) { setAutomationForm((draft) => ({ ...draft, [k]: v })); }
  function updateSequenceForm(k, v) { setSequenceForm((draft) => ({ ...draft, [k]: v })); }
  function updateSuppressionForm(k, v) { setSuppressionForm((draft) => ({ ...draft, [k]: v })); }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setWizardStep(0);
    setShowForm(false);
  }

  function openNewCampaign() {
    setForm(EMPTY);
    setEditingId(null);
    setWizardStep(0);
    setShowForm(true);
  }

  function openTemplateCampaign() {
    setForm({ ...EMPTY, subject: 'Your update from GoBook', body: 'Hi {{customer_name}},\n\n' });
    setEditingId(null);
    setWizardStep(0);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const submitMode = e.nativeEvent?.submitter?.dataset?.submitMode;
    const scheduledAt = submitMode === 'draft' ? null : (form.sendMode === 'Schedule' ? form.scheduledAt || null : null);
    const payload = { ...form, scheduledAt };
    let saved;
    if (editingId) {
      saved = await apiClient(`/more-modules/email-campaigns/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setCampaigns((current) => current.map((row) => (row._id === editingId ? saved : row)));
      setNotice('Campaign updated.');
    } else {
      saved = await apiClient('/more-modules/email-campaigns', { method: 'POST', body: JSON.stringify(payload) });
      setCampaigns((current) => [saved, ...current.filter((row) => row._id !== saved._id)]);
      setNotice('Campaign created.');
    }
    setActiveTab('Campaigns');
    await load();
    resetForm();
  }

  function handleEdit(c) {
    setForm({
      name: c.name,
      campaignType: campaignType(c),
      description: c.description ?? '',
      tags: c.tags ?? '',
      audienceType: c.audienceType ?? 'Customers',
      audienceName: audienceName(c),
      fromName: c.fromName ?? 'GoBook Store',
      fromEmail: c.fromEmail ?? 'marketing@store.com',
      subject: c.subject ?? '',
      previewText: c.previewText ?? '',
      body: c.body ?? '',
      recipientsText: (c.recipients ?? []).map((r) => r.email).join('\n'),
      sendMode: c.scheduledAt ? 'Schedule' : 'Send Now',
      scheduledAt: toDatetimeLocal(c.scheduledAt),
      openTracking: c.openTracking ?? true,
      clickTracking: c.clickTracking ?? true,
      utmTracking: c.utmTracking ?? true,
    });
    setEditingId(c._id);
    setWizardStep(0);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this campaign?')) return;
    await apiClient(`/more-modules/email-campaigns/${id}`, { method: 'DELETE' });
    setNotice('Campaign deleted.');
    await load();
  }

  async function handleSendNow(c) {
    if (!window.confirm(`Send "${c.name}" to ${(c.recipients ?? []).length} recipient(s) now?`)) return;
    setSendingId(c._id);
    try {
      const res = await apiClient(`/more-modules/email-campaigns/${c._id}/send`, { method: 'POST' });
      setNotice(res.message || 'Campaign sent.');
    } catch (err) {
      setNotice(err.message || 'Failed to send campaign.');
    } finally {
      setSendingId(null);
      await load();
    }
  }

  function handleCampaignAction(action, campaign) {
    setActionMenuId(null);
    if (action === 'Edit' || action === 'Reschedule') {
      handleEdit(campaign);
      return;
    }
    if (action === 'Delete' || action === 'Cancel') {
      handleDelete(campaign._id);
      return;
    }
    if (action === 'Duplicate') {
      setForm({
        ...EMPTY,
        name: `${campaign.name} Copy`,
        campaignType: campaignType(campaign),
        audienceName: audienceName(campaign),
        subject: campaign.subject ?? '',
        body: campaign.body ?? '',
        recipientsText: (campaign.recipients ?? []).map((r) => r.email).join('\n'),
      });
      setEditingId(null);
      setWizardStep(0);
      setShowForm(true);
      return;
    }
    if (action === 'Send Test') {
      setNotice('Test send workflow will use the campaign content and your verified sender settings.');
      return;
    }
    setNotice(`${action} is ready for the next campaign tracking integration.`);
  }

  function toggleCampaignSelection(id) {
    setSelectedCampaignIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllCampaigns(checked) {
    setSelectedCampaignIds(checked ? filtered.map((row) => row._id) : []);
  }

  function bulkAction(label) {
    if (label === 'Delete' && !window.confirm(`Delete ${selectedCampaignIds.length} selected campaign(s)?`)) return;
    setNotice(`${label} queued for ${selectedCampaignIds.length} selected campaign(s).`);
    setSelectedCampaignIds([]);
  }

  function createList(e) {
    e.preventDefault();
    const contacts = Number(listForm.contacts) || 0;
    setEmailLists((current) => [{ id: crypto.randomUUID(), name: listForm.name, contacts, createdAt: new Date().toISOString(), status: 'Active' }, ...current]);
    setListForm(EMPTY_LIST);
    setShowListForm(false);
    setActiveTab('Contacts');
    setNotice('Email list created locally.');
  }

  function createAutomation() {
    setAutomations((current) => [{ id: crypto.randomUUID(), name: `Automation ${current.length + 1}`, trigger: 'Manual trigger', enabled: true, lastRun: '-' }, ...current]);
    setActiveTab('Automations');
    setNotice('Automation workflow created locally.');
  }

  function openTemplateBuilder(template = null, duplicate = false) {
    setEditingTemplate(duplicate || template?.system ? null : template);
    setTemplateDraft({
      name: template ? `${template.name}${duplicate ? ' Copy' : ''}` : '',
      category: template?.category || 'Promotional',
      description: template?.description || '',
      tags: (template?.tags || []).join(', '),
      subject: template?.subject || '',
      previewText: template?.previewText || '',
      aiPrompt: '',
      previewMode: 'Desktop',
      columns: '3',
      primaryColor: '#2563eb',
      secondaryColor: '#0f172a',
      font: 'Inter',
      buttonStyle: 'Rounded',
      testEmail: '',
    });
    setShowTemplateBuilder(true);
  }

  function saveTemplate(e) {
    e.preventDefault();
    const next = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: templateDraft.name || 'Untitled Template',
      category: templateDraft.category,
      type: ['Invoice', 'Payment Reminder', 'Payment Received', 'Order Confirmation', 'Purchase Order', 'Quotation', 'Delivery', 'Credit Note', 'Debit Note', 'Transactional'].includes(templateDraft.category) ? 'Transactional' : 'Marketing',
      status: 'Active',
      createdBy: 'My Templates',
      description: templateDraft.description,
      tags: templateDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      used: editingTemplate?.used || 0,
      lastUsed: editingTemplate?.lastUsed || '',
      system: false,
      version: Number(editingTemplate?.version || 0) + 1,
      subject: templateDraft.subject,
      previewText: templateDraft.previewText,
    };
    setTemplates((current) => editingTemplate ? current.map((item) => item.id === editingTemplate.id ? next : item) : [next, ...current]);
    setShowTemplateBuilder(false);
    setNotice(editingTemplate ? 'Template updated.' : 'Template created.');
  }

  function useTemplateInCampaign(template) {
    setForm({ ...EMPTY, name: `${template.name} Campaign`, campaignType: template.category, subject: template.subject || template.name, previewText: template.previewText || template.description, body: `Hi {{customer.first_name}},\n\n${template.description || 'Add your message here.'}` });
    setActiveTab('Campaigns');
    setWizardStep(0);
    setShowForm(true);
  }

  function handleTemplateAction(action, template) {
    if (action === 'View' || action === 'Preview' || action === 'Edit') {
      openTemplateBuilder(template);
      return;
    }
    if (action === 'Duplicate') {
      openTemplateBuilder(template, true);
      return;
    }
    if (action === 'Use in Campaign') {
      useTemplateInCampaign(template);
      return;
    }
    if (action === 'Archive') {
      setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, status: 'Archived' } : item));
      setNotice('Template archived.');
      return;
    }
    if (action === 'Delete') {
      if (!window.confirm(`Delete "${template.name}"?`)) return;
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setNotice('Template deleted.');
      return;
    }
    if (action === 'Send Test') {
      setNotice('Template test email is ready for SMTP integration.');
      return;
    }
    setNotice(`${action} is ready for template management integration.`);
  }

  function templateActions(template) {
    return template.system ? ['View', 'Use in Campaign', 'Duplicate'] : ['Edit', 'Duplicate', 'Preview', 'Use in Campaign', 'Send Test', 'Rename', 'Archive', 'Delete'];
  }

  function generateTemplateContent() {
    setTemplateDraft((draft) => ({
      ...draft,
      subject: draft.subject || 'Exclusive offer for valued customers',
      previewText: draft.previewText || 'A polished campaign generated from your GoBook prompt.',
      description: draft.description || draft.aiPrompt || 'Professional campaign email with a clear offer and call to action.',
    }));
    setNotice('AI draft generated.');
  }

  function openAddContact(contact = null) {
    setContactForm(contact ? { ...contact, tags: (contact.tags || []).join(', ') } : EMPTY_CONTACT);
    setShowContactForm(true);
  }

  function saveContact(e) {
    e.preventDefault();
    const next = {
      ...contactForm,
      id: contactForm.id || `contact-${Date.now()}`,
      tags: String(contactForm.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      engagement: contactForm.engagement || 'No activity yet',
      addedOn: contactForm.addedOn || new Date().toISOString(),
      customerId: contactForm.customerId || 'MANUAL',
      totalPurchase: Number(contactForm.totalPurchase || 0),
      orders: Number(contactForm.orders || 0),
      lastPurchase: contactForm.lastPurchase || '',
    };
    setContacts((current) => contactForm.id ? current.map((item) => item.id === contactForm.id ? next : item) : [next, ...current]);
    setShowContactForm(false);
    setNotice(contactForm.id ? 'Contact updated.' : 'Contact added.');
  }

  function toggleContactSelection(id) {
    setSelectedContactIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllContacts(checked) {
    setSelectedContactIds(checked ? filteredContacts.map((contact) => contact.id) : []);
  }

  function bulkContactAction(label) {
    setNotice(`${label} applied to ${selectedContactIds.length} selected contact(s).`);
    setSelectedContactIds([]);
  }

  function statusBadgeClass(status) {
    if (status === 'Subscribed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'Pending') return 'bg-amber-50 text-amber-700';
    if (['Bounced', 'Suppressed'].includes(status)) return 'bg-red-50 text-red-700';
    if (status === 'Unsubscribed') return 'bg-slate-100 text-slate-600';
    return 'bg-zinc-100 text-zinc-700';
  }

  function openSegmentBuilder(segment = null, duplicate = false) {
    setEditingSegment(duplicate ? null : segment);
    setSegmentForm(segment ? {
      name: `${segment.name}${duplicate ? ' Copy' : ''}`,
      description: segment.description,
      type: segment.type,
      category: segment.category,
      tags: 'VIP, Retail',
      source: segment.source,
      matchMode: 'AND',
      rules: (segment.rules || []).map((rule) => {
        const parts = rule.split(' ');
        return { field: parts.slice(0, -2).join(' ') || 'Contact Type', operator: parts.at(-2) || 'is', value: parts.at(-1) || 'Customer' };
      }),
    } : EMPTY_SEGMENT);
    setShowSegmentBuilder(true);
  }

  function saveSegment(e) {
    e.preventDefault();
    const next = {
      id: editingSegment?.id || `segment-${Date.now()}`,
      name: segmentForm.name || 'Untitled Segment',
      icon: segmentForm.type === 'Dynamic' ? 'D' : 'S',
      type: segmentForm.type,
      status: 'Active',
      category: segmentForm.category,
      source: segmentForm.source,
      description: segmentForm.description,
      contacts: editingSegment?.contacts || 1240,
      validEmails: editingSegment?.validEmails || 1180,
      excluded: editingSegment?.excluded || 60,
      updatedOn: new Date().toISOString(),
      usedIn: editingSegment?.usedIn || 0,
      createdOn: editingSegment?.createdOn || new Date().toISOString(),
      lastRefreshed: new Date().toISOString(),
      rules: segmentForm.rules.map((rule) => `${rule.field} ${rule.operator} ${rule.value}`),
      openRate: editingSegment?.openRate || '0%',
      clickRate: editingSegment?.clickRate || '0%',
      revenue: editingSegment?.revenue || 0,
    };
    setSegments((current) => editingSegment ? current.map((item) => item.id === editingSegment.id ? next : item) : [next, ...current]);
    setShowSegmentBuilder(false);
    setNotice(editingSegment ? 'Segment updated.' : 'Segment created.');
  }

  function updateSegmentRule(index, key, value) {
    setSegmentForm((draft) => ({ ...draft, rules: draft.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [key]: value } : rule) }));
  }

  function addSegmentRule() {
    setSegmentForm((draft) => ({ ...draft, rules: [...draft.rules, { field: 'Total Purchase Value', operator: 'greater than', value: '50000' }] }));
  }

  function removeSegmentRule(index) {
    setSegmentForm((draft) => ({ ...draft, rules: draft.rules.filter((_, ruleIndex) => ruleIndex !== index) }));
  }

  function handleSegmentAction(action, segment) {
    if (action === 'View Segment') { setSelectedSegment(segment); return; }
    if (action === 'Edit Rules') { openSegmentBuilder(segment); return; }
    if (action === 'Duplicate') { openSegmentBuilder(segment, true); return; }
    if (action === 'Use in Campaign') {
      setForm({ ...EMPTY, name: `${segment.name} Campaign`, audienceType: 'Segment', audienceName: segment.name, recipientsText: contacts.slice(0, 3).map((contact) => contact.email).join('\n') });
      setActiveTab('Campaigns');
      setShowForm(true);
      return;
    }
    if (action === 'View Matching Contacts') { setPreviewSegment(segment); return; }
    if (action === 'Archive') {
      setSegments((current) => current.map((item) => item.id === segment.id ? { ...item, status: 'Archived' } : item));
      setNotice('Segment archived.');
      return;
    }
    if (action === 'Delete') {
      if (!window.confirm(`Delete "${segment.name}"?`)) return;
      setSegments((current) => current.filter((item) => item.id !== segment.id));
      setNotice('Segment deleted.');
      return;
    }
    setNotice(`${action} completed for ${segment.name}.`);
  }

  function segmentActions(segment) {
    return segment.type === 'Dynamic'
      ? ['View Segment', 'Edit Rules', 'Duplicate', 'Use in Campaign', 'Refresh', 'View Matching Contacts', 'Export Contacts', 'Archive', 'Delete']
      : ['View Segment', 'Add Contacts', 'Remove Contacts', 'Import Contacts', 'Duplicate', 'Use in Campaign', 'Export Contacts', 'Archive', 'Delete'];
  }

  function automationStatusClass(status) {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700';
    if (status === 'Draft') return 'bg-amber-50 text-amber-700';
    if (status === 'Paused') return 'bg-blue-50 text-blue-700';
    if (status === 'Error') return 'bg-red-50 text-red-700';
    return 'bg-slate-100 text-slate-600';
  }

  function openAutomationBuilder(row = null, duplicate = false) {
    setEditingAutomation(duplicate ? null : row);
    setAutomationForm(row ? {
      name: `${row.name}${duplicate ? ' Copy' : ''}`,
      description: row.description,
      category: row.category,
      tags: '',
      trigger: row.trigger,
      status: duplicate ? 'Draft' : row.status,
      enrollment: 'Once per contact',
      senderEmail: 'marketing@store.com',
      replyTo: 'support@store.com',
      sendingHours: '9 AM - 6 PM',
      timezone: 'IST',
      nodes: row.nodes || EMPTY_AUTOMATION.nodes,
    } : EMPTY_AUTOMATION);
    setShowAutomationBuilder(true);
  }

  function saveAutomation(e, publish = false) {
    e.preventDefault();
    const next = {
      id: editingAutomation?.id || `automation-${Date.now()}`,
      icon: automationForm.name?.[0] || 'A',
      name: automationForm.name || 'Untitled Automation',
      trigger: automationForm.trigger,
      status: publish ? 'Active' : automationForm.status,
      enrolled: editingAutomation?.enrolled || 0,
      executions: editingAutomation?.executions || 0,
      lastRun: editingAutomation?.lastRun || '',
      category: automationForm.category,
      description: automationForm.description,
      completed: editingAutomation?.completed || 0,
      inProgress: editingAutomation?.inProgress || 0,
      exited: editingAutomation?.exited || 0,
      openRate: editingAutomation?.openRate || '0%',
      clickRate: editingAutomation?.clickRate || '0%',
      revenue: editingAutomation?.revenue || 0,
      nodes: automationForm.nodes,
    };
    setAutomationRows((current) => editingAutomation ? current.map((item) => item.id === editingAutomation.id ? next : item) : [next, ...current]);
    setShowAutomationBuilder(false);
    setNotice(publish ? 'Automation published.' : 'Automation saved as draft.');
  }

  function addAutomationNode(node = 'Send Email') {
    setAutomationForm((draft) => ({ ...draft, nodes: [...draft.nodes, node.toUpperCase() + ': Configure step'] }));
  }

  function removeAutomationNode(index) {
    setAutomationForm((draft) => ({ ...draft, nodes: draft.nodes.filter((_, nodeIndex) => nodeIndex !== index) }));
  }

  function handleAutomationAction(action, row) {
    if (action === 'View Workflow' || action === 'View Logs') { setSelectedAutomation(row); return; }
    if (action === 'Edit') { openAutomationBuilder(row); return; }
    if (action === 'Duplicate') { openAutomationBuilder(row, true); return; }
    if (action === 'Pause') { setAutomationRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Paused' } : item)); return; }
    if (action === 'Resume') { setAutomationRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Active' } : item)); return; }
    if (action === 'Archive') { setAutomationRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Archived' } : item)); return; }
    if (action === 'Delete') {
      if (!window.confirm(`Delete "${row.name}"?`)) return;
      setAutomationRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    setNotice(`${action} queued for ${row.name}.`);
  }

  function automationActions(row) {
    return row.status === 'Active'
      ? ['View Workflow', 'Edit', 'Duplicate', 'Pause', 'View Logs', 'Archive', 'Delete']
      : row.status === 'Paused'
        ? ['View Workflow', 'Edit', 'Duplicate', 'Resume', 'View Logs', 'Archive', 'Delete']
        : ['Edit', 'Duplicate', 'View Workflow', 'View Logs', 'Archive', 'Delete'];
  }

  function sequenceStatusClass(status) {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700';
    if (status === 'Draft') return 'bg-amber-50 text-amber-700';
    if (status === 'Paused') return 'bg-blue-50 text-blue-700';
    if (status === 'Error') return 'bg-red-50 text-red-700';
    if (status === 'Archived') return 'bg-slate-100 text-slate-600';
    return 'bg-slate-100 text-slate-600';
  }

  function openSequenceBuilder(row = null, duplicate = false) {
    setEditingSequence(duplicate ? null : row);
    setSequenceStep(0);
    setSequenceForm(row ? {
      ...EMPTY_SEQUENCE,
      name: `${row.name}${duplicate ? ' Copy' : ''}`,
      description: row.description,
      type: row.type,
      audience: row.audience,
      goal: row.goal,
      status: duplicate ? 'Draft' : row.status,
      steps: row.steps?.length ? row.steps : EMPTY_SEQUENCE.steps,
    } : EMPTY_SEQUENCE);
    setShowSequenceBuilder(true);
  }

  function saveSequence(e, activate = false) {
    e.preventDefault();
    const next = {
      id: editingSequence?.id || `sequence-${Date.now()}`,
      icon: sequenceForm.name?.[0] || 'S',
      name: sequenceForm.name || 'Untitled Sequence',
      type: sequenceForm.type,
      status: activate ? 'Active' : (sequenceForm.status || 'Draft'),
      enrolled: editingSequence?.enrolled || 0,
      completed: editingSequence?.completed || 0,
      inProgress: editingSequence?.inProgress || 0,
      exited: editingSequence?.exited || 0,
      updatedOn: new Date().toISOString(),
      audience: sequenceForm.audience,
      description: sequenceForm.description,
      goal: sequenceForm.goal,
      revenue: editingSequence?.revenue || 0,
      openRate: editingSequence?.openRate || '0%',
      clickRate: editingSequence?.clickRate || '0%',
      steps: sequenceForm.steps,
    };
    setSequenceRows((current) => editingSequence ? current.map((item) => item.id === editingSequence.id ? next : item) : [next, ...current]);
    setShowSequenceBuilder(false);
    setNotice(activate ? 'Sequence activated.' : 'Sequence saved as draft.');
  }

  function addSequenceStep(type = 'Email') {
    const nextStep = type === 'Delay'
      ? { type: 'Delay', name: 'Wait 3 Days', timing: '3 days', template: '', subject: '' }
      : type === 'Condition'
        ? { type: 'Condition', name: 'Check Goal', timing: 'After previous step', template: '', subject: '' }
        : { type: 'Email', name: 'New Email Step', timing: 'After previous step', template: 'Welcome Email', subject: 'Your update from {{company.name}}' };
    setSequenceForm((draft) => ({ ...draft, steps: [...draft.steps, nextStep] }));
  }

  function removeSequenceStep(index) {
    setSequenceForm((draft) => ({ ...draft, steps: draft.steps.filter((_, stepIndex) => stepIndex !== index) }));
  }

  function updateSequenceStep(index, key, value) {
    setSequenceForm((draft) => ({ ...draft, steps: draft.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step) }));
  }

  function handleSequenceAction(action, row) {
    if (action === 'View Sequence' || action === 'View Reports' || action === 'View Enrollments') { setSelectedSequence(row); return; }
    if (action === 'Edit') { openSequenceBuilder(row); return; }
    if (action === 'Duplicate') { openSequenceBuilder(row, true); return; }
    if (action === 'Pause') { setSequenceRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Paused' } : item)); return; }
    if (action === 'Resume') { setSequenceRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Active' } : item)); return; }
    if (action === 'Archive') { setSequenceRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Archived' } : item)); return; }
    if (action === 'Delete') {
      if (!window.confirm(`Delete "${row.name}"?`)) return;
      setSequenceRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    setNotice(`${action} queued for ${row.name}.`);
  }

  function sequenceActions(row) {
    if (row.status === 'Active') return ['View Sequence', 'Edit', 'Duplicate', 'Pause', 'View Enrollments', 'View Reports', 'Archive', 'Delete'];
    if (row.status === 'Paused') return ['View Sequence', 'Edit', 'Duplicate', 'Resume', 'View Enrollments', 'View Reports', 'Archive', 'Delete'];
    return ['Edit', 'Duplicate', 'View Sequence', 'View Enrollments', 'View Reports', 'Archive', 'Delete'];
  }

  function suppressionBadgeClass(type) {
    if (type === 'Unsubscribed') return 'bg-blue-50 text-blue-700';
    if (type === 'Hard Bounce') return 'bg-red-50 text-red-700';
    if (type === 'Soft Bounce') return 'bg-amber-50 text-amber-700';
    if (type === 'Spam Complaint') return 'bg-purple-50 text-purple-700';
    if (type === 'Manual') return 'bg-slate-100 text-slate-700';
    return 'bg-orange-50 text-orange-700';
  }

  function toggleSuppressionSelection(id) {
    setSelectedSuppressionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllSuppressions(checked) {
    setSelectedSuppressionIds(checked ? filteredSuppressions.map((row) => row.id) : []);
  }

  function openSuppressionForm(row = null) {
    setSuppressionForm(row ? { ...EMPTY_SUPPRESSION, ...row } : EMPTY_SUPPRESSION);
    setSelectedSuppression(null);
    setShowSuppressionForm(true);
  }

  function saveSuppression(e) {
    e.preventDefault();
    const next = {
      id: suppressionForm.id || `suppression-${Date.now()}`,
      name: suppressionForm.name || suppressionForm.email,
      email: suppressionForm.email,
      phone: suppressionForm.phone || '',
      type: suppressionForm.type,
      suppressionType: suppressionForm.suppressionType,
      reason: suppressionForm.reason || 'Manual suppression',
      source: suppressionForm.source,
      addedDate: suppressionForm.addedDate || new Date().toISOString(),
      lastEmail: suppressionForm.lastEmail || '-',
      status: 'Suppressed',
      addedBy: suppressionForm.addedBy || 'Admin',
      notes: suppressionForm.notes,
      category: suppressionForm.applyTo || suppressionForm.category,
      expiryDate: suppressionForm.expiryDate,
      customerId: suppressionForm.customerId || '-',
      company: suppressionForm.company || '-',
    };
    setSuppressionRows((current) => suppressionForm.id ? current.map((item) => item.id === suppressionForm.id ? next : item) : [next, ...current]);
    setShowSuppressionForm(false);
    setNotice('Suppression saved.');
  }

  function removeSuppression(row) {
    if (['Unsubscribed', 'Spam Complaint'].includes(row.suppressionType)) {
      setNotice('Removal requires valid resubscription consent for unsubscribed or spam complaint contacts.');
      return;
    }
    if (!window.confirm('This contact may receive marketing emails again after removal. Continue?')) return;
    setSuppressionRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'Removed', removedDate: new Date().toISOString(), removedBy: 'Admin' } : item));
    setNotice('Suppression removed and audit log updated.');
  }

  function handleSuppressionAction(action, row) {
    if (action === 'View') { setSelectedSuppression(row); return; }
    if (action === 'Edit') { openSuppressionForm(row); return; }
    if (action === 'Remove Suppression') { removeSuppression(row); return; }
    setNotice(`${action} queued for ${row.email}.`);
  }

  function bulkSuppressionAction(action) {
    if (selectedSuppressionIds.length === 0) return;
    if (action === 'Remove Suppression') {
      const risky = suppressionRows.some((row) => selectedSuppressionIds.includes(row.id) && ['Unsubscribed', 'Spam Complaint'].includes(row.suppressionType));
      if (risky) {
        setNotice('Bulk removal blocked: unsubscribed and spam complaint records require consent validation.');
        return;
      }
    }
    setNotice(`${action} queued for ${selectedSuppressionIds.length} suppression record${selectedSuppressionIds.length === 1 ? '' : 's'}.`);
    setSelectedSuppressionIds([]);
  }

  function renderEmptyCampaignState() {
    return (
      <tr>
        <td colSpan={11} className="py-12">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Mail size={24} /></div>
            <h3 className="m-0 mt-4 text-[17px] font-black text-[#071936]">Create your first campaign</h3>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#536173]">Reach your customers with targeted email campaigns, promotions, newsletters and product updates.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={openNewCampaign} className="inline-flex h-10 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} /> Create Campaign</button>
              <button type="button" onClick={openTemplateCampaign} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><FileText size={15} /> Start with a template</button>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-[12px] font-bold text-[#0f2f5f]">
              <span className="rounded-full bg-[#f7faff] px-3 py-1">Promotional</span>
              <span className="rounded-full bg-[#f7faff] px-3 py-1">Newsletter</span>
              <span className="rounded-full bg-[#f7faff] px-3 py-1">Product Launch</span>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  function renderCampaignRows(limit, compact = false) {
    const rows = limit ? filtered.slice(0, limit) : filtered;
    if (rows.length === 0) {
      return compact ? <tr><td colSpan={7} className="py-8 text-center text-[13px] text-[#536173]">No campaigns match your filters.</td></tr> : renderEmptyCampaignState();
    }
    return rows.map((row) => (
      <tr key={row._id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
        {!compact && <td className="w-8 py-3 pr-3"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={selectedCampaignIds.includes(row._id)} onChange={() => toggleCampaignSelection(row._id)} /></td>}
        <td className="min-w-[220px] py-3 pr-4">
          <button type="button" onClick={() => handleCampaignAction(row.status === 'Sent' ? 'View Report' : 'Edit', row)} className="block border-0 bg-transparent p-0 text-left text-[13px] font-black text-blue-800 hover:text-blue-600">{row.name}</button>
          <span className="mt-1 block text-[11px] text-[#536173]">{campaignType(row)} - {row.description || 'Festival Campaign'}</span>
          {!compact && <span className="mt-1 block text-[11px] text-[#7b8da8]">Created {fmtDate(row.createdAt)}</span>}
        </td>
        {!compact && <td className="pr-4 text-[12px] font-bold text-[#0f2f5f]">{campaignType(row)}</td>}
        <td className="pr-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.Draft}`}><span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[row.status] ?? STATUS_DOTS.Draft}`} />{row.status}</span></td>
        {!compact && <td className="min-w-[150px] pr-4 text-[12px] text-[#0f2f5f]"><strong>{audienceName(row)}</strong><span className="mt-1 block text-[11px] text-[#536173]">{number(campaignRecipients(row))} recipients</span></td>}
        <td className="pr-4 text-[#0f2f5f]">{number(campaignRecipients(row))}</td>
        <td className="min-w-[116px] pr-4 text-[#536173]">{fmtDateTime(campaignDate(row))}</td>
        <td className="pr-4 text-[#0f2f5f]">{row.status === 'Draft' ? '-' : pct(row.opened, row.sent)}</td>
        <td className="pr-4 text-[#0f2f5f]">{row.status === 'Draft' ? '-' : pct(row.clicked, row.sent)}</td>
        {!compact && <td className="pr-4 text-[12px] text-[#0f2f5f]"><strong>{number(row.orders || 0)}</strong><span className="mt-1 block text-[11px] text-[#536173]">₹{number(row.revenue || 0)}</span></td>}
        <td className="relative text-right">
          {compact ? (
            <>
              <IconButton title="Send Now" disabled={sendingId === row._id} onClick={() => handleSendNow(row)}><Send size={14} /></IconButton>
              <IconButton title="Edit" onClick={() => handleEdit(row)}><Edit3 size={14} /></IconButton>
              <IconButton title="Delete" onClick={() => handleDelete(row._id)}><Trash2 size={14} className="text-red-500" /></IconButton>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setActionMenuId(actionMenuId === row._id ? null : row._id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#536173] hover:bg-blue-50 hover:text-blue-700"><MoreVertical size={15} /></button>
              {actionMenuId === row._id && (
                <div className="absolute right-0 top-9 z-20 w-44 rounded-md border border-[#dbe4ef] bg-white py-1 text-left shadow-xl">
                  {actionItemsForStatus(row.status).map((action) => (
                    <button key={action} type="button" onClick={() => handleCampaignAction(action, row)} className={`block w-full border-0 bg-white px-3 py-2 text-left text-[12px] font-bold hover:bg-blue-50 ${['Delete', 'Cancel', 'Archive'].includes(action) ? 'text-red-600' : 'text-[#0f2f5f]'}`}>{action}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </td>
      </tr>
    ));
  }

  function renderEmailListRows(emptyText = 'No email contacts created.') {
    if (emailLists.length === 0) {
      return <tr className="border-t border-[#edf2f7]"><td colSpan={4} className="py-8 text-center text-[#536173]">{emptyText}</td></tr>;
    }
    return emailLists.map((list) => (
      <tr key={list.id} className="border-t border-[#edf2f7]">
        <td className="py-3 font-bold text-blue-800">{list.name}</td>
        <td>{number(list.contacts)}</td>
        <td>{fmtDate(list.createdAt)}</td>
        <td><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{list.status}</span></td>
      </tr>
    ));
  }

  function renderAutomationRows() {
    if (automations.length === 0) {
      return <tr className="border-t border-[#edf2f7]"><td colSpan={4} className="py-8 text-center text-[#536173]">No automation workflows configured.</td></tr>;
    }
    return automations.map((workflow) => (
      <tr key={workflow.id} className="border-t border-[#edf2f7]">
        <td className="py-3 font-bold text-blue-800">{workflow.name}</td>
        <td>{workflow.trigger}</td>
        <td><button type="button" onClick={() => setAutomations((current) => current.map((item) => item.id === workflow.id ? { ...item, enabled: !item.enabled } : item))} className={`h-4 w-8 rounded-full border-0 ${workflow.enabled ? 'bg-emerald-600' : 'bg-slate-300'}`} /></td>
        <td>{workflow.lastRun}</td>
      </tr>
    ));
  }

  function renderSubsection() {
    if (activeTab === 'Templates') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Templates</h2>
              <p className="m-0 mt-1 text-[12px] text-[#536173]">Keep marketing and transactional templates organized by use case.</p>
            </div>
            <button type="button" onClick={() => openTemplateBuilder()} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Create Template</button>
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_150px_170px_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} />
              <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search templates..." value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} />
            </label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={templateFilters.category} onChange={(event) => setTemplateFilters((current) => ({ ...current, category: event.target.value }))}>
              {TEMPLATE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={templateFilters.type} onChange={(event) => setTemplateFilters((current) => ({ ...current, type: event.target.value }))}>
              {TEMPLATE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={templateFilters.status} onChange={(event) => setTemplateFilters((current) => ({ ...current, status: event.target.value }))}>
              {TEMPLATE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={templateFilters.createdBy} onChange={(event) => setTemplateFilters((current) => ({ ...current, createdBy: event.target.value }))}>
              {TEMPLATE_CREATORS.map((creator) => <option key={creator}>{creator}</option>)}
            </select>
            <div className="flex h-10 overflow-hidden rounded-md border border-[#dbe4ef] bg-white">
              <button type="button" onClick={() => setTemplateView('grid')} className={`px-3 text-[12px] font-bold ${templateView === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-[#536173]'}`}>Grid</button>
              <button type="button" onClick={() => setTemplateView('list')} className={`border-l border-[#dbe4ef] px-3 text-[12px] font-bold ${templateView === 'list' ? 'bg-blue-50 text-blue-700' : 'text-[#536173]'}`}>List</button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {['All', 'My Templates', 'GoBook Templates', 'Promotional', 'Newsletter', 'Offers & Discounts', 'CRM', 'Transactional'].map((chip) => (
              <button key={chip} type="button" onClick={() => chip === 'My Templates' || chip === 'GoBook Templates' ? setTemplateFilters((current) => ({ ...current, createdBy: chip })) : setTemplateFilters((current) => ({ ...current, category: chip === 'CRM' ? 'Lead Nurturing' : chip }))} className="rounded-full border border-[#dbe4ef] bg-white px-3 py-1 text-[12px] font-bold text-[#0f2f5f] hover:bg-blue-50 hover:text-blue-700">{chip}</button>
            ))}
          </div>

          {templateView === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="overflow-hidden rounded-lg border border-[#dbe4ef] bg-white">
                  <div className="grid min-h-36 place-items-center bg-[#f7faff] px-5 py-6 text-center">
                    <div>
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Mail size={19} /></div>
                      <strong className="text-[13px] text-[#071936]">Email Preview</strong>
                      <span className="mt-2 block text-[11px] text-[#536173]">{template.category}</span>
                    </div>
                  </div>
                  <div className="border-t border-[#edf2f7] p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="m-0 text-[14px] font-black text-[#071936]">{template.name}</h3>
                        <p className="m-0 mt-1 text-[12px] font-bold text-[#536173]">{template.category}</p>
                      </div>
                      {template.system && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">GoBook Template</span>}
                    </div>
                    <p className="m-0 line-clamp-2 text-[12px] leading-5 text-[#536173]">{template.description}</p>
                    <div className="mt-3 text-[12px] text-[#536173]">
                      <strong className="text-[#0f2f5f]">Used in {number(template.used)} campaigns</strong>
                      <span className="block">Last used {template.lastUsed ? fmtDate(template.lastUsed) : '-'}</span>
                      <span className="block">Version {template.version}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {templateActions(template).map((action) => (
                        <button key={action} type="button" onClick={() => handleTemplateAction(action, template)} className={`rounded-md border border-[#dbe4ef] bg-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-blue-50 ${['Delete', 'Archive'].includes(action) ? 'text-red-600' : 'text-blue-700'}`}>{action}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && <div className="col-span-full rounded-md border border-[#edf2f7] py-10 text-center text-[13px] text-[#536173]">No templates match your filters.</div>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Template</th><th>Category</th><th>Type</th><th>Status</th><th>Created By</th><th>Usage</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="border-t border-[#edf2f7]">
                      <td className="py-3 pr-3"><strong className="block text-blue-800">{template.name}</strong><span className="text-[#536173]">{template.description}</span></td>
                      <td>{template.category}</td>
                      <td>{template.type}</td>
                      <td><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{template.status}</span></td>
                      <td>{template.createdBy}</td>
                      <td>{number(template.used)} campaigns<br /><span className="text-[#536173]">{template.lastUsed ? fmtDate(template.lastUsed) : '-'}</span></td>
                      <td><button type="button" onClick={() => handleTemplateAction(template.system ? 'View' : 'Edit', template)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      );
    }

    if (activeTab === 'Contacts') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Contacts</h2>
              <p className="m-0 mt-1 text-[12px] text-[#536173]">Manage subscribers, customers, leads and email consent.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openAddContact()} className="inline-flex h-9 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} /> Add Contact</button>
              <button type="button" onClick={() => setShowImportContacts(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Import Contacts</button>
              <button type="button" onClick={() => setNotice('Filtered contacts export is ready for CSV/Excel integration.')} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Export</button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-5">
            {[
              ['Total Contacts', contactStats.total],
              ['Subscribed', contactStats.subscribed],
              ['Unsubscribed', contactStats.unsubscribed],
              ['Bounced', contactStats.bounced],
              ['Engaged Contacts', contactStats.engaged],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4">
                <span className="block text-[12px] font-bold text-[#536173]">{label}</span>
                <strong className="mt-2 block text-[23px] text-[#071936]">{number(value)}</strong>
              </div>
            ))}
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_190px_150px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} />
              <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search contacts..." value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} />
            </label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={contactFilters.type} onChange={(event) => setContactFilters((current) => ({ ...current, type: event.target.value }))}>{CONTACT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={contactFilters.status} onChange={(event) => setContactFilters((current) => ({ ...current, status: event.target.value }))}>{CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={contactFilters.source} onChange={(event) => setContactFilters((current) => ({ ...current, source: event.target.value }))}>{CONTACT_SOURCES.map((source) => <option key={source}>{source}</option>)}</select>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CONTACT_TABS.map((tab) => <button key={tab} type="button" onClick={() => setContactTab(tab)} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${contactTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2f5f] hover:bg-blue-50'}`}>{tab}</button>)}
            </div>
            <select className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={contactFilters.tag} onChange={(event) => setContactFilters((current) => ({ ...current, tag: event.target.value }))}>{CONTACT_TAGS.map((tag) => <option key={tag}>{tag}</option>)}</select>
          </div>

          {selectedContactIds.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px]">
              <strong className="text-blue-800">{selectedContactIds.length} contact{selectedContactIds.length === 1 ? '' : 's'} selected</strong>
              <div className="flex flex-wrap gap-2">
                {['Add Tags', 'Remove Tags', 'Change Status', 'Export', 'Archive', 'Add to Segment', 'Sync with CRM', 'Suppress Contacts'].map((label) => <button key={label} type="button" onClick={() => bulkContactAction(label)} className="rounded-md border border-blue-200 bg-white px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-50">{label}</button>)}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-[12px]">
              <thead><tr className="text-[#536173]"><th className="w-8 py-2"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length} onChange={(event) => toggleAllContacts(event.target.checked)} /></th><th>Contact</th><th>Email</th><th>Type</th><th>Source</th><th>Tags</th><th>Status</th><th>Engagement</th><th>Added On</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredContacts.length ? filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="py-3 pr-3"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContactSelection(contact.id)} /></td>
                    <td className="py-3 pr-3"><button type="button" onClick={() => setSelectedContact(contact)} className="block border-0 bg-transparent p-0 text-left font-black text-blue-800 hover:text-blue-600">{contact.firstName} {contact.lastName}</button><span className="text-[#536173]">{contact.company}</span></td>
                    <td className="pr-3 text-[#0f2f5f]">{contact.email}</td>
                    <td className="pr-3">{contact.type}</td>
                    <td className="pr-3">{contact.source}</td>
                    <td className="pr-3"><div className="flex flex-wrap gap-1">{contact.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">{tag}</span>)}</div></td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(contact.status)}`}>{contact.status}</span></td>
                    <td className="pr-3">{contact.engagement}</td>
                    <td className="pr-3">{fmtDate(contact.addedOn)}</td>
                    <td className="text-right"><button type="button" onClick={() => setSelectedContact(contact)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button><button type="button" onClick={() => openAddContact(contact)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Edit</button></td>
                  </tr>
                )) : <tr><td colSpan={10} className="py-10 text-center text-[13px] text-[#536173]">No contacts match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      );
    }

    if (activeTab === 'Segments') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="m-0 text-[16px] font-black text-[#071936]">Segments</h2><p className="m-0 mt-1 text-[12px] text-[#536173]">Create targeted audiences for your campaigns.</p></div>
            <button type="button" onClick={() => openSegmentBuilder()} className="inline-flex h-9 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} /> Create Segment</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {[
              ['Total Segments', segmentStats.total],
              ['Active Segments', segmentStats.active],
              ['Dynamic Segments', segmentStats.dynamic],
              ['Static Segments', segmentStats.static],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4"><span className="block text-[12px] font-bold text-[#536173]">{label}</span><strong className="mt-2 block text-[23px] text-[#071936]">{number(value)}</strong></div>)}
          </div>

          <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_190px_170px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} />
              <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search segments..." value={segmentSearch} onChange={(event) => setSegmentSearch(event.target.value)} />
            </label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={segmentFilters.type} onChange={(event) => setSegmentFilters((current) => ({ ...current, type: event.target.value }))}>{SEGMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={segmentFilters.source} onChange={(event) => setSegmentFilters((current) => ({ ...current, source: event.target.value }))}>{SEGMENT_SOURCES.map((source) => <option key={source}>{source}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={segmentFilters.sort} onChange={(event) => setSegmentFilters((current) => ({ ...current, sort: event.target.value }))}>{SEGMENT_SORTS.map((sort) => <option key={sort}>{sort}</option>)}</select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left text-[12px]">
              <thead><tr className="text-[#536173]"><th className="py-2">Segment Name</th><th>Type</th><th>Contacts</th><th>Updated On</th><th>Used In</th><th>Analytics</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredSegments.map((segment) => (
                  <tr key={segment.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="py-3 pr-3"><button type="button" onClick={() => setSelectedSegment(segment)} className="block border-0 bg-transparent p-0 text-left font-black text-blue-800 hover:text-blue-600">{segment.icon} {segment.name}</button><span className="text-[#536173]">{segment.description}</span></td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${segment.type === 'Dynamic' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{segment.type}</span></td>
                    <td className="pr-3 font-bold text-[#071936]">{number(segment.contacts)}</td>
                    <td className="pr-3">{fmtDate(segment.updatedOn)}</td>
                    <td className="pr-3">{number(segment.usedIn)} Campaigns</td>
                    <td className="pr-3"><span className="block">Open {segment.openRate}</span><span className="text-[#536173]">Revenue Rs {number(segment.revenue)}</span></td>
                    <td className="text-right">
                      <button type="button" onClick={() => setSelectedSegment(segment)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button>
                      <button type="button" onClick={() => openSegmentBuilder(segment)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Edit</button>
                      <button type="button" onClick={() => handleSegmentAction('Use in Campaign', segment)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Use</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Segment Templates</h3>
              <div className="flex flex-wrap gap-2">{SEGMENT_TEMPLATES.map((template) => <button key={template} type="button" onClick={() => { setSegmentForm({ ...EMPTY_SEGMENT, name: template, description: `${template} generated from a GoBook segment template.` }); setShowSegmentBuilder(true); }} className="rounded-full border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0f2f5f] hover:bg-blue-50 hover:text-blue-700">{template}</button>)}</div>
            </div>
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-2 text-[13px] font-black text-[#071936]">Live Audience Preview</h3>
              <strong className="block text-[24px] text-[#071936]">{number(0)} matching contacts</strong>
              <div className="mt-3 space-y-1 text-[12px] text-[#536173]"><div>Valid emails: 0</div><div>Suppressed: 0</div><div>Bounced: 0</div><div>Create contacts and rules to preview audience size.</div></div>
              <button type="button" disabled={!segments.length} onClick={() => segments[0] && setPreviewSegment(segments[0])} className="mt-4 rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">View Matching Contacts</button>
            </div>
          </div>
        </Card>
      );
    }

    if (activeTab === 'Automations') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="m-0 text-[16px] font-black text-[#071936]">Automations</h2><p className="m-0 mt-1 text-[12px] text-[#536173]">Automate customer communication and marketing workflows.</p></div>
            <button type="button" onClick={() => openAutomationBuilder()} className="inline-flex h-9 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} /> Create Automation</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {[
              ['Total Automations', automationStats.total],
              ['Active Workflows', automationStats.active],
              ['Draft Workflows', automationStats.draft],
              ['Executions This Month', automationStats.executions],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4"><span className="block text-[12px] font-bold text-[#536173]">{label}</span><strong className="mt-2 block text-[23px] text-[#071936]">{number(value)}</strong></div>)}
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_190px_170px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} /><input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search automations..." value={automationSearch} onChange={(event) => setAutomationSearch(event.target.value)} /></label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={automationFilters.status} onChange={(event) => setAutomationFilters((current) => ({ ...current, status: event.target.value }))}>{AUTOMATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={automationFilters.trigger} onChange={(event) => setAutomationFilters((current) => ({ ...current, trigger: event.target.value }))}>{AUTOMATION_TRIGGERS.map((trigger) => <option key={trigger}>{trigger}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={automationFilters.sort} onChange={(event) => setAutomationFilters((current) => ({ ...current, sort: event.target.value }))}>{AUTOMATION_SORTS.map((sort) => <option key={sort}>{sort}</option>)}</select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">{['All', 'Active', 'Draft', 'Paused'].map((tab) => <button key={tab} type="button" onClick={() => setAutomationTab(tab)} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${automationTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2f5f] hover:bg-blue-50'}`}>{tab}</button>)}</div>

          <div className="overflow-x-auto">
            <table className="min-w-[1060px] w-full border-collapse text-left text-[12px]">
              <thead><tr className="text-[#536173]"><th className="py-2">Automation Name</th><th>Trigger</th><th>Status</th><th>Enrolled</th><th>Last Run</th><th>Executions</th><th>Performance</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredAutomations.length === 0 ? (
                  <tr className="border-t border-[#edf2f7]"><td colSpan={8} className="py-8 text-center text-[#536173]">No automations yet. Create an automation after you have contacts, templates and optional segments.</td></tr>
                ) : filteredAutomations.map((row) => (
                  <tr key={row.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="py-3 pr-3"><button type="button" onClick={() => setSelectedAutomation(row)} className="block border-0 bg-transparent p-0 text-left font-black text-blue-800 hover:text-blue-600">{row.icon} {row.name}</button><span className="text-[#536173]">{row.description}</span></td>
                    <td className="pr-3">{row.trigger}</td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${automationStatusClass(row.status)}`}>{row.status}</span></td>
                    <td className="pr-3 font-bold text-[#071936]">{row.enrolled ? number(row.enrolled) : '-'}</td>
                    <td className="pr-3">{row.lastRun ? fmtDate(row.lastRun) : '-'}</td>
                    <td className="pr-3">{number(row.executions)}</td>
                    <td className="pr-3"><span className="block">Open {row.openRate}</span><span className="text-[#536173]">Revenue Rs {number(row.revenue)}</span></td>
                    <td className="text-right"><button type="button" onClick={() => setSelectedAutomation(row)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button><button type="button" onClick={() => openAutomationBuilder(row)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Automation Templates</h3><div className="flex flex-wrap gap-2">{AUTOMATION_TEMPLATES.map((template) => <button key={template} type="button" onClick={() => { setAutomationForm({ ...EMPTY_AUTOMATION, name: template, description: `${template} workflow from a GoBook automation template.` }); setShowAutomationBuilder(true); }} className="rounded-full border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0f2f5f] hover:bg-blue-50 hover:text-blue-700">{template}</button>)}</div></div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Workflow Health</h3><div className="grid grid-cols-2 gap-3 text-[12px]"><div><strong className="block text-[20px] text-[#071936]">{number(automationRows.reduce((sum, row) => sum + Number(row.completed || 0), 0))}</strong>Completed</div><div><strong className="block text-[20px] text-[#071936]">{number(automationRows.reduce((sum, row) => sum + Number(row.inProgress || 0), 0))}</strong>In Progress</div><div><strong className="block text-[20px] text-[#071936]">{number(automationRows.reduce((sum, row) => sum + Number(row.exited || 0), 0))}</strong>Exited</div><div><strong className="block text-[20px] text-[#071936]">0d</strong>Avg Time</div></div></div>
          </div>
        </Card>
      );
    }

    if (activeTab === 'Sequences') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Sequences</h2>
              <p className="m-0 mt-1 text-[12px] text-[#536173]">Create and manage automated email sequences.</p>
            </div>
            <button type="button" onClick={() => openSequenceBuilder()} className="inline-flex h-9 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><Plus size={15} /> Create Sequence</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {[
              ['Total Sequences', sequenceStats.total],
              ['Active Sequences', sequenceStats.active],
              ['Draft Sequences', sequenceStats.draft],
              ['Enrolled Contacts', sequenceStats.enrolled],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4"><span className="block text-[12px] font-bold text-[#536173]">{label}</span><strong className="mt-2 block text-[23px] text-[#071936]">{number(value)}</strong></div>)}
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_190px_170px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} /><input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search sequences..." value={sequenceSearch} onChange={(event) => setSequenceSearch(event.target.value)} /></label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={sequenceFilters.status} onChange={(event) => setSequenceFilters((current) => ({ ...current, status: event.target.value }))}>{SEQUENCE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={sequenceFilters.type} onChange={(event) => setSequenceFilters((current) => ({ ...current, type: event.target.value }))}>{SEQUENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={sequenceFilters.sort} onChange={(event) => setSequenceFilters((current) => ({ ...current, sort: event.target.value }))}>{SEQUENCE_SORTS.map((sort) => <option key={sort}>{sort}</option>)}</select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">{['All', 'Active', 'Draft', 'Paused', 'Archived'].map((tab) => <button key={tab} type="button" onClick={() => setSequenceTab(tab)} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${sequenceTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2f5f] hover:bg-blue-50'}`}>{tab}</button>)}</div>

          <div className="overflow-x-auto">
            <table className="min-w-[1060px] w-full border-collapse text-left text-[12px]">
              <thead><tr className="text-[#536173]"><th className="py-2">Sequence Name</th><th>Type</th><th>Steps</th><th>Status</th><th>Audience</th><th>Enrolled</th><th>Performance</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredSequences.length === 0 ? (
                  <tr className="border-t border-[#edf2f7]"><td colSpan={8} className="py-8 text-center text-[#536173]">No sequences match your filters.</td></tr>
                ) : filteredSequences.map((row) => (
                  <tr key={row.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="min-w-[240px] py-3 pr-3"><button type="button" onClick={() => setSelectedSequence(row)} className="block border-0 bg-transparent p-0 text-left font-black text-blue-800 hover:text-blue-600">{row.icon} {row.name}</button><span className="mt-1 block text-[#536173]">{row.description}</span><span className="mt-1 block text-[11px] text-[#7b8da8]">Updated {fmtDate(row.updatedOn)}</span></td>
                    <td className="pr-3 font-bold text-[#0f2f5f]">{row.type}</td>
                    <td className="pr-3"><strong className="text-[#071936]">{row.steps.length}</strong><span className="block text-[#536173]">{row.steps.filter((step) => step.type === 'Email').length} emails</span></td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sequenceStatusClass(row.status)}`}>{row.status}</span></td>
                    <td className="pr-3"><strong className="block text-[#0f2f5f]">{row.audience}</strong><span className="text-[#536173]">Goal: {row.goal}</span></td>
                    <td className="pr-3 font-bold text-[#071936]">{row.enrolled ? number(row.enrolled) : '-'}</td>
                    <td className="pr-3"><span className="block">Open {row.openRate}</span><span className="text-[#536173]">Click {row.clickRate}</span></td>
                    <td className="text-right"><button type="button" onClick={() => setSelectedSequence(row)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button><button type="button" onClick={() => openSequenceBuilder(row)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Sequence Templates</h3>
              <div className="flex flex-wrap gap-2">{SEQUENCE_TEMPLATES.map((template) => <button key={template} type="button" onClick={() => { setSequenceForm({ ...EMPTY_SEQUENCE, name: template, description: `${template} generated from a GoBook sequence template.` }); setSequenceStep(0); setEditingSequence(null); setShowSequenceBuilder(true); }} className="rounded-full border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0f2f5f] hover:bg-blue-50 hover:text-blue-700">{template}</button>)}</div>
            </div>
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Enrollment Health</h3>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><strong className="block text-[20px] text-[#071936]">{number(sequenceRows.reduce((sum, row) => sum + Number(row.completed || 0), 0))}</strong>Completed</div>
                <div><strong className="block text-[20px] text-[#071936]">{number(sequenceRows.reduce((sum, row) => sum + Number(row.inProgress || 0), 0))}</strong>In Progress</div>
                <div><strong className="block text-[20px] text-[#071936]">{number(sequenceRows.reduce((sum, row) => sum + Number(row.exited || 0), 0))}</strong>Exited</div>
                <div><strong className="block text-[20px] text-[#071936]">{pct(sequenceRows.reduce((sum, row) => sum + Number(row.completed || 0), 0), sequenceStats.enrolled)}</strong>Goal Rate</div>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    if (activeTab === 'Analytics') {
      const totalOrders = campaigns.reduce((sum, campaign) => sum + Number(campaign.orders || 0), 0);
      const totalRevenue = campaigns.reduce((sum, campaign) => sum + Number(campaign.revenue || 0), 0);
      const unsubscribedCount = suppressionRows.filter((row) => row.suppressionType === 'Unsubscribed').length;
      const spamCount = suppressionRows.filter((row) => row.suppressionType === 'Spam Complaint').length;
      const analyticsKpis = [
        ['Emails Sent', totals.sent, 'No previous period', 'bg-blue-50 text-blue-700'],
        ['Delivered', totals.delivered, 'No previous period', 'bg-emerald-50 text-emerald-700'],
        ['Open Rate', pct(totals.opened, totals.sent), 'No previous period', 'bg-violet-50 text-violet-700'],
        ['Click Rate', pct(totals.clicked, totals.sent), 'No previous period', 'bg-cyan-50 text-cyan-700'],
        ['Bounce Rate', pct(totals.failed, totals.sent), 'No previous period', 'bg-amber-50 text-amber-700'],
        ['Unsubscribe Rate', pct(unsubscribedCount, totals.sent), 'No previous period', 'bg-slate-100 text-slate-700'],
        ['Spam Complaint Rate', pct(spamCount, totals.sent), 'No previous period', 'bg-red-50 text-red-700'],
        ['Revenue', `Rs ${number(totalRevenue)}`, 'No previous period', 'bg-emerald-50 text-emerald-700'],
      ];
      const funnelRows = [
        ['Sent', totals.sent, totals.sent ? '100%' : '0%'],
        ['Delivered', totals.delivered, pct(totals.delivered, totals.sent)],
        ['Opened', totals.opened, pct(totals.opened, totals.sent)],
        ['Clicked', totals.clicked, pct(totals.clicked, totals.sent)],
        ['Converted', totalOrders, pct(totalOrders, totals.sent)],
      ];
      const campaignRows = topCampaigns;
      const revenueRows = campaigns.filter((campaign) => Number(campaign.orders || 0) || Number(campaign.revenue || 0));
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Email Marketing Analytics</h2>
              <p className="m-0 mt-1 text-[12px] text-[#536173]">Measure delivery, engagement, revenue, campaigns, sequences and automation performance.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={analyticsFilters.date} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, date: event.target.value }))}>{['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Month', 'Previous Month', 'Custom Range'].map((date) => <option key={date}>{date}</option>)}</select>
              <button type="button" onClick={() => setNotice('Analytics PDF export is ready for report generation integration.')} className="h-9 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-blue-700">Download PDF</button>
              <button type="button" onClick={() => setNotice('Analytics report export queued.')} className="h-9 rounded-md border-0 bg-blue-600 px-3 text-[12px] font-bold text-white">Export Report</button>
            </div>
          </div>

          <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(180px,1fr)_160px_160px_160px_auto_auto]">
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={analyticsFilters.campaign} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, campaign: event.target.value }))}>{['All Campaigns', ...campaigns.map((campaign) => campaign.name)].map((item) => <option key={item}>{item}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={analyticsFilters.segment} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, segment: event.target.value }))}>{['All Segments', ...segments.map((segment) => segment.name)].map((item) => <option key={item}>{item}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={analyticsFilters.device} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, device: event.target.value }))}>{['All Devices', 'Mobile', 'Desktop', 'Tablet'].map((item) => <option key={item}>{item}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]">{['All Types', ...CAMPAIGN_TYPES].map((item) => <option key={item}>{item}</option>)}</select>
            <button type="button" onClick={() => setNotice('Analytics filters applied.')} className="h-10 rounded-md border-0 bg-blue-600 px-4 text-[12px] font-bold text-white">Apply Filters</button>
            <button type="button" onClick={() => setAnalyticsFilters({ date: 'Last 30 Days', campaign: 'All Campaigns', segment: 'All Segments', device: 'All Devices' })} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[12px] font-bold text-[#536173]">Reset</button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analyticsKpis.map(([label, value, trend, color]) => <div key={label} className={`rounded-lg border border-[#dbe4ef] p-4 ${color}`}><span className="block text-[12px] font-bold opacity-80">{label}</span><strong className="mt-2 block text-[23px] text-[#071936]">{typeof value === 'number' ? number(value) : value}</strong><span className="mt-1 block text-[12px] font-bold text-[#536173]">{trend}</span><div className="mt-3 flex h-8 items-end gap-1">{[0, 0, 0, 0, 0, 0, 0].map((height, index) => <span key={index} className="flex-1 rounded-t bg-current opacity-20" style={{ height: `${Math.max(8, height)}%` }} />)}</div></div>)}
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="m-0 text-[13px] font-black text-[#071936]">Email Performance Trend</h3><span className="text-[11px] font-bold text-[#536173]">Sent / Delivered / Opened / Clicked / Failed</span></div>
              <MiniChart totals={totals} />
            </div>
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Engagement Funnel</h3>
              <div className="space-y-2">{funnelRows.map(([label, value, rate]) => <div key={label} className="rounded-md bg-[#f7faff] p-3"><div className="flex justify-between text-[12px]"><strong className="text-[#071936]">{label}</strong><span className="font-bold text-blue-700">{number(value)} - {rate}</span></div><div className="mt-2 h-2 rounded-full bg-[#e8eef7]"><span className="block h-2 rounded-full bg-blue-600" style={{ width: rate }} /></div></div>)}</div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Device Performance</h3>
              <div className="py-8 text-center text-[13px] text-[#536173]">Device performance will appear after emails are sent and tracked.</div>
            </div>
            <div className="rounded-lg border border-[#edf2f7] p-4">
              <h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Revenue & Conversions</h3>
              <div className="overflow-x-auto"><table className="min-w-[560px] w-full border-collapse text-left text-[12px]"><thead><tr className="text-[#536173]"><th className="py-2">Campaign</th><th>Orders</th><th>Revenue</th><th>AOV</th><th>Conversion</th></tr></thead><tbody>{revenueRows.length === 0 ? <tr className="border-t border-[#edf2f7]"><td colSpan={5} className="py-8 text-center text-[#536173]">Revenue attribution will appear after campaign orders are tracked.</td></tr> : revenueRows.map((campaign) => <tr key={campaign._id || campaign.name} className="border-t border-[#edf2f7]"><td className="py-2 font-bold text-blue-800">{campaign.name}</td><td>{number(campaign.orders || 0)}</td><td>Rs {number(campaign.revenue || 0)}</td><td>Rs {number(Number(campaign.revenue || 0) / Math.max(1, Number(campaign.orders || 0)))}</td><td>{pct(campaign.orders || 0, campaignRecipients(campaign) || campaign.sent || 0)}</td></tr>)}</tbody></table></div>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-[#edf2f7] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-[13px] font-black text-[#071936]">Campaign Performance</h3><button type="button" onClick={() => setNotice('Campaign analytics exported.')} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">Export CSV</button></div>
            <div className="overflow-x-auto"><table className="min-w-[1040px] w-full border-collapse text-left text-[12px]"><thead><tr className="text-[#536173]"><th className="py-2">Campaign</th><th>Type</th><th>Audience</th><th>Sent</th><th>Delivered</th><th>Open Rate</th><th>Click Rate</th><th>Conversions</th><th>Revenue</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{campaignRows.length === 0 ? <tr className="border-t border-[#edf2f7]"><td colSpan={11} className="py-8 text-center text-[#536173]">Campaign analytics will appear after campaigns are sent.</td></tr> : campaignRows.map((campaign, index) => <tr key={campaign._id || campaign.name || index} className="border-t border-[#edf2f7]"><td className="py-3 font-bold text-blue-800">{campaign.name}</td><td>{campaignType(campaign)}</td><td>{audienceName(campaign)}</td><td>{number(campaignRecipients(campaign) || campaign.sent || 0)}</td><td>{number(Math.max(0, Number(campaign.sent || 0) - Number(campaign.bounced || 0)))}</td><td>{pct(campaign.opened, campaign.sent)}</td><td>{pct(campaign.clicked, campaign.sent)}</td><td>{number(campaign.orders || 0)}</td><td>Rs {number(campaign.revenue || 0)}</td><td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[campaign.status] ?? STATUS_STYLES.Draft}`}>{campaign.status || 'Draft'}</span></td><td className="text-right"><button type="button" onClick={() => setNotice(`Opening report for ${campaign.name || 'campaign'}.`)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button><button type="button" onClick={() => setNotice(`Compare queued for ${campaign.name || 'campaign'}.`)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">Compare</button></td></tr>)}</tbody></table></div>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Top Campaigns</h3>{topCampaigns.length === 0 ? <div className="py-6 text-center text-[12px] text-[#536173]">No sent campaigns yet.</div> : topCampaigns.map((campaign) => <div key={campaign._id || campaign.name} className="border-b border-[#edf2f7] py-2 text-[12px] font-bold text-[#0f2f5f]">{campaign.name} - {pct(campaign.opened, campaign.sent)} open</div>)}</div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Top Templates</h3>{templates.length === 0 ? <div className="py-6 text-center text-[12px] text-[#536173]">No templates created yet.</div> : templates.slice(0, 4).map((template) => <div key={template.id} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong className="text-[#0f2f5f]">{template.name}</strong><span className="block text-[#536173]">Used {number(template.used || 0)} times</span></div>)}</div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Best Performing Segments</h3>{segments.length === 0 ? <div className="py-6 text-center text-[12px] text-[#536173]">No segments created yet.</div> : segments.slice(0, 4).map((segment) => <div key={segment.id} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong className="text-[#0f2f5f]">{segment.name}</strong><span className="block text-[#536173]">{number(segment.contacts || 0)} contacts</span></div>)}</div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Recent Activity</h3><div className="py-8 text-center text-[13px] text-[#536173]">Activity will appear as campaigns, templates, segments and suppression records are created.</div></div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><div className="mb-3 flex items-center justify-between"><h3 className="m-0 text-[13px] font-black text-[#071936]">Delivery Issues</h3><button type="button" onClick={() => setNotice('Failed contacts export queued.')} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-red-600">Export Failed</button></div><div className="py-8 text-center text-[13px] text-[#536173]">Delivery issues will appear after email delivery attempts.</div></div>
          </div>
        </Card>
      );
    }

    if (activeTab === 'Suppression List') {
      return (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[16px] font-black text-[#071936]">Suppression List</h2>
              <p className="m-0 mt-1 text-[12px] text-[#536173]">Manage contacts who should not receive marketing emails.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setNotice('Suppression import wizard is ready for CSV/Excel mapping integration.')} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Import</button>
              <button type="button" onClick={() => setNotice('Suppression list export queued.')} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Export</button>
              <button type="button" onClick={() => openSuppressionForm()} className="inline-flex h-9 items-center gap-2 rounded-md border-0 bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700"><UserX size={15} /> Add Suppression</button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total Suppressed', suppressionStats.total, 'Current records'],
              ['Unsubscribed', suppressionStats.unsubscribed, 'Consent protected'],
              ['Hard Bounce', suppressionStats.hardBounce, 'Delivery protected'],
              ['Spam Reports', suppressionStats.spam, 'Provider complaints'],
              ['Blocked Contacts', suppressionStats.blocked, 'Address/domain blocks'],
              ['Manually Added', suppressionStats.manual, 'Admin managed'],
              ['Recently Added', suppressionStats.recentlyAdded, 'Last 7 days'],
              ['Recently Removed', suppressionStats.removed, 'Audit tracked'],
            ].map(([label, value, note]) => <div key={label} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4"><span className="block text-[12px] font-bold text-[#536173]">{label}</span><strong className="mt-2 block text-[23px] text-[#071936]">{number(value)}</strong><span className="mt-1 block text-[11px] font-bold text-[#536173]">{note}</span></div>)}
          </div>

          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_170px_150px_auto_auto]">
            <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} /><input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search contacts..." value={suppressionSearch} onChange={(event) => setSuppressionSearch(event.target.value)} /></label>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={suppressionFilters.type} onChange={(event) => setSuppressionFilters((current) => ({ ...current, type: event.target.value }))}>{SUPPRESSION_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={suppressionFilters.source} onChange={(event) => setSuppressionFilters((current) => ({ ...current, source: event.target.value }))}>{SUPPRESSION_SOURCES.map((source) => <option key={source}>{source}</option>)}</select>
            <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f]" value={suppressionFilters.date} onChange={(event) => setSuppressionFilters((current) => ({ ...current, date: event.target.value }))}>{SUPPRESSION_DATES.map((date) => <option key={date}>{date}</option>)}</select>
            <button type="button" onClick={() => setNotice('Suppression filter saved.')} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[12px] font-bold text-blue-700">Save Filter</button>
            <button type="button" onClick={() => { setSuppressionSearch(''); setSuppressionFilters({ type: 'All', source: 'All Sources', date: 'All Dates' }); setSuppressionTab('All'); }} className="h-10 rounded-md border border-[#dbe4ef] bg-white px-4 text-[12px] font-bold text-[#536173]">Clear</button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">{SUPPRESSION_TYPES.map((tab) => <button key={tab} type="button" onClick={() => setSuppressionTab(tab)} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${suppressionTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2f5f] hover:bg-blue-50'}`}>{tab}</button>)}</div>

          {selectedSuppressionIds.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px]">
              <strong className="text-blue-800">{selectedSuppressionIds.length} suppression record{selectedSuppressionIds.length === 1 ? '' : 's'} selected</strong>
              <div className="flex flex-wrap gap-2">{['Export Selected', 'Add Note', 'Change Reason', 'Remove Suppression'].map((action) => <button key={action} type="button" onClick={() => bulkSuppressionAction(action)} className="rounded-md border border-blue-200 bg-white px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-50">{action}</button>)}</div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-[12px]">
              <thead><tr className="text-[#536173]"><th className="w-8 py-2"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={filteredSuppressions.length > 0 && selectedSuppressionIds.length === filteredSuppressions.length} onChange={(event) => toggleAllSuppressions(event.target.checked)} /></th><th>Contact</th><th>Contact Type</th><th>Suppression Type</th><th>Reason</th><th>Source</th><th>Added Date</th><th>Last Email</th><th>Status</th><th>Added By</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredSuppressions.length === 0 ? (
                  <tr className="border-t border-[#edf2f7]"><td colSpan={11} className="py-10 text-center text-[#536173]">No suppression records match your filters.</td></tr>
                ) : filteredSuppressions.map((row) => (
                  <tr key={row.id} className="border-t border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="py-3 pr-3"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={selectedSuppressionIds.includes(row.id)} onChange={() => toggleSuppressionSelection(row.id)} /></td>
                    <td className="min-w-[210px] py-3 pr-3"><button type="button" onClick={() => setSelectedSuppression(row)} className="block border-0 bg-transparent p-0 text-left font-black text-blue-800 hover:text-blue-600">{row.name}</button><span className="block text-[#536173]">{row.email}</span><span className="block text-[11px] text-[#7b8da8]">{row.company}</span></td>
                    <td className="pr-3 font-bold text-[#0f2f5f]">{row.type}</td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${suppressionBadgeClass(row.suppressionType)}`}>{row.suppressionType}</span></td>
                    <td className="min-w-[160px] pr-3">{row.reason}</td>
                    <td className="pr-3">{row.source}</td>
                    <td className="pr-3">{fmtDate(row.addedDate)}</td>
                    <td className="min-w-[140px] pr-3">{row.lastEmail}</td>
                    <td className="pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${row.status === 'Suppressed' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.status}</span></td>
                    <td className="pr-3">{row.addedBy}</td>
                    <td className="text-right"><button type="button" onClick={() => handleSuppressionAction('View', row)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View</button><button type="button" onClick={() => handleSuppressionAction('Remove Suppression', row)} className="ml-2 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-red-600">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Pre-Send Protection</h3>{[['Audience Selected', contacts.length], ['Suppressed Contacts', suppressionStats.total], ['Eligible Contacts', Math.max(0, contacts.length - suppressionStats.total)]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span>{label}</span><strong>{number(value)}</strong></div>)}<button type="button" onClick={() => setNotice('Excluded contacts report queued.')} className="mt-3 rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Download Exclusion Report</button></div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Automatic Rules</h3>{['Suppress after hard bounce', 'Suppress after spam complaint', 'Suppress after 3 soft bounces', 'Exclude transactional emails from marketing suppression'].map((rule) => <label key={rule} className="mb-2 block text-[12px] font-bold text-[#0f2f5f]"><input type="checkbox" className="mr-2 accent-blue-600" defaultChecked />{rule}</label>)}</div>
            <div className="rounded-lg border border-[#edf2f7] p-4"><h3 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Audit Log</h3>{suppressionRows.slice(0, 4).map((row) => <div key={`${row.id}-audit`} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong>{row.suppressionType}</strong><span className="block text-[#536173]">{row.email} - Added by {row.addedBy} on {fmtDate(row.addedDate)}</span></div>)}</div>
          </div>
        </Card>
      );
    }

    return null;
  }

  return (
    <div className="email-marketing-page min-h-full overflow-x-hidden bg-[#f7faff] p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1720px] overflow-x-hidden">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="m-0 text-[24px] font-black tracking-tight text-[#071936]">Email Marketing</h1>
            <p className="m-0 mt-1 text-[13px] text-[#536173]">Create, send and track email campaigns</p>
          </div>
          <div className="flex flex-1 items-center gap-3 lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={16} />
              <input
                className="h-11 w-full rounded-md border border-[#dbe4ef] bg-white pl-11 pr-4 text-[13px] outline-none focus:border-blue-500"
                placeholder="Search campaigns, contacts, templates..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {activeTab === 'Campaigns' && (
              <button type="button" onClick={openNewCampaign} className="inline-flex h-10 items-center gap-2 rounded-md border-0 bg-blue-600 px-5 text-[13px] font-bold text-white hover:bg-blue-700">
                <Plus size={16} /> Create Campaign
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
            <span>{notice}</span>
            <button type="button" className="border-0 bg-transparent text-blue-700" onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        <div className="mb-4 flex gap-7 overflow-x-auto border-b border-[#dbe4ef]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative border-0 bg-transparent px-1 pb-3 text-[13px] font-bold ${activeTab === tab ? 'text-blue-700' : 'text-[#0f2f5f] hover:text-blue-700'}`}
            >
              {tab}
              {activeTab === tab && <span className="absolute bottom-[-1px] left-0 h-0.5 w-full rounded-full bg-blue-600" />}
            </button>
          ))}
        </div>

        {activeTab === 'Campaigns' && (
          <Card className="mb-4 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-[16px] font-black text-[#071936]">Campaigns</h2>
                <p className="m-0 mt-1 text-[12px] text-[#536173]">Plan, schedule and measure customer email campaigns.</p>
              </div>
              <strong className="text-[13px] text-[#0f2f5f]">{number(filtered.length)} campaigns</strong>
            </div>

            <div className="mb-3 grid gap-2 md:grid-cols-[minmax(220px,1fr)_150px_170px_150px_170px]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8da8]" size={15} />
                <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-10 pr-3 text-[12px] outline-none focus:border-blue-500" placeholder="Search campaigns..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={campaignFilters.status} onChange={(event) => setCampaignFilters((current) => ({ ...current, status: event.target.value }))}>
                {CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={campaignFilters.type} onChange={(event) => setCampaignFilters((current) => ({ ...current, type: event.target.value }))}>
                {['All Types', ...CAMPAIGN_TYPES].map((type) => <option key={type}>{type}</option>)}
              </select>
              <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={campaignFilters.date} onChange={(event) => setCampaignFilters((current) => ({ ...current, date: event.target.value }))}>
                {DATE_FILTERS.map((date) => <option key={date}>{date}</option>)}
              </select>
              <select className="h-10 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-[#0f2f5f] outline-none" value={campaignFilters.audience} onChange={(event) => setCampaignFilters((current) => ({ ...current, audience: event.target.value }))}>
                {AUDIENCES.map((audience) => <option key={audience}>{audience}</option>)}
              </select>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {[
                  ['All', statusCounts.All],
                  ['Draft', statusCounts.Draft],
                  ['Scheduled', statusCounts.Scheduled],
                  ['Sent', statusCounts.Sent],
                ].map(([label, count]) => (
                  <button key={label} type="button" onClick={() => setSummaryFilter(label)} className={`rounded-full border px-3 py-1 font-bold ${summaryFilter === label ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-[#536173] hover:text-blue-700'}`}>{label === 'Draft' ? 'Drafts' : label} ({number(count)})</button>
                ))}
              </div>
              <button type="button" onClick={() => setNotice('Campaign export is ready for report download integration.')} className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-3 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Export</button>
            </div>

            {selectedCampaignIds.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px]">
                <strong className="text-blue-800">{selectedCampaignIds.length} campaign{selectedCampaignIds.length === 1 ? '' : 's'} selected</strong>
                <div className="flex flex-wrap gap-2">
                  {['Archive', 'Delete', 'Export'].map((label) => <button key={label} type="button" onClick={() => bulkAction(label)} className="rounded-md border border-blue-200 bg-white px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-50">{label}</button>)}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-[1240px] w-full border-collapse text-left text-[12px]">
                <thead>
                  <tr className="text-[#536173]">
                    <th className="w-8 py-2"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={filtered.length > 0 && selectedCampaignIds.length === filtered.length} onChange={(event) => toggleAllCampaigns(event.target.checked)} /></th>
                    <th className="py-2">Campaign</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Audience</th>
                    <th>Recipients</th>
                    <th>Sent / Scheduled</th>
                    <th>Open Rate</th>
                    <th>Click Rate</th>
                    <th>Orders / Revenue</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>{renderCampaignRows()}</tbody>
              </table>
            </div>
          </Card>
        )}

        {renderSubsection()}

        {activeTab === 'Dashboard' && (
          <Card className="mb-4 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="m-0 text-[15px] font-black text-[#071936]">Email Marketing Workflow</h2>
                <p className="m-0 mt-1 text-[12px] text-[#536173]">Set up real data in this order so campaigns, automations and analytics connect properly.</p>
              </div>
              <button type="button" onClick={() => setActiveTab('Campaigns')} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Go to Campaigns</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                ['1', 'Contacts', 'Add or import subscribers, customers and leads.', () => setActiveTab('Contacts')],
                ['2', 'Suppression', 'Block unsubscribed, bounced or manually excluded addresses.', () => setActiveTab('Suppression List')],
                ['3', 'Segments', 'Group contacts into dynamic or static audiences.', () => setActiveTab('Segments')],
                ['4', 'Templates', 'Create reusable email content and variables.', () => setActiveTab('Templates')],
                ['5', 'Send', 'Create campaigns, sequences or automations.', () => setActiveTab('Campaigns')],
                ['6', 'Analytics', 'Review delivery, engagement and revenue.', () => setActiveTab('Analytics')],
              ].map(([step, title, detail, action]) => (
                <button key={title} type="button" onClick={action} className="min-h-[118px] rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-3 text-left hover:border-blue-200 hover:bg-blue-50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[12px] font-black text-white">{step}</span>
                  <strong className="mt-3 block text-[13px] text-[#071936]">{title}</strong>
                  <span className="mt-1 block text-[11px] leading-5 text-[#536173]">{detail}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'Dashboard' && <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(280px,0.72fr)]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Recent Campaigns</h2>
              <button type="button" onClick={() => setActiveTab('Campaigns')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Campaign Name</th><th>Status</th><th>Recipients</th><th>Sent On</th><th>Open Rate</th><th>Click Rate</th><th /></tr></thead>
                <tbody>{renderCampaignRows(5, true)}</tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Email Performance Overview</h2>
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0f2f5f]">This Month <ChevronDown size={13} /></button>
            </div>
            <MiniChart totals={totals} />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Emails Sent', totals.sent, '#2563eb'],
                ['Delivered', totals.delivered, '#059669'],
                ['Opened', totals.opened, '#6d28d9'],
                ['Clicked', totals.clicked, '#f97316'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-md border border-[#dbe4ef] p-3 text-center" style={{ background: `${color}08` }}>
                  <strong className="block text-[18px]" style={{ color }}>{number(value)}</strong>
                  <span className="text-[11px] text-[#536173]">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2 2xl:col-span-1">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 text-[15px] font-black text-[#071936]">Top Performing Campaign</h2>
                <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] text-[#0f2f5f]">This Month <ChevronDown size={13} /></button>
              </div>
              <div className="rounded-md border border-[#edf2f7]">
                {topCampaigns.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#536173]">No sent campaign data yet.</div>
                ) : topCampaigns.map((campaign) => (
                  <div key={campaign._id} className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3 text-[12px] last:border-b-0">
                    <span className="font-bold text-blue-800">{campaign.name}</span>
                    <strong className="text-[#071936]">{pct(campaign.opened, campaign.sent)}</strong>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActiveTab('Analytics')} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-700 hover:bg-blue-50">View Campaign Report <ArrowRight size={15} /></button>
            </Card>

            <Card className="p-4">
              <h2 className="m-0 mb-3 text-[15px] font-black text-[#071936]">Quick Actions</h2>
              {[
                [FileText, 'Create Email Template', () => openTemplateBuilder()],
                [Users, 'Create Contact List', () => setShowListForm(true)],
                [Layers3, 'Create Segment', () => openSegmentBuilder()],
                [Bot, 'Create Automation', () => openAutomationBuilder()],
                [BarChart3, 'View Analytics', () => setActiveTab('Analytics')],
                [ShieldOff, 'Suppression List', () => setActiveTab('Suppression List')],
              ].map(([Icon, label, action]) => (
                <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 border-0 border-b border-[#edf2f7] bg-white px-2 py-3 text-left text-[12px] font-bold text-[#071936] hover:bg-blue-50 last:border-b-0">
                  <Icon size={15} className="text-blue-700" /><span className="flex-1">{label}</span><ChevronRight size={14} className="text-[#7b8da8]" />
                </button>
              ))}
            </Card>
          </div>
        </div>}

        {activeTab === 'Dashboard' && <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.95fr)_minmax(280px,0.74fr)]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Email Lists</h2>
              <button type="button" onClick={() => setActiveTab('Contacts')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">List Name</th><th>Contacts</th><th>Created On</th><th>Status</th></tr></thead>
                <tbody>
                  {renderEmailListRows('No email lists created.')}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setShowListForm(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Create List</button>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-black text-[#071936]">Automation Workflows</h2>
              <button type="button" onClick={() => setActiveTab('Automations')} className="border-0 bg-transparent text-[12px] font-bold text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead><tr className="text-[#536173]"><th className="py-2">Workflow Name</th><th>Trigger</th><th>Status</th><th>Last Run</th></tr></thead>
                <tbody>
                  {renderAutomationRows()}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => openAutomationBuilder()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#dbe4ef] bg-white px-4 text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Plus size={15} /> Create Automation</button>
          </Card>

          <Card className="p-4">
            <h2 className="m-0 mb-4 text-[15px] font-black text-[#071936]">Email Account Status</h2>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-bold text-slate-600"><CheckCircle2 size={15} /> Configure SMTP</span>
              <span className="text-[12px] text-[#536173]">Settings required</span>
            </div>
            <div className="mb-2 flex justify-between text-[12px]"><span className="text-[#536173]">Daily Email Limit</span><strong>{number(totals.sent)} sent</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e5edf7]"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, totals.sent / 100)}%` }} /></div>
            <div className="mt-3 flex justify-between text-[12px]"><span className="text-[#536173]">Reset Time</span><strong>12:00 AM (Daily)</strong></div>
            <button type="button" onClick={() => setActiveTab('Suppression List')} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#dbe4ef] bg-white text-[13px] font-bold text-blue-700 hover:bg-blue-50"><Gauge size={15} /> Manage Deliverability</button>
          </Card>
        </div>}
      </div>

      {showAutomationBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={(e) => saveAutomation(e, false)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="m-0 text-[17px] font-black text-[#071936]">{editingAutomation ? 'Edit Automation' : 'Create Automation'}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Visual workflow builder with GoBook triggers, email actions, waits and branches.</p></div>
              <div className="flex gap-2"><button type="submit" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700">Save Draft</button><button type="button" onClick={(e) => saveAutomation(e, true)} className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white">Publish</button><button type="button" onClick={() => setShowAutomationBuilder(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button></div>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Automation Name *" value={automationForm.name} onChange={(e) => updateAutomationForm('name', e.target.value)} />
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={automationForm.category} onChange={(e) => updateAutomationForm('category', e.target.value)}>{['Customer Marketing', 'CRM & Sales', 'Sales & Billing', 'Email Engagement'].map((category) => <option key={category}>{category}</option>)}</select>
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={automationForm.trigger} onChange={(e) => updateAutomationForm('trigger', e.target.value)}>{AUTOMATION_TRIGGERS.filter((trigger) => trigger !== 'All Triggers').map((trigger) => <option key={trigger}>{trigger}</option>)}</select>
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Tags" value={automationForm.tags} onChange={(e) => updateAutomationForm('tags', e.target.value)} />
              <textarea className="md:col-span-4 min-h-16 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Description" value={automationForm.description} onChange={(e) => updateAutomationForm('description', e.target.value)} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
              <aside className="space-y-4">
                <section className="rounded-lg border border-[#edf2f7] p-3"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Action Nodes</h4><div className="grid gap-2">{AUTOMATION_NODE_TYPES.map((node) => <button key={node} type="button" onClick={() => addAutomationNode(node)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[12px] font-bold text-[#0f2f5f] hover:bg-blue-50">{node}</button>)}</div></section>
                <section className="rounded-lg border border-[#edf2f7] p-3"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">GoBook Triggers</h4>{['Customer Created', 'New Lead Created', 'Order Completed', 'Invoice Overdue', 'Payment Received', 'Email Opened', 'Date-Based'].map((trigger) => <button key={trigger} type="button" onClick={() => updateAutomationForm('trigger', trigger)} className="mb-2 block w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[12px] font-bold text-blue-700 hover:bg-blue-50">{trigger}</button>)}</section>
              </aside>
              <section className="rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="m-0 text-[13px] font-black text-[#071936]">Workflow Canvas</h4><div className="flex gap-2">{['Undo', 'Redo', 'Zoom In', 'Zoom Out'].map((label) => <button key={label} type="button" onClick={() => setNotice(`${label} ready for canvas integration.`)} className="rounded-md border border-[#dbe4ef] bg-white px-2 py-1 text-[11px] font-bold text-blue-700">{label}</button>)}</div></div>
                <div className="mx-auto max-w-md">{automationForm.nodes.map((node, index) => <div key={`${node}-${index}`} className="text-center"><div className="rounded-lg border border-[#dbe4ef] bg-white p-4 text-left shadow-sm"><div className="flex items-center justify-between gap-3"><strong className="text-[13px] text-[#071936]">{node}</strong><button type="button" onClick={() => removeAutomationNode(index)} className="rounded-md border border-[#dbe4ef] bg-white px-2 py-1 text-[11px] font-bold text-red-600">Delete</button></div><p className="m-0 mt-2 text-[12px] text-[#536173]">Select this node to edit settings, duplicate it, or connect it to another workflow step.</p></div>{index < automationForm.nodes.length - 1 && <div className="py-2 text-[18px] text-[#7b8da8]">↓</div>}</div>)}</div>
              </section>
              <aside className="space-y-4">
                <section className="rounded-lg border border-[#edf2f7] p-3"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Node Settings</h4><label className="mb-2 block text-[12px] font-bold text-[#536173]">Email Template<select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]"><option>Welcome Customer</option><option>Product Guide</option><option>Payment Reminder</option></select></label><input className="mb-2 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[12px]" placeholder="Subject: Welcome to {{company.name}}" /><div className="grid grid-cols-2 gap-2 text-[12px]"><label><input type="checkbox" defaultChecked className="mr-1 accent-blue-600" /> Opens</label><label><input type="checkbox" defaultChecked className="mr-1 accent-blue-600" /> Clicks</label></div></section>
                <section className="rounded-lg border border-[#edf2f7] p-3"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Enrollment Settings</h4>{['Once per contact', 'Every time trigger occurs', 'Only when conditions are met'].map((item) => <label key={item} className="mb-2 block text-[12px] font-bold text-[#0f2f5f]"><input type="radio" className="mr-2 accent-blue-600" checked={automationForm.enrollment === item} onChange={() => updateAutomationForm('enrollment', item)} />{item}</label>)}{['Exclude unsubscribed contacts', 'Exclude suppressed contacts', 'Require marketing consent'].map((item) => <label key={item} className="mt-2 block text-[12px] text-[#536173]"><input type="checkbox" defaultChecked className="mr-2 accent-blue-600" />{item}</label>)}</section>
                <section className="rounded-lg border border-[#edf2f7] p-3"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Exit Conditions</h4>{['Customer unsubscribes', 'Customer is deleted', 'Customer completes purchase', 'Customer is removed from segment'].map((item) => <label key={item} className="mb-2 block text-[12px] text-[#536173]"><input type="checkbox" defaultChecked={item !== 'Customer is removed from segment'} className="mr-2 accent-blue-600" />{item}</label>)}</section>
              </aside>
            </div>
          </form>
        </div>
      )}

      {selectedAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4"><div><h3 className="m-0 text-[20px] font-black text-[#071936]">{selectedAutomation.name}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">{selectedAutomation.trigger} - {selectedAutomation.category}</p></div><div className="flex flex-wrap gap-2">{automationActions(selectedAutomation).map((action) => <button key={action} type="button" onClick={() => handleAutomationAction(action, selectedAutomation)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">{action}</button>)}<button type="button" onClick={() => setSelectedAutomation(null)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#536173]">Close</button></div></div>
            <div className="mb-4 grid gap-3 md:grid-cols-4">{[['Enrolled', selectedAutomation.enrolled], ['Completed', selectedAutomation.completed], ['In Progress', selectedAutomation.inProgress], ['Exited', selectedAutomation.exited]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf2f7] p-3"><span className="text-[11px] font-bold text-[#536173]">{label}</span><strong className="mt-1 block text-[18px] text-[#071936]">{number(value)}</strong></div>)}</div>
            <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Workflow Steps</h4>{selectedAutomation.nodes.map((node) => <div key={node} className="mb-2 rounded-md bg-[#f7faff] px-3 py-2 text-[12px] font-bold text-[#0f2f5f]">{node}</div>)}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Automation Logs</h4>{selectedAutomation.executions ? ['Workflow executed', 'Next action scheduled'].map((log) => <div key={log} className="border-b border-[#edf2f7] py-2 text-[12px] text-[#536173]">{log}</div>) : <div className="py-8 text-center text-[12px] text-[#536173]">No execution logs yet.</div>}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Email Performance</h4>{[['Emails sent', selectedAutomation.executions], ['Open rate', selectedAutomation.openRate], ['Click rate', selectedAutomation.clickRate], ['Revenue attributed', `Rs ${number(selectedAutomation.revenue)}`]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span>{label}</span><strong>{value}</strong></div>)}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Execution Details</h4>{contacts.length === 0 ? <div className="py-8 text-center text-[12px] text-[#536173]">No contacts enrolled yet.</div> : contacts.slice(0, 3).map((contact) => <div key={contact.id} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong>{contact.firstName} {contact.lastName}</strong><span className="block text-[#536173]">Current step: Not started - Last activity: {contact.engagement}</span></div>)}</div></div>
          </div>
        </div>
      )}

      {showSequenceBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={(e) => saveSequence(e, false)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="m-0 text-[17px] font-black text-[#071936]">{editingSequence ? 'Edit Email Sequence' : 'Create Email Sequence'}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Build a step-based email timeline for customers, leads and retained audiences.</p></div>
              <div className="flex gap-2"><button type="submit" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700">Save Draft</button><button type="button" onClick={(e) => saveSequence(e, true)} className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white">Activate</button><button type="button" onClick={() => setShowSequenceBuilder(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button></div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">{SEQUENCE_WIZARD_STEPS.map((step, index) => <button key={step} type="button" onClick={() => setSequenceStep(index)} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${sequenceStep === index ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] bg-white text-[#0f2f5f]'}`}>{index + 1}. {step}</button>)}</div>

            {sequenceStep === 0 && (
              <section className="rounded-lg border border-[#edf2f7] p-4">
                <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Basic Details</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Sequence Name *" value={sequenceForm.name} onChange={(e) => updateSequenceForm('name', e.target.value)} />
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.type} onChange={(e) => updateSequenceForm('type', e.target.value)}>{SEQUENCE_TYPES.filter((type) => type !== 'All Types').map((type) => <option key={type}>{type}</option>)}</select>
                  <textarea className="md:col-span-2 min-h-20 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Description" value={sequenceForm.description} onChange={(e) => updateSequenceForm('description', e.target.value)} />
                  <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Tags" value={sequenceForm.tags} onChange={(e) => updateSequenceForm('tags', e.target.value)} />
                  <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Owner" value={sequenceForm.owner} onChange={(e) => updateSequenceForm('owner', e.target.value)} />
                  <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Default sender" value={sequenceForm.defaultSender} onChange={(e) => updateSequenceForm('defaultSender', e.target.value)} />
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.timezone} onChange={(e) => updateSequenceForm('timezone', e.target.value)}>{['IST', 'Contact Timezone', 'UTC'].map((zone) => <option key={zone}>{zone}</option>)}</select>
                </div>
              </section>
            )}

            {sequenceStep === 1 && (
              <section className="rounded-lg border border-[#edf2f7] p-4">
                <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Audience & Enrollment</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.audienceSource} onChange={(e) => updateSequenceForm('audienceSource', e.target.value)}>{['All Contacts', 'Customers', 'Leads', 'Select Segment', 'Custom Audience'].map((source) => <option key={source}>{source}</option>)}</select>
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.audience} onChange={(e) => updateSequenceForm('audience', e.target.value)}>{['New Customers', 'VIP Customers', 'Hot Leads', 'Recent Buyers', 'Inactive Customers'].map((audience) => <option key={audience}>{audience}</option>)}</select>
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.enrollmentMethod} onChange={(e) => updateSequenceForm('enrollmentMethod', e.target.value)}>{['Manually enroll contacts', 'Enroll from automation', 'Enroll from CRM trigger'].map((method) => <option key={method}>{method}</option>)}</select>
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.enrollmentRule} onChange={(e) => updateSequenceForm('enrollmentRule', e.target.value)}>{['One enrollment per contact', 'Allow re-enrollment after 30 days', 'Require marketing consent'].map((rule) => <option key={rule}>{rule}</option>)}</select>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">{[['Eligible Contacts', Math.max(0, contacts.length - suppressionStats.total)], ['Valid Emails', contacts.filter((contact) => contact.email).length], ['Suppressed', suppressionStats.total], ['Excluded', suppressionStats.total]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-3"><span className="text-[11px] font-bold text-[#536173]">{label}</span><strong className="block text-[18px] text-[#071936]">{number(value)}</strong></div>)}</div>
              </section>
            )}

            {sequenceStep === 2 && (
              <section className="rounded-lg border border-[#edf2f7] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="m-0 text-[13px] font-black text-[#071936]">Sequence Timeline</h4><div className="flex flex-wrap gap-2">{SEQUENCE_STEP_TYPES.map((type) => <button key={type} type="button" onClick={() => addSequenceStep(type)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">Add {type}</button>)}</div></div>
                <div className="space-y-3">
                  {sequenceForm.steps.map((step, index) => (
                    <div key={`${step.name}-${index}`} className="rounded-lg border border-[#dbe4ef] bg-[#fbfdff] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-[12px] text-[#071936]">Step {index + 1} - {step.type}</strong><button type="button" onClick={() => removeSequenceStep(index)} className="rounded-md border border-[#dbe4ef] bg-white px-2 py-1 text-[11px] font-bold text-red-600">Delete</button></div>
                      <div className="grid gap-2 md:grid-cols-4"><input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[12px]" value={step.name} onChange={(e) => updateSequenceStep(index, 'name', e.target.value)} /><input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[12px]" value={step.timing} onChange={(e) => updateSequenceStep(index, 'timing', e.target.value)} /><select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]" value={step.template} onChange={(e) => updateSequenceStep(index, 'template', e.target.value)}>{['', ...templates.map((template) => template.name)].map((template) => <option key={template}>{template}</option>)}</select><input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[12px]" placeholder="Subject" value={step.subject || ''} onChange={(e) => updateSequenceStep(index, 'subject', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sequenceStep === 3 && (
              <section className="rounded-lg border border-[#edf2f7] p-4">
                <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Settings, Timing & Exit Conditions</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Preferred send time" value={sequenceForm.sendWindow} onChange={(e) => updateSequenceForm('sendWindow', e.target.value)} />
                  <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={sequenceForm.goal} onChange={(e) => updateSequenceForm('goal', e.target.value)}>{['Purchase completed', 'Lead converted', 'Email clicked', 'Meeting booked', 'Review submitted'].map((goal) => <option key={goal}>{goal}</option>)}</select>
                  {[
                    ['stopOnUnsubscribe', 'Stop when contact unsubscribes'],
                    ['stopOnSuppressed', 'Stop when contact is suppressed'],
                    ['exitOnGoal', 'Exit when goal is achieved'],
                  ].map(([key, label]) => <label key={key} className="rounded-md border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-[12px] font-bold text-[#0f2f5f]"><input type="checkbox" className="mr-2 accent-blue-600" checked={Boolean(sequenceForm[key])} onChange={(e) => updateSequenceForm(key, e.target.checked)} />{label}</label>)}
                </div>
              </section>
            )}

            {sequenceStep === 4 && (
              <section className="rounded-lg border border-[#edf2f7] p-4">
                <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Review & Activate</h4>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#edf2f7] p-4">{[['Sequence', sequenceForm.name || 'Untitled Sequence'], ['Type', sequenceForm.type], ['Audience', sequenceForm.audience], ['Eligible Contacts', number(Math.max(0, contacts.length - suppressionStats.total))], ['Goal', sequenceForm.goal], ['Send Time', `${sequenceForm.sendWindow} - ${sequenceForm.timezone}`]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="font-bold text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
                  <div className="rounded-lg border border-[#edf2f7] p-4"><h5 className="m-0 mb-3 text-[12px] font-black text-[#071936]">Timeline</h5>{sequenceForm.steps.map((step, index) => <div key={`${step.name}-review-${index}`} className="mb-2 rounded-md bg-[#f7faff] px-3 py-2 text-[12px] text-[#0f2f5f]"><strong>Step {index + 1}: {step.name}</strong><span className="block text-[#536173]">{step.timing}{step.template ? ` - ${step.template}` : ''}</span></div>)}</div>
                </div>
              </section>
            )}

            <div className="mt-5 flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setSequenceStep((step) => Math.max(0, step - 1))} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173]">Back</button><button type="button" onClick={() => setSequenceStep((step) => Math.min(SEQUENCE_WIZARD_STEPS.length - 1, step + 1))} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700">Next</button></div>
          </form>
        </div>
      )}

      {selectedSequence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4"><div><h3 className="m-0 text-[20px] font-black text-[#071936]">{selectedSequence.name}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">{selectedSequence.type} - {selectedSequence.audience}</p></div><div className="flex flex-wrap gap-2">{sequenceActions(selectedSequence).map((action) => <button key={action} type="button" onClick={() => handleSequenceAction(action, selectedSequence)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">{action}</button>)}<button type="button" onClick={() => setSelectedSequence(null)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#536173]">Close</button></div></div>
            <div className="mb-4 grid gap-3 md:grid-cols-4">{[['Enrolled', selectedSequence.enrolled], ['Completed', selectedSequence.completed], ['In Progress', selectedSequence.inProgress], ['Exited', selectedSequence.exited]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf2f7] p-3"><span className="text-[11px] font-bold text-[#536173]">{label}</span><strong className="mt-1 block text-[18px] text-[#071936]">{number(value)}</strong></div>)}</div>
            <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Sequence Timeline</h4>{selectedSequence.steps.map((step, index) => <div key={`${step.name}-${index}`} className="mb-2 rounded-md bg-[#f7faff] px-3 py-2 text-[12px] text-[#0f2f5f]"><strong>Step {index + 1}: {step.name}</strong><span className="block text-[#536173]">{step.timing}{step.template ? ` - ${step.template}` : ''}</span></div>)}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Email Performance</h4>{selectedSequence.steps.filter((step) => step.type === 'Email').map((step, index) => <div key={`${step.name}-perf`} className="grid grid-cols-4 gap-2 border-b border-[#edf2f7] py-2 text-[12px]"><span>{index + 1}</span><strong>{step.name}</strong><span>{selectedSequence.openRate}</span><span>{selectedSequence.clickRate}</span></div>)}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Enrollment Logs</h4>{selectedSequence.enrolled ? ['Sequence enrolled contacts', 'Next sequence step pending'].map((log) => <div key={log} className="border-b border-[#edf2f7] py-2 text-[12px] text-[#536173]">{log}</div>) : <div className="py-8 text-center text-[12px] text-[#536173]">No enrollment logs yet.</div>}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Enrollments</h4>{contacts.length === 0 ? <div className="py-8 text-center text-[12px] text-[#536173]">No contacts enrolled yet.</div> : contacts.slice(0, 3).map((contact) => <div key={contact.id} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong>{contact.firstName} {contact.lastName}</strong><span className="block text-[#536173]">Current step: Not started - Status: Pending</span></div>)}</div></div>
          </div>
        </div>
      )}

      {showSuppressionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={saveSuppression}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h3 className="m-0 text-[17px] font-black text-[#071936]">Add Suppression</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Block an email address, domain, GoBook contact, or selected audience from marketing communication.</p></div>
              <button type="button" onClick={() => setShowSuppressionForm(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Name or contact" value={suppressionForm.name} onChange={(e) => updateSuppressionForm('name', e.target.value)} />
              <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Email address or @domain.com *" value={suppressionForm.email} onChange={(e) => updateSuppressionForm('email', e.target.value)} />
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={suppressionForm.type} onChange={(e) => updateSuppressionForm('type', e.target.value)}>{['Customer', 'Lead', 'Subscriber', 'Domain', 'Other'].map((type) => <option key={type}>{type}</option>)}</select>
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={suppressionForm.suppressionType} onChange={(e) => updateSuppressionForm('suppressionType', e.target.value)}>{SUPPRESSION_TYPES.filter((type) => type !== 'All').map((type) => <option key={type}>{type}</option>)}</select>
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={suppressionForm.source} onChange={(e) => updateSuppressionForm('source', e.target.value)}>{SUPPRESSION_SOURCES.filter((source) => source !== 'All Sources').map((source) => <option key={source}>{source}</option>)}</select>
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px]" value={suppressionForm.applyTo} onChange={(e) => updateSuppressionForm('applyTo', e.target.value)}>{['Marketing emails', 'Promotional emails', 'Product updates', 'Newsletter', 'All email communication'].map((item) => <option key={item}>{item}</option>)}</select>
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Reason" value={suppressionForm.reason} onChange={(e) => updateSuppressionForm('reason', e.target.value)} />
              <input type="date" className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" value={suppressionForm.expiryDate || ''} onChange={(e) => updateSuppressionForm('expiryDate', e.target.value)} />
              <textarea className="md:col-span-2 min-h-24 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px]" placeholder="Notes" value={suppressionForm.notes} onChange={(e) => updateSuppressionForm('notes', e.target.value)} />
            </div>
            {suppressionForm.suppressionType === 'Domain Blocked' && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800">Blocking an entire domain may suppress many contacts. Review carefully before saving.</div>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowSuppressionForm(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173]">Cancel</button><button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white">Save Suppression</button></div>
          </form>
        </div>
      )}

      {selectedSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4"><div><h3 className="m-0 text-[20px] font-black text-[#071936]">{selectedSuppression.name}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">{selectedSuppression.email} - {selectedSuppression.type}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openSuppressionForm(selectedSuppression)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">Edit</button><button type="button" onClick={() => removeSuppression(selectedSuppression)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-red-600">Remove Suppression</button><button type="button" onClick={() => setSelectedSuppression(null)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#536173]">Close</button></div></div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Contact Information</h4>{[['Name', selectedSuppression.name], ['Email', selectedSuppression.email], ['Phone', selectedSuppression.phone || '-'], ['Contact Type', selectedSuppression.type], ['Customer / Lead ID', selectedSuppression.customerId], ['Company', selectedSuppression.company], ['Subscription Status', selectedSuppression.status]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="font-bold text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Suppression Details</h4>{[['Type', selectedSuppression.suppressionType], ['Reason', selectedSuppression.reason], ['Source', selectedSuppression.source], ['Date Added', fmtDate(selectedSuppression.addedDate)], ['Added By', selectedSuppression.addedBy], ['Affected Category', selectedSuppression.category], ['Expiry Date', selectedSuppression.expiryDate || '-']].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="font-bold text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Email History</h4>{[['Last email sent', selectedSuppression.lastEmail], ['Last delivered email', 'Welcome Email'], ['Last opened email', 'Monthly Newsletter'], ['Bounce history', selectedSuppression.suppressionType.includes('Bounce') ? selectedSuppression.reason : '-'], ['Unsubscribe history', selectedSuppression.suppressionType === 'Unsubscribed' ? selectedSuppression.reason : '-']].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="font-bold text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Audit Trail</h4>{['Added to suppression list', `Source: ${selectedSuppression.source}`, `Performed by: ${selectedSuppression.addedBy}`, `Notes: ${selectedSuppression.notes || '-'}`].map((item) => <div key={item} className="border-b border-[#edf2f7] py-2 text-[12px] text-[#536173]">{item}</div>)}</div>
            </div>
          </div>
        </div>
      )}

      {showSegmentBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={saveSegment}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="m-0 text-[17px] font-black text-[#071936]">{editingSegment ? 'Edit Segment' : 'Create Segment'}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Build static or dynamic audiences from GoBook contact, CRM, billing and email data.</p></div>
              <button type="button" onClick={() => setShowSegmentBuilder(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <section className="rounded-lg border border-[#edf2f7] p-4">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Basic Information</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Segment Name *" value={segmentForm.name} onChange={(e) => updateSegmentForm('name', e.target.value)} />
                    <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={segmentForm.category} onChange={(e) => updateSegmentForm('category', e.target.value)}>{SEGMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
                    <textarea className="md:col-span-2 min-h-20 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Description" value={segmentForm.description} onChange={(e) => updateSegmentForm('description', e.target.value)} />
                    <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Tags: VIP, Retail" value={segmentForm.tags} onChange={(e) => updateSegmentForm('tags', e.target.value)} />
                    <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={segmentForm.source} onChange={(e) => updateSegmentForm('source', e.target.value)}>{SEGMENT_SOURCES.filter((source) => source !== 'All Sources').map((source) => <option key={source}>{source}</option>)}</select>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ['Static', 'Manually manage contacts'],
                      ['Dynamic', 'Automatically update contacts based on rules'],
                    ].map(([type, detail]) => <label key={type} className={`rounded-md border p-3 text-[12px] font-bold ${segmentForm.type === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] text-[#0f2f5f]'}`}><input type="radio" className="mr-2 accent-blue-600" checked={segmentForm.type === type} onChange={() => updateSegmentForm('type', type)} />{type} Segment<span className="mt-1 block font-normal text-[#536173]">{detail}</span></label>)}
                  </div>
                </section>

                <section className="rounded-lg border border-[#edf2f7] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="m-0 text-[13px] font-black text-[#071936]">Rule Builder</h4>
                    <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold" value={segmentForm.matchMode} onChange={(e) => updateSegmentForm('matchMode', e.target.value)}>{['AND', 'OR'].map((mode) => <option key={mode}>{mode}</option>)}</select>
                  </div>
                  <div className="space-y-2">
                    {segmentForm.rules.map((rule, index) => (
                      <div key={`${rule.field}-${index}`} className="grid gap-2 rounded-md border border-[#edf2f7] bg-[#fbfdff] p-3 md:grid-cols-[1fr_150px_1fr_auto]">
                        <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]" value={rule.field} onChange={(e) => updateSegmentRule(index, 'field', e.target.value)}>{SEGMENT_RULE_FIELDS.map((field) => <option key={field}>{field}</option>)}</select>
                        <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]" value={rule.operator} onChange={(e) => updateSegmentRule(index, 'operator', e.target.value)}>{SEGMENT_OPERATORS.map((operator) => <option key={operator}>{operator}</option>)}</select>
                        <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[12px]" value={rule.value} onChange={(e) => updateSegmentRule(index, 'value', e.target.value)} />
                        <button type="button" onClick={() => removeSegmentRule(index)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={addSegmentRule} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Add Condition</button><button type="button" onClick={addSegmentRule} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Add Condition Group</button></div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4">
                  <h4 className="m-0 mb-2 text-[13px] font-black text-[#071936]">Audience Preview</h4>
                  <strong className="block text-[24px] text-[#071936]">2,845</strong>
                  <span className="text-[12px] text-[#536173]">Matching Contacts</span>
                  <div className="mt-3 space-y-1 text-[12px] text-[#536173]"><div>Valid emails: {number(contacts.filter((contact) => contact.email).length)}</div><div>Suppressed: {number(suppressionStats.total)}</div><div>Bounced: {number(suppressionStats.hardBounce)}</div><div>Matching percentage: 0%</div><div>Average purchase value: Rs 0</div></div>
                  <button type="button" disabled={!segments.length} onClick={() => segments[0] && setPreviewSegment(segments[0])} className="mt-4 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">View Matching Contacts</button>
                </section>
                <section className="rounded-lg border border-[#edf2f7] p-4">
                  <h4 className="m-0 mb-2 text-[13px] font-black text-[#071936]">Available Filters</h4>
                  {['Contact Information', 'Customer Information', 'Purchase & Billing', 'CRM & Lead Information', 'Email Engagement', 'Tags'].map((group) => <div key={group} className="border-b border-[#edf2f7] py-2 text-[12px] font-bold text-[#0f2f5f]">{group}</div>)}
                </section>
              </aside>
            </div>

            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowSegmentBuilder(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173]">Cancel</button><button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white">Save Segment</button></div>
          </form>
        </div>
      )}

      {selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4"><div><h3 className="m-0 text-[20px] font-black text-[#071936]">{selectedSegment.name}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">{selectedSegment.type} Segment - Created {fmtDate(selectedSegment.createdOn)}</p></div><div className="flex flex-wrap gap-2">{['Edit Rules', 'Use in Campaign', 'Duplicate', 'View Matching Contacts'].map((action) => <button key={action} type="button" onClick={() => handleSegmentAction(action, selectedSegment)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">{action}</button>)}<button type="button" onClick={() => setSelectedSegment(null)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#536173]">Close</button></div></div>
            <div className="mb-4 grid gap-3 md:grid-cols-5">{[['Matching Contacts', selectedSegment.contacts], ['Valid Emails', selectedSegment.validEmails], ['Subscribed', selectedSegment.validEmails], ['Unsubscribed', selectedSegment.excluded], ['Campaigns Used', selectedSegment.usedIn]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf2f7] p-3"><span className="text-[11px] font-bold text-[#536173]">{label}</span><strong className="mt-1 block text-[18px] text-[#071936]">{number(value)}</strong></div>)}</div>
            <div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Overview</h4>{[['Description', selectedSegment.description], ['Source', selectedSegment.source], ['Category', selectedSegment.category], ['Last updated', fmtDate(selectedSegment.updatedOn)], ['Last refreshed', selectedSegment.lastRefreshed]].map(([label, value]) => <div key={label} className="border-b border-[#edf2f7] py-2 text-[12px]"><strong className="text-[#536173]">{label}</strong><span className="ml-2 text-[#071936]">{value}</span></div>)}</div><div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Rules</h4>{selectedSegment.rules.map((rule) => <div key={rule} className="rounded-md bg-[#f7faff] px-3 py-2 text-[12px] font-bold text-[#0f2f5f] mb-2">{rule}</div>)}<h4 className="m-0 mt-4 mb-2 text-[13px] font-black text-[#071936]">Campaign Usage</h4><div className="text-[12px] text-[#536173]">No campaigns have used this segment yet.</div></div></div>
          </div>
        </div>
      )}

      {previewSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="m-0 text-[17px] font-black text-[#071936]">Matching Contacts - {previewSegment.name}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Dynamic segment membership is determined by rules.</p></div><button type="button" onClick={() => setPreviewSegment(null)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button></div>
            <div className="overflow-x-auto"><table className="min-w-[760px] w-full border-collapse text-left text-[12px]"><thead><tr className="text-[#536173]"><th className="py-2">Contact</th><th>Type</th><th>Email</th><th>Purchase Value</th><th>Last Purchase</th><th>Status</th><th>Actions</th></tr></thead><tbody>{contacts.length === 0 ? <tr className="border-t border-[#edf2f7]"><td colSpan={7} className="py-8 text-center text-[#536173]">No contacts match this segment yet.</td></tr> : contacts.slice(0, 3).map((contact) => <tr key={contact.id} className="border-t border-[#edf2f7]"><td className="py-3 font-bold text-blue-800">{contact.firstName} {contact.lastName}</td><td>{contact.type}</td><td>{contact.email}</td><td>Rs {number(contact.totalPurchase)}</td><td>{contact.lastPurchase ? fmtDate(contact.lastPurchase) : '-'}</td><td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(contact.status)}`}>{contact.status}</span></td><td><button type="button" onClick={() => setSelectedContact(contact)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 font-bold text-blue-700">View Contact</button></td></tr>)}</tbody></table></div>
            <div className="mt-4 flex flex-wrap gap-2">{['Export', 'Add Tag', 'Remove from Static Segment'].map((label) => <button key={label} type="button" onClick={() => setNotice(`${label} action queued.`)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700">{label}</button>)}</div>
          </div>
        </div>
      )}

      {showTemplateBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={saveTemplate}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-[17px] font-black text-[#071936]">{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
                <p className="m-0 mt-1 text-[12px] text-[#536173]">Visual email builder with GoBook variables and ERP blocks.</p>
              </div>
              <button type="button" onClick={() => setShowTemplateBuilder(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-4">
              <label className="text-[12px] font-bold text-[#536173]">Template Name *
                <input required className="mt-1 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={templateDraft.name} onChange={(e) => updateTemplateDraft('name', e.target.value)} />
              </label>
              <label className="text-[12px] font-bold text-[#536173]">Category *
                <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={templateDraft.category} onChange={(e) => updateTemplateDraft('category', e.target.value)}>
                  {TEMPLATE_CATEGORIES.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="text-[12px] font-bold text-[#536173]">Tags
                <input className="mt-1 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Festival, Discount, Retail" value={templateDraft.tags} onChange={(e) => updateTemplateDraft('tags', e.target.value)} />
              </label>
              <label className="text-[12px] font-bold text-[#536173]">Preview
                <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={templateDraft.previewMode} onChange={(e) => updateTemplateDraft('previewMode', e.target.value)}>
                  {['Desktop', 'Mobile'].map((mode) => <option key={mode}>{mode}</option>)}
                </select>
              </label>
              <label className="lg:col-span-4 text-[12px] font-bold text-[#536173]">Description
                <textarea className="mt-1 min-h-20 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={templateDraft.description} onChange={(e) => updateTemplateDraft('description', e.target.value)} />
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Content Blocks</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {EMAIL_BLOCKS.map((block) => <button key={block} type="button" className="rounded-md border border-[#edf2f7] bg-[#fbfdff] px-2 py-2 text-[11px] font-bold text-[#0f2f5f] hover:bg-blue-50">{block}</button>)}
                  </div>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">GoBook ERP Blocks</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ERP_BLOCKS.map((block) => <button key={block} type="button" className="rounded-md border border-[#edf2f7] bg-[#fbfdff] px-2 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-50">{block}</button>)}
                  </div>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Insert Variable</h4>
                  <div className="max-h-56 overflow-y-auto text-[12px]">
                    {Object.entries(TEMPLATE_VARIABLES).map(([group, items]) => (
                      <div key={group} className="mb-3">
                        <strong className="text-[#071936]">{group}</strong>
                        {items.map((item) => {
                          const token = `{{${group.toLowerCase()}.${item.toLowerCase().replaceAll(' ', '_')}}}`;
                          return <button key={item} type="button" onClick={() => updateTemplateDraft('description', `${templateDraft.description} ${token}`.trim())} className="block w-full border-0 bg-white px-0 py-1 text-left text-[12px] text-[#536173] hover:text-blue-700">{item}</button>;
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-lg border border-[#dbe4ef] p-4">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">AI Assistant</h4>
                  <textarea className="min-h-20 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Create a professional promotional email for a selected customer segment." value={templateDraft.aiPrompt} onChange={(e) => updateTemplateDraft('aiPrompt', e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Generate', 'Regenerate', 'Improve', 'Make Professional', 'Make Shorter', 'Generate CTA', 'Generate Subject Lines'].map((action) => (
                      <button key={action} type="button" onClick={generateTemplateContent} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-violet-700 hover:bg-violet-50">{action}</button>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-4">
                  <div className="mb-3 grid gap-3 md:grid-cols-2">
                    <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Subject" value={templateDraft.subject} onChange={(e) => updateTemplateDraft('subject', e.target.value)} />
                    <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Preview text" value={templateDraft.previewText} onChange={(e) => updateTemplateDraft('previewText', e.target.value)} />
                  </div>
                  <div className={`mx-auto rounded-lg border border-[#dbe4ef] bg-white shadow-sm ${templateDraft.previewMode === 'Mobile' ? 'max-w-[320px]' : 'max-w-[620px]'}`}>
                    <div className="border-b border-[#edf2f7] p-4 text-center text-[12px] font-black text-[#071936]">LOGO</div>
                    <div className="p-6 text-center">
                      <h2 className="m-0 text-[22px] font-black text-[#071936]">{templateDraft.subject || 'Big Heading'}</h2>
                      <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-[#536173]">{templateDraft.description || 'Description with customer and ERP variables appears here.'}</p>
                      <button type="button" className="mt-4 rounded-md border-0 px-5 py-2 text-[12px] font-black text-white" style={{ background: templateDraft.primaryColor }}>SHOP NOW</button>
                    </div>
                    <div className="grid gap-2 border-y border-[#edf2f7] p-4" style={{ gridTemplateColumns: `repeat(${templateDraft.columns}, minmax(0, 1fr))` }}>
                      {Array.from({ length: Number(templateDraft.columns) }).map((_, index) => <div key={index} className="rounded-md bg-[#f7faff] p-3 text-center text-[11px] font-bold text-[#536173]">Product</div>)}
                    </div>
                    <div className="p-4 text-center text-[11px] text-[#536173]">Footer - Company address, social links and website</div>
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Brand Style</h4>
                  <label className="mb-2 block text-[12px] font-bold text-[#536173]">Primary Color <input type="color" className="ml-2 align-middle" value={templateDraft.primaryColor} onChange={(e) => updateTemplateDraft('primaryColor', e.target.value)} /></label>
                  <label className="mb-2 block text-[12px] font-bold text-[#536173]">Secondary Color <input type="color" className="ml-2 align-middle" value={templateDraft.secondaryColor} onChange={(e) => updateTemplateDraft('secondaryColor', e.target.value)} /></label>
                  <label className="mb-2 block text-[12px] font-bold text-[#536173]">Font <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]" value={templateDraft.font} onChange={(e) => updateTemplateDraft('font', e.target.value)}>{['Inter', 'Arial', 'Georgia', 'Roboto'].map((font) => <option key={font}>{font}</option>)}</select></label>
                  <label className="mb-2 block text-[12px] font-bold text-[#536173]">Columns <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px]" value={templateDraft.columns} onChange={(e) => updateTemplateDraft('columns', e.target.value)}>{['1', '2', '3', '4'].map((column) => <option key={column}>{column}</option>)}</select></label>
                  <button type="button" onClick={() => setNotice('Company GoBook branding applied to the template preview.')} className="mt-2 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Use Brand Style</button>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Preview Variables</h4>
                  <div className="space-y-1 text-[12px] text-[#536173]">
                    <div><strong>Customer:</strong> {'{{customer.name}}'}</div>
                    <div><strong>Invoice:</strong> {'{{invoice.number}}'}</div>
                    <div><strong>Total:</strong> {'{{invoice.total}}'}</div>
                  </div>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Send Test Email</h4>
                  <input className="mb-2 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="example@gmail.com" value={templateDraft.testEmail} onChange={(e) => updateTemplateDraft('testEmail', e.target.value)} />
                  <button type="button" onClick={() => setNotice('Template test email queued with sample customer data.')} className="w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Send Test</button>
                </section>

                <section className="rounded-lg border border-[#dbe4ef] p-3">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Versions</h4>
                  <div className="py-4 text-center text-[12px] text-[#536173]">Version history starts after this template is saved.</div>
                </section>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowTemplateBuilder(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">Save Template</button>
            </div>
          </form>
        </div>
      )}

      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={saveContact}>
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="m-0 text-[17px] font-black text-[#071936]">{contactForm.id ? 'Edit Contact' : 'Add Contact'}</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Consent is managed separately from contact type.</p></div>
              <button type="button" onClick={() => setShowContactForm(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="First Name *" value={contactForm.firstName} onChange={(e) => updateContactForm('firstName', e.target.value)} />
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Last Name" value={contactForm.lastName} onChange={(e) => updateContactForm('lastName', e.target.value)} />
              <input required className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Email Address *" value={contactForm.email} onChange={(e) => updateContactForm('email', e.target.value)} />
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Phone Number" value={contactForm.phone} onChange={(e) => updateContactForm('phone', e.target.value)} />
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Company Name" value={contactForm.company} onChange={(e) => updateContactForm('company', e.target.value)} />
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={contactForm.type} onChange={(e) => updateContactForm('type', e.target.value)}>{CONTACT_TYPES.filter((type) => type !== 'All Types').map((type) => <option key={type}>{type}</option>)}</select>
              <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={contactForm.source} onChange={(e) => updateContactForm('source', e.target.value)}>{CONTACT_SOURCES.filter((source) => source !== 'All Sources').map((source) => <option key={source}>{source}</option>)}</select>
              <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Tags: VIP, Retail" value={contactForm.tags} onChange={(e) => updateContactForm('tags', e.target.value)} />
            </div>
            <div className="mt-4 rounded-lg border border-[#edf2f7] p-4">
              <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Marketing Email Consent</h4>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={contactForm.status} onChange={(e) => updateContactForm('status', e.target.value)}>{CONTACT_STATUSES.filter((status) => status !== 'All Status').map((status) => <option key={status}>{status}</option>)}</select>
                <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Consent Source" value={contactForm.consentSource} onChange={(e) => updateContactForm('consentSource', e.target.value)} />
                <input type="date" className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={contactForm.consentDate} onChange={(e) => updateContactForm('consentDate', e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowContactForm(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">Save Contact</button>
            </div>
          </form>
        </div>
      )}

      {showImportContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="m-0 text-[17px] font-black text-[#071936]">Import Contacts</h3><p className="m-0 mt-1 text-[12px] text-[#536173]">Upload, map, validate, review duplicates, then import.</p></div><button type="button" onClick={() => setShowImportContacts(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button></div>
            <div className="mb-4 grid gap-3 md:grid-cols-5">{['Upload File', 'Map Columns', 'Validate Data', 'Review Duplicates', 'Import Contacts'].map((step, index) => <div key={step} className="rounded-md border border-[#dbe4ef] bg-[#fbfdff] p-3 text-center text-[12px] font-black text-[#0f2f5f]">{index + 1}. {step}</div>)}</div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Import Options</h4>{['Upload CSV', 'Upload Excel', 'Import GoBook Customers', 'Import CRM Leads', 'Import from another system'].map((item) => <button key={item} type="button" className="mb-2 block w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-left text-[12px] font-bold text-blue-700 hover:bg-blue-50">{item}</button>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Validation Results</h4>{[['Total Rows', 2500], ['Valid Contacts', 2350], ['Duplicate Emails', 95], ['Invalid Emails', 35], ['Missing Email', 20]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span>{label}</span><strong>{number(value)}</strong></div>)}<div className="mt-3 flex flex-wrap gap-2">{['Download error report', 'Skip duplicates', 'Update existing contacts', 'Import only valid contacts'].map((label) => <button key={label} type="button" className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">{label}</button>)}</div></div>
            </div>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#edf2f7] bg-[#fbfdff] p-4">
              <div><h3 className="m-0 text-[20px] font-black text-[#071936]">{selectedContact.firstName} {selectedContact.lastName}</h3><p className="m-0 mt-1 text-[13px] text-[#536173]">{selectedContact.email}</p><p className="m-0 mt-1 text-[12px] text-[#536173]">Customer ID: {selectedContact.customerId}</p></div>
              <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[12px] font-bold ${statusBadgeClass(selectedContact.status)}`}>{selectedContact.status}</span><button type="button" onClick={() => openAddContact(selectedContact)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">Edit</button><button type="button" onClick={() => setNotice('Test email queued for this contact.')} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700">Send Test</button><button type="button" onClick={() => setSelectedContact(null)} className="rounded-md border border-[#dbe4ef] bg-white px-3 py-1.5 text-[12px] font-bold text-[#536173]">Close</button></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Overview</h4>{[['Phone', selectedContact.phone], ['Company', selectedContact.company], ['Contact type', selectedContact.type], ['Source', selectedContact.source], ['Tags', selectedContact.tags.join(', ')], ['Created date', fmtDate(selectedContact.addedOn)]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Purchases</h4>{[['Total purchase value', `Rs ${number(selectedContact.totalPurchase)}`], ['Number of orders', selectedContact.orders], ['Last purchase', selectedContact.lastPurchase ? fmtDate(selectedContact.lastPurchase) : '-'], ['Most purchased products', 'Retail items']].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Campaign Activity</h4>{[['Campaigns received', '8'], ['Emails opened', '5'], ['Links clicked', '2'], ['Last interaction', selectedContact.engagement]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
              <div className="rounded-lg border border-[#edf2f7] p-4"><h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Consent</h4>{[['Marketing consent', selectedContact.status], ['Consent source', selectedContact.consentSource], ['Consent date', fmtDate(selectedContact.consentDate)], ['Unsubscribe history', selectedContact.status === 'Unsubscribed' ? 'Opted out' : '-']].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#edf2f7] py-2 text-[12px]"><span className="text-[#536173]">{label}</span><strong className="text-[#071936]">{value}</strong></div>)}</div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={handleSubmit}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="m-0 text-[17px] font-black text-[#071936]">{editingId ? 'Edit Campaign' : 'Create Campaign'}</h3>
                <p className="m-0 mt-1 text-[12px] text-[#536173]">{WIZARD_STEPS[wizardStep]}</p>
              </div>
              <button type="button" onClick={resetForm} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>

            <div className="mb-5 grid grid-cols-5 gap-2">
              {WIZARD_STEPS.map((step, index) => (
                <button key={step} type="button" onClick={() => setWizardStep(index)} className={`min-h-12 rounded-md border px-2 text-[11px] font-black ${wizardStep === index ? 'border-blue-600 bg-blue-50 text-blue-700' : index < wizardStep ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#dbe4ef] bg-white text-[#536173]'}`}>
                  <span className="block text-[10px]">0{index + 1}</span>{step}
                </button>
              ))}
            </div>

            {wizardStep === 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-[12px] font-bold text-[#536173]">Campaign Name *
                  <input className="mt-1 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" required value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
                </label>
                <label className="text-[12px] font-bold text-[#536173]">Campaign Type *
                  <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={form.campaignType} onChange={(e) => updateForm('campaignType', e.target.value)}>
                    {CAMPAIGN_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="md:col-span-2 text-[12px] font-bold text-[#536173]">Description
                  <textarea className="mt-1 min-h-20 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
                </label>
                <label className="md:col-span-2 text-[12px] font-bold text-[#536173]">Tags
                  <input className="mt-1 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="festival, vip, retention" value={form.tags} onChange={(e) => updateForm('tags', e.target.value)} />
                </label>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-5">
                  {['All Contacts', 'Customers', 'Leads', 'Segment', 'Custom Audience'].map((audience) => (
                    <label key={audience} className={`rounded-md border p-3 text-[12px] font-bold ${form.audienceType === audience ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#dbe4ef] text-[#0f2f5f]'}`}>
                      <input type="radio" className="mr-2 accent-blue-600" checked={form.audienceType === audience} onChange={() => updateForm('audienceType', audience)} />{audience}
                    </label>
                  ))}
                </div>
                <label className="block text-[12px] font-bold text-[#536173]">Customer Segment
                  <select className="mt-1 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={form.audienceName} onChange={(e) => updateForm('audienceName', e.target.value)}>
                    {AUDIENCES.filter((item) => item !== 'All Audiences').map((audience) => <option key={audience}>{audience}</option>)}
                  </select>
                </label>
                <div className="rounded-md border border-[#edf2f7] bg-[#fbfdff] p-4 text-[12px] text-[#536173]">
                  <strong className="block text-[20px] text-[#071936]">{number(campaignRecipients({ recipients: form.recipientsText.split(/[\n,]/).filter(Boolean) }))} contacts</strong>
                  <span className="mt-2 block text-emerald-700">2,810 valid emails</span>
                  <span className="mt-1 block text-amber-700">35 unsubscribed or bounced contacts excluded</span>
                </div>
                <textarea className="min-h-28 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Optional manual recipients: one email per line, or comma-separated" value={form.recipientsText} onChange={(e) => updateForm('recipientsText', e.target.value)} />
              </div>
            )}

            {wizardStep === 2 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="From Name" value={form.fromName} onChange={(e) => updateForm('fromName', e.target.value)} />
                <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="From Email" value={form.fromEmail} onChange={(e) => updateForm('fromEmail', e.target.value)} />
                <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Subject" value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} />
                <input className="rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Preview Text" value={form.previewText} onChange={(e) => updateForm('previewText', e.target.value)} />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setForm((current) => ({ ...current, subject: current.subject || 'Your update from GoBook', body: current.body || 'Hi {{customer_name}},\\n\\n' }))} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Choose Template</button>
                  <button type="button" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Open Email Builder</button>
                  <button type="button" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-violet-700 hover:bg-violet-50">AI Generate Email</button>
                </div>
                <textarea className="md:col-span-2 min-h-40 rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Email body / template" value={form.body} onChange={(e) => updateForm('body', e.target.value)} />
              </div>
            )}

            {wizardStep === 3 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-[#edf2f7] p-4">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Tracking</h4>
                  {[
                    ['openTracking', 'Open Tracking'],
                    ['clickTracking', 'Click Tracking'],
                    ['utmTracking', 'UTM Tracking'],
                  ].map(([key, label]) => (
                    <label key={key} className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#0f2f5f]"><input type="checkbox" className="accent-blue-600" checked={form[key]} onChange={(e) => updateForm(key, e.target.checked)} />{label}</label>
                  ))}
                </div>
                <div className="rounded-md border border-[#edf2f7] p-4">
                  <h4 className="m-0 mb-3 text-[13px] font-black text-[#071936]">Delivery</h4>
                  {['Send Now', 'Schedule'].map((mode) => (
                    <label key={mode} className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#0f2f5f]"><input type="radio" className="accent-blue-600" checked={form.sendMode === mode} onChange={() => updateForm('sendMode', mode)} />{mode}</label>
                  ))}
                  <input type="datetime-local" className="mt-1 block rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" value={form.scheduledAt} onChange={(e) => updateForm('scheduledAt', e.target.value)} />
                  <p className="m-0 mt-2 text-[12px] text-[#536173]">Timezone: IST</p>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="rounded-md border border-[#edf2f7] bg-[#fbfdff] p-4 text-[13px]">
                {[
                  ['Campaign', form.name || '-'],
                  ['From', `${form.fromName} <${form.fromEmail}>`],
                  ['Audience', form.audienceName],
                  ['Recipients', number(campaignRecipients({ recipients: form.recipientsText.split(/[\n,]/).filter(Boolean) }))],
                  ['Subject', form.subject || '-'],
                  ['Schedule', form.sendMode === 'Schedule' && form.scheduledAt ? fmtDateTime(form.scheduledAt) : 'Send now'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[130px_1fr] gap-3 border-b border-[#edf2f7] py-3 last:border-b-0">
                    <strong className="text-[#536173]">{label}</strong>
                    <span className="font-bold text-[#071936]">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setWizardStep((step) => Math.max(0, step - 1))} disabled={wizardStep === 0} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50 disabled:opacity-40">Back</button>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setNotice('Test email preview is ready for SMTP integration.')} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Send Test</button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button type="button" onClick={() => setWizardStep((step) => Math.min(WIZARD_STEPS.length - 1, step + 1))} className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">Next</button>
                ) : (
                  <>
                    <button type="submit" data-submit-mode="draft" className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-blue-700 hover:bg-blue-50">Save Draft</button>
                    <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">{form.sendMode === 'Schedule' ? 'Schedule Campaign' : 'Send Campaign'}</button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-md rounded-xl border border-[#dfe7f1] bg-white p-5 shadow-2xl" onSubmit={createList}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[17px] font-black text-[#071936]">Create Email List</h3>
              <button type="button" onClick={() => setShowListForm(false)} className="border-0 bg-transparent text-[#536173] hover:text-[#071936]"><XCircle size={20} /></button>
            </div>
            <input className="mb-3 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="List name *" required value={listForm.name} onChange={(e) => updateListForm('name', e.target.value)} />
            <input className="mb-5 w-full rounded-md border border-[#dbe4ef] px-3 py-2 text-[13px] outline-none focus:border-blue-500" placeholder="Contacts count" type="number" min="0" value={listForm.contacts} onChange={(e) => updateListForm('contacts', e.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowListForm(false)} className="rounded-md border border-[#dbe4ef] bg-white px-4 py-2 text-[13px] font-bold text-[#536173] hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md border-0 bg-blue-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-blue-700">Create List</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
