const MONEY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function money(value) {
  return MONEY.format(value);
}

const CATEGORY_DASHBOARDS = {
  hotel: {
    title: 'Hotel Dashboard',
    subtitle: "Here's the current snapshot of occupancy, arrivals, departures, and revenue.",
    primaryChartTitle: 'Occupancy Trend',
    donutTitle: 'Room Revenue Mix',
    listTitle: 'Today At A Glance',
    secondaryCardTitle: 'ADR / RevPAR',
    inventoryTitle: 'Room Inventory',
    scoreTitle: 'Service Health Score',
    metrics: [
      { label: 'Occupancy %', value: '78%', trend: '+6% vs yesterday', hash: '#/hotel/dashboard/occupancy' },
      { label: "Today's Arrivals", value: '24', trend: '8 VIP arrivals', hash: '#/hotel/dashboard/arrivals' },
      { label: "Today's Departures", value: '18', trend: '12 checked out', hash: '#/hotel/dashboard/departures' },
      { label: 'Revenue', value: money(486000), trend: '+12% vs last week', hash: '#/hotel/dashboard/revenue' },
      { label: 'ADR / RevPAR', value: `${money(6200)} / ${money(4836)}`, trend: 'ADR up 4%', hash: '#/hotel/dashboard/adr-revpar' },
    ],
    trend: [
      { label: 'Mon', total: 68 }, { label: 'Tue', total: 72 }, { label: 'Wed', total: 75 },
      { label: 'Thu', total: 78 }, { label: 'Fri', total: 84 }, { label: 'Sat', total: 91 }, { label: 'Sun', total: 78 },
    ],
    donut: { paid: 286000, pending: 138000, overdue: 62000 },
    list: [
      { name: 'Checked-in guests', total: 112 },
      { name: 'Rooms available', total: 32 },
      { name: 'Housekeeping pending', total: 14 },
    ],
    secondary: [
      { label: 'ADR', value: money(6200), color: '#2563eb', bg: '#eff6ff' },
      { label: 'RevPAR', value: money(4836), color: '#16a34a', bg: '#f0fdf4' },
      { label: 'Room revenue', value: money(392000), color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'F&B revenue', value: money(94000), color: '#d97706', bg: '#fffbeb' },
    ],
    inventory: { total: 148, inStock: 116, lowStock: 18, outOfStock: 14 },
    score: { score: 84, growthPct: 7 },
  },
  construction: {
    title: 'Construction Dashboard',
    subtitle: 'Track active projects, site progress, material cost, and pending bills.',
    primaryChartTitle: 'Site Progress',
    donutTitle: 'Pending Bills Split',
    listTitle: 'Active Projects',
    secondaryCardTitle: 'Project Controls',
    inventoryTitle: 'Materials Snapshot',
    scoreTitle: 'Execution Score',
    metrics: [
      { label: 'Active Projects', value: '12', trend: '4 high priority', hash: '#/construction/dashboard/active-projects' },
      { label: 'Site Progress', value: '64%', trend: '+9% this month', hash: '#/construction/dashboard/site-progress' },
      { label: 'Material Cost', value: money(1860000), trend: '7% over plan', hash: '#/construction/dashboard/material-cost' },
      { label: 'Pending Bills', value: money(742000), trend: '18 bills pending', hash: '#/construction/dashboard/pending-bills' },
    ],
    trend: [
      { label: 'W1', total: 42 }, { label: 'W2', total: 48 }, { label: 'W3', total: 53 },
      { label: 'W4', total: 58 }, { label: 'W5', total: 64 },
    ],
    donut: { paid: 1240000, pending: 742000, overdue: 218000 },
    list: [
      { name: 'Metro Mall Fitout', total: 82 },
      { name: 'Lakeview Villas', total: 67 },
      { name: 'Warehouse Phase 2', total: 54 },
    ],
    secondary: [
      { label: 'BOQs open', value: 9, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Work orders', value: 31, color: '#16a34a', bg: '#f0fdf4' },
      { label: 'Milestones due', value: 6, color: '#d97706', bg: '#fffbeb' },
      { label: 'RA bills', value: 11, color: '#7c3aed', bg: '#f5f3ff' },
    ],
    inventory: { total: 426, inStock: 338, lowStock: 64, outOfStock: 24 },
    score: { score: 71, growthPct: 5 },
  },
  ngo: {
    title: 'NGO Dashboard',
    subtitle: 'Monitor donations, campaigns, beneficiaries served, and volunteer activity.',
    primaryChartTitle: 'Donation Trend',
    donutTitle: 'Donation Status',
    listTitle: 'Campaign Impact',
    secondaryCardTitle: 'Volunteer Activity',
    inventoryTitle: 'Beneficiary Coverage',
    scoreTitle: 'Impact Score',
    metrics: [
      { label: 'Total Donations', value: money(965000), trend: '+18% this month', hash: '#/ngo/dashboard/total-donations' },
      { label: 'Active Campaigns', value: '7', trend: '3 ending soon', hash: '#/ngo/dashboard/active-campaigns' },
      { label: 'Beneficiaries Served', value: '1,284', trend: '+142 this month', hash: '#/ngo/dashboard/beneficiaries-served' },
      { label: 'Volunteers', value: '86', trend: '23 active today', hash: '#/ngo/dashboard/volunteers' },
    ],
    trend: [
      { label: 'Jan', total: 120000 }, { label: 'Feb', total: 158000 }, { label: 'Mar', total: 142000 },
      { label: 'Apr', total: 176000 }, { label: 'May', total: 212000 }, { label: 'Jun', total: 157000 },
    ],
    donut: { paid: 728000, pending: 182000, overdue: 55000 },
    list: [
      { name: 'Food support drive', total: 486 },
      { name: 'Education kits', total: 312 },
      { name: 'Health camp', total: 224 },
    ],
    secondary: [
      { label: 'Assignments', value: 34, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Certificates', value: 19, color: '#16a34a', bg: '#f0fdf4' },
      { label: 'Field visits', value: 12, color: '#d97706', bg: '#fffbeb' },
      { label: 'Open tasks', value: 8, color: '#7c3aed', bg: '#f5f3ff' },
    ],
    inventory: { total: 1284, inStock: 1036, lowStock: 182, outOfStock: 66 },
    score: { score: 88, growthPct: 14 },
  },
  automobile: {
    title: 'Automobile Dashboard',
    subtitle: "Track today's job cards, service bay load, revenue, and pending deliveries.",
    primaryChartTitle: 'Job Card Trend',
    donutTitle: 'Service Revenue Split',
    listTitle: 'Vehicles In Service',
    secondaryCardTitle: 'Service Operations',
    inventoryTitle: 'Spare Parts Snapshot',
    scoreTitle: 'Workshop Health Score',
    metrics: [
      { label: "Today's Job Cards", value: '38', trend: '12 new this morning', hash: '#/automobile/dashboard/job-cards' },
      { label: 'Vehicles In Service', value: '27', trend: '9 awaiting parts', hash: '#/automobile/dashboard/vehicles-in-service' },
      { label: 'Revenue', value: money(318000), trend: '+11% vs yesterday', hash: '#/automobile/dashboard/revenue' },
      { label: 'Pending Delivery', value: '14', trend: '5 ready for pickup', hash: '#/automobile/dashboard/pending-delivery' },
    ],
    trend: [
      { label: 'Mon', total: 24 }, { label: 'Tue', total: 31 }, { label: 'Wed', total: 29 },
      { label: 'Thu', total: 34 }, { label: 'Fri', total: 38 }, { label: 'Sat', total: 42 },
    ],
    donut: { paid: 186000, pending: 96000, overdue: 36000 },
    list: [
      { name: 'General service', total: 11 },
      { name: 'Body repair', total: 7 },
      { name: 'Insurance claim', total: 5 },
    ],
    secondary: [
      { label: 'Technicians assigned', value: 18, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Estimates pending', value: 9, color: '#d97706', bg: '#fffbeb' },
      { label: 'Road tests', value: 6, color: '#16a34a', bg: '#f0fdf4' },
      { label: 'Approval links sent', value: 13, color: '#7c3aed', bg: '#f5f3ff' },
    ],
    inventory: { total: 620, inStock: 514, lowStock: 72, outOfStock: 34 },
    score: { score: 79, growthPct: 8 },
  },
};

export function getCategoryDashboard(category) {
  return CATEGORY_DASHBOARDS[category] || null;
}
