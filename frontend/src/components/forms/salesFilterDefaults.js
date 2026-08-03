// Shared default filter state for SalesFilterBar.jsx, split into its own
// module so that file only exports the component (keeps Fast Refresh happy).
export const EMPTY_SALES_FILTERS = {
  paymentMethod: '', paymentStatus: '', customer: '', city: '', state: '',
  gstType: '', supplyType: '', amountMin: '', amountMax: '', itemType: '',
  hsn: '', productName: '', barcode: '', irnStatus: '', ewbStatus: '',
};
