import type { Dictionary } from '../../dictionaries'
import type { ProjectFormDict } from './ProjectForm'

export function projectFormDict(t: Dictionary): ProjectFormDict {
  return {
    sectionIdentifiers: t.projects.sectionIdentifiers,
    sectionClient: t.projects.sectionClient,
    sectionDates: t.projects.sectionDates,
    sectionContract: t.projects.sectionContract,
    sectionValue: t.projects.sectionValue,
    sectionNotes: t.projects.sectionNotes,
    code: t.projects.code,
    name: t.projects.name,
    businessLine: t.projects.businessLine,
    projectManager: t.projects.projectManager,
    client: t.projects.client,
    beneficiary: t.projects.beneficiary,
    contractStart: t.projects.contractStart,
    contractEnd: t.projects.contractEnd,
    projectStart: t.projects.projectStart,
    plannedEnd: t.projects.plannedEnd,
    modality: t.projects.modality,
    approvalForm: t.projects.approvalForm,
    charter: t.projects.charter,
    approvedCostSheets: t.projects.approvedCostSheets,
    valueNoVat: t.projects.valueNoVat,
    submissionMargin: t.projects.submissionMargin,
    clientPaymentDays: t.projects.clientPaymentDays,
    paymentTermsCondition: t.projects.paymentTermsCondition,
    addNew: t.projects.addNew,
    selectPlaceholder: t.common.select,
    yes: t.common.yes,
    no: t.common.no,
    pending: t.common.pending,
  }
}
