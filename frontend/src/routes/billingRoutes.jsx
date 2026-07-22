import { useParams } from 'react-router-dom';

import { CreditNotePage } from '../features/categories/retail/modules/sales/CreditNotePage.jsx';
import { BillOfSupplyPage } from '../features/categories/retail/modules/sales/BillOfSupplyPage.jsx';
import { DebitNotePage } from '../features/categories/retail/modules/sales/DebitNotePage.jsx';
import { DeliveryChallanPage } from '../features/categories/retail/modules/sales/DeliveryChallanPage.jsx';
import { EInvoicePage } from '../features/categories/retail/modules/sales/EInvoicePage.jsx';
import { EWayBillFormPage, EWayBillPage } from '../features/categories/retail/modules/sales/EWayBillPage.jsx';
import { InvoicePage } from '../features/categories/retail/modules/sales/InvoicePage.jsx';
import { PurchaseEntryPage } from '../features/categories/retail/modules/sales/PurchaseEntryPage.jsx';
import { PurchaseOrderPage } from '../features/categories/retail/modules/sales/PurchaseOrderPage.jsx';
import { QuotationPage } from '../features/categories/retail/modules/sales/QuotationPage.jsx';
import { ReceivablesPage } from '../features/categories/retail/modules/sales/ReceivablesPage.jsx';
import { SalesReturnPage } from '../features/categories/retail/modules/sales/SalesReturnPage.jsx';
import { SupplierReturnPage } from '../features/categories/retail/modules/sales/SupplierReturnPage.jsx';
import { documentConfigs } from '../features/categories/retail/modules/sales/documentConfigs.js';
import { CreateDocumentPage } from '../features/categories/retail/modules/sales/shared/CreateDocumentPage.jsx';
import { InvoiceViewPage } from '../features/categories/retail/modules/sales/shared/InvoiceViewPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';

export function InvoiceEditRoute({ documentType }) {
  const { id } = useParams();
  return <CreateDocumentPage documentType={documentType} invoiceId={id} />;
}

export function InvoiceViewRoute({ documentType }) {
  const { id } = useParams();
  return <InvoiceViewPage invoiceId={id} documentType={documentType} />;
}

export function EWayBillEditRoute() {
  const { id } = useParams();
  return <EWayBillFormPage ewbId={id} />;
}

export function GenericBillingRoute() {
  const { documentType } = useParams();
  if (documentConfigs[documentType]) {
    return <CreateDocumentPage documentType={documentType} />;
  }
  return <DashboardPage />;
}

export const billingRoutes = [
  { slug: 'invoice', documentType: 'invoice', list: <InvoicePage />, form: <CreateDocumentPage documentType="invoice" /> },
  { slug: 'bill-of-supply', documentType: 'bill-of-supply', list: <BillOfSupplyPage />, form: <CreateDocumentPage documentType="bill-of-supply" /> },
  { slug: 'quotation', documentType: 'quotation', list: <QuotationPage />, form: <CreateDocumentPage documentType="quotation" /> },
  { slug: 'purchase-order', documentType: 'purchase-order', list: <PurchaseOrderPage />, form: <CreateDocumentPage documentType="purchase-order" /> },
  { slug: 'purchase-entry', documentType: 'purchase-entry', list: <PurchaseEntryPage />, form: <CreateDocumentPage documentType="purchase-entry" /> },
  { slug: 'credit-note', documentType: 'credit-note', list: <CreditNotePage />, form: <CreateDocumentPage documentType="credit-note" /> },
  { slug: 'debit-note', documentType: 'debit-note', list: <DebitNotePage />, form: <CreateDocumentPage documentType="debit-note" /> },
  { slug: 'sales-return', documentType: 'sales-return', list: <SalesReturnPage />, form: <CreateDocumentPage documentType="sales-return" /> },
  { slug: 'supplier-return', documentType: 'supplier-return', list: <SupplierReturnPage />, form: <CreateDocumentPage documentType="supplier-return" /> },
  { slug: 'delivery-challan', documentType: 'delivery-challan', list: <DeliveryChallanPage />, form: <CreateDocumentPage documentType="delivery-challan" /> },
  { slug: 'e-invoice', documentType: 'e-invoice', list: <EInvoicePage />, form: <CreateDocumentPage documentType="e-invoice" /> },
];

export const eWayBillRoutes = {
  list: <EWayBillPage />,
  form: <EWayBillFormPage />,
  edit: <EWayBillEditRoute />,
  view: <InvoiceViewRoute documentType="e-way-bill" />,
};

export const receivablesRoute = <ReceivablesPage />;
