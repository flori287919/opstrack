import type { Dictionary } from '../../dictionaries'
import type { InvoiceFormDict } from './InvoiceForm'

export function invoiceFormDict(t: Dictionary): InvoiceFormDict {
  return {
    sectionProject: t.invoices.sectionProject,
    sectionId: t.invoices.sectionId,
    sectionDates: t.invoices.sectionDates,
    sectionAmount: t.invoices.sectionAmount,
    sectionNotes: t.invoices.sectionNotes,
    project: t.invoices.project,
    selectProject: t.invoices.selectProject,
    invoiceNumber: t.invoices.invoiceNumber,
    deliverable: t.invoices.deliverable,
    selectDeliverableFirst: t.invoices.selectDeliverableFirst,
    noDeliverable: t.invoices.noDeliverable,
    deliverableEmpty: t.invoices.deliverableEmpty,
    plannedIssueDate: t.invoices.plannedIssueDate,
    actualIssueDate: t.invoices.actualIssueDate,
    plannedCollectionDate: t.invoices.plannedCollectionDate,
    expectedCollectionDate: t.invoices.expectedCollectionDate,
    collectionDate: t.invoices.collectionDate,
    amountNoVat: t.invoices.amountNoVat,
    status: t.common.status,
  }
}
