import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Library';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/library/books', title: 'Books', fields: [
      { key: 'bookTitle', label: 'Book Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'category', label: 'Category' },
      { key: 'totalCopies', label: 'Total Copies', type: 'number' },
    ],
  },
  {
    path: '/school/library/categories', title: 'Categories', fields: [
      { key: 'categoryName', label: 'Category Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    path: '/school/library/issue-return', title: 'Issue / Return', fields: [
      { key: 'bookTitle', label: 'Book Title', required: true },
      { key: 'studentName', label: 'Student Name' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'returnDate', label: 'Return Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Returned', 'Overdue'] },
    ],
  },
  {
    path: '/school/library/members', title: 'Members', fields: [
      { key: 'memberName', label: 'Member Name', required: true },
      { key: 'memberType', label: 'Member Type', type: 'select', options: ['Student', 'Teacher', 'Staff'] },
      { key: 'className', label: 'Class' },
      { key: 'membershipDate', label: 'Membership Date', type: 'date' },
    ],
  },
  {
    path: '/school/library/fines', title: 'Fines', fields: [
      { key: 'memberName', label: 'Member Name', required: true },
      { key: 'bookTitle', label: 'Book Title' },
      { key: 'fineAmount', label: 'Fine Amount', type: 'number' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'] },
    ],
  },
];

export const libraryRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
