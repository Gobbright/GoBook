import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Library';
const CATEGORY = 'School';

const ITEMS = [
  {
    path: '/school/library', title: 'Library', fields: [
      { key: 'bookTitle', label: 'Book Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Issued'] },
    ],
  },
  {
    path: '/school/library/books', title: 'Books', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'category', label: 'Category' },
      { key: 'copiesAvailable', label: 'Copies Available', type: 'number' },
    ],
  },
  {
    path: '/school/library/issue-return', title: 'Issue / Return', fields: [
      { key: 'bookTitle', label: 'Book Title', required: true },
      { key: 'studentName', label: 'Student Name' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'returnDate', label: 'Return Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Returned'] },
    ],
  },
  {
    path: '/school/library/fine', title: 'Fine', fields: [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'bookTitle', label: 'Book Title' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid'] },
    ],
  },
  {
    path: '/school/library/catalogue', title: 'Catalogue', fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'author', label: 'Author' },
      { key: 'category', label: 'Category' },
      { key: 'shelfNumber', label: 'Shelf Number' },
    ],
  },
];

export const libraryRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));
