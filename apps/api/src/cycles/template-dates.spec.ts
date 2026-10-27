import { TEMPLATE_REFERENCE_START, endDateForWeeks, templateDates } from "./template-dates";

describe("fechas de una plantilla", () => {
  it("la referencia es un lunes a medianoche UTC", () => {
    expect(TEMPLATE_REFERENCE_START.getUTCDay()).toBe(1);
    expect(TEMPLATE_REFERENCE_START.toISOString()).toBe("2001-01-01T00:00:00.000Z");
  });

  it("una semana termina seis días después del inicio", () => {
    expect(endDateForWeeks(new Date("2026-11-02T00:00:00.000Z"), 1).toISOString()).toBe("2026-11-08T00:00:00.000Z");
  });

  it("seis semanas terminan el domingo de la sexta", () => {
    expect(endDateForWeeks(new Date("2026-11-02T00:00:00.000Z"), 6).toISOString()).toBe("2026-12-13T00:00:00.000Z");
  });

  it("las fechas de una plantilla salen de la referencia y de sus semanas", () => {
    const { startDate, endDate } = templateDates(4);
    expect(startDate).toEqual(TEMPLATE_REFERENCE_START);
    expect(endDate.toISOString()).toBe("2001-01-28T00:00:00.000Z");
  });
});
