const BaseVacationStrategy = require("./BaseVacationStrategy");
const {
  countBusinessDays,
  fullYearsBetween,
  fullMonthsBetween,
  addDays,
  toDateOnly,
  rangesOverlap,
} = require("../../../utils/vacationDateUtils");

const BASE_ENTITLEMENT = 15; // días hábiles tras 1 año
const MONTHLY_ACCRUAL = 1.25; // días hábiles/mes (informativo)

/**
 * Reglas de Chile — Código del Trabajo arts. 67–73.
 * Unidad: días hábiles (lun–vie, excluye feriados CL).
 */
class ChileVacationStrategy extends BaseVacationStrategy {
  getCountryCode() {
    return "CL";
  }

  getDayUnit() {
    return "business";
  }

  /** Días progresivos: +1 tras 10 años, +2 tras 20, +3 tras 25. */
  getProgressiveDays(yearsOfService) {
    if (yearsOfService >= 25) return 3;
    if (yearsOfService >= 20) return 2;
    if (yearsOfService >= 10) return 1;
    return 0;
  }

  getAnnualEntitlement({ yearsOfService = 0 } = {}) {
    return BASE_ENTITLEMENT + this.getProgressiveDays(yearsOfService);
  }

  isEligible({ hireDate, referenceDate }) {
    if (!hireDate) return false;
    return fullYearsBetween(hireDate, referenceDate) >= 1;
  }

  /** Proporcional: 1,25 hábiles por mes completo trabajado. */
  getProportionalDays({ hireDate, referenceDate }) {
    if (!hireDate) return 0;
    const months = fullMonthsBetween(hireDate, referenceDate);
    return Math.round(months * MONTHLY_ACCRUAL * 100) / 100;
  }

  countRequestDays({ startDate, endDate, holidays }) {
    return countBusinessDays(startDate, endDate, holidays);
  }

  getExpirationDate({ periodEnd }) {
    // Debe otorgarse dentro del año siguiente al devengo.
    return addDays(periodEnd, 365);
  }

  validateRequest({
    request,
    holidays,
    availableBalance = 0,
    existingActiveRequests = [],
    referenceDate,
    config = {},
    allowPast = false,
  }) {
    const errors = [];
    const today = toDateOnly(referenceDate) || toDateOnly(new Date());
    const start = toDateOnly(request.startDate);
    const end = toDateOnly(request.endDate);
    const days = this.countRequestDays({
      startDate: start,
      endDate: end,
      holidays,
    });

    if (!start || !end) {
      errors.push("Fechas de inicio y término inválidas.");
      return { valid: false, errors, days: 0 };
    }
    if (end < start) {
      errors.push("La fecha de término no puede ser anterior al inicio.");
    }
    if (days <= 0) {
      errors.push(
        "El rango seleccionado no contiene días hábiles (sábados, domingos y feriados no cuentan).",
      );
    }
    if (!allowPast && start < today) {
      errors.push("No puedes solicitar vacaciones en fechas pasadas.");
    }

    // Anticipación mínima (días hábiles)
    const minNotice = Number(config.minNoticeDaysCL ?? 15);
    if (!allowPast && start >= today) {
      const noticeDays = countBusinessDays(addDays(today, 1), start, holidays);
      if (noticeDays < minNotice) {
        errors.push(
          `Debes solicitar con al menos ${minNotice} días hábiles de anticipación.`,
        );
      }
    }

    // Saldo suficiente
    if (days > availableBalance + 0.001) {
      errors.push(
        `Saldo insuficiente: solicitas ${days} día(s) hábil(es) y tienes ${availableBalance} disponible(s).`,
      );
    }

    // Solapamiento con solicitudes activas
    const overlaps = existingActiveRequests.some((r) =>
      rangesOverlap(start, end, r.start_date, r.end_date),
    );
    if (overlaps) {
      errors.push(
        "El rango se solapa con otra solicitud pendiente, aprobada o en curso.",
      );
    }

    // Fraccionamiento: al menos un tramo ≥ 10 hábiles por período.
    const minLong = Number(config.minLongFractionCL ?? 10);
    const hasLongSegment =
      days >= minLong ||
      existingActiveRequests.some((r) => Number(r.business_days) >= minLong);
    const consumesAll = days >= availableBalance - 0.001;
    if (days < minLong && !hasLongSegment && !consumesAll) {
      errors.push(
        `Fraccionamiento inválido: al menos un tramo del período debe ser de ${minLong} días hábiles consecutivos.`,
      );
    }

    return { valid: errors.length === 0, errors, days };
  }
}

module.exports = ChileVacationStrategy;
