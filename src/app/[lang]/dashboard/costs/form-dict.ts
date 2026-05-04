import type { Dictionary } from '../../dictionaries'
import type { CostContractFormDict } from './CostContractForm'

export function costContractFormDict(t: Dictionary): CostContractFormDict {
  return {
    sectionProject: t.costs.sectionProject,
    sectionSubco: t.costs.sectionSubco,
    sectionValues: t.costs.sectionValues,
    sectionTerms: t.costs.sectionTerms,
    sectionNotes: t.costs.sectionNotes,
    project: t.invoices.project,
    selectProject: t.costs.selectProject,
    subco: t.costs.subcontractor,
    contractName: t.costs.contractName,
    modality: t.costs.modality,
    status: t.common.status,
    valueNoTaxes: t.costs.valueNoTaxes,
    valueWithTaxes: t.costs.valueWithTaxes,
    taxLabel: t.costs.taxLabel,
    whtApplicable: t.costs.whtApplicable,
    whtValue: t.costs.whtValue,
    paymentDays: t.costs.subcoPaymentDays,
    paymentCondition: t.costs.paymentCondition,
    selectPlaceholder: t.common.select,
  }
}
