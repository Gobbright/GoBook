import { BooksPage } from './BooksPage.jsx';
import { IssueReturnPage } from './IssueReturnPage.jsx';
import { FinePage } from './FinePage.jsx';
import { CataloguePage } from './CataloguePage.jsx';

export const libraryRoutes = [
  { path: '/school/library/books', element: <BooksPage /> },
  { path: '/school/library/issue-return', element: <IssueReturnPage /> },
  { path: '/school/library/fine', element: <FinePage /> },
  { path: '/school/library/catalogue', element: <CataloguePage /> },
];
