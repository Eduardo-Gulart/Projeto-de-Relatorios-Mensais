import { optionById } from "./diagnostic-catalog";
export function guidanceForProblem(optionId: string) {
  return (
    optionById.get(optionId)?.action ||
    "Defina o encaminhamento deste ponto no campo Outro."
  );
}
export function monitoringForOption(optionId: string) {
  return optionById.get(optionId)?.kpi || "Definir indicador";
}
