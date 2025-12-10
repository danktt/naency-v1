/**
 * Gera cores para categorias baseado em um valor de gasto.
 * Começa com oklch(0.29 0.14 303) e vai clareando conforme menor o gasto.
 *
 * @param index - Índice da categoria (0 = maior gasto, maior índice = menor gasto)
 * @param total - Total de categorias
 * @returns String de cor no formato oklch
 */
export function getCategoryColor(index: number, total: number): string {
  // Cor base: oklch(0.29 0.14 303)
  const baseLightness = 0.29;
  const baseChroma = 0.14;
  const baseHue = 303;

  // Calcula o incremento de lightness baseado na posição
  // Quanto maior o índice (menor o gasto), mais claro fica
  // Varia de 0.29 (mais escuro) até 0.65 (mais claro)
  const lightnessRange = 0.65 - baseLightness;
  const lightnessIncrement =
    total > 1 ? (lightnessRange * index) / (total - 1) : 0;

  const lightness = baseLightness + lightnessIncrement;

  // Mantém chroma e hue constantes
  return `oklch(${lightness.toFixed(3)} ${baseChroma} ${baseHue})`;
}
