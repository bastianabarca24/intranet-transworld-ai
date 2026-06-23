const BaseVacationStrategy = require("./BaseVacationStrategy");
const {
  countCalendarDays,
  fullYearsBetween,
  fullMonthsBetween,
  addDays,
  toDateOnly,
  rangesOverlap,
} = require("../../../utils/vacationDateUtils");

const ANNUAL_ENTITLEMENT = 30; // días calendario por año completo

/**
 * Reglas de Perú — D.L. 713 / D.L. 1188 (régimen general).
 * Unidad: días calendario (incluye fines de semana y feriados).
 */
class PeruVacationStrategy extends BaseVacationStrategy {
  getCountryCode() {
    return "PE";
  }

  getDayUnit() {
    return "calendar";
  }

  getAnnualEntitlement() {
    return ANNUAL_ENTITLEMENT;
  }

  isEligible({ hireDate, referenceDate }) {
    if (!hireDate) return false;
    return fullYearsBetween(hireDate, referenceDate) >= 1;
  }

  /** Proporcional: (meses_completos / 12) * 30. */
  getProportionalDays({ hireDate, referenceDate }) {
    if (!hireDate) return 0;
    const months = Math.min(12, fullMonthsBetween(hireDate, referenceDate));
    return Math.round((months / 12) * ANNUAL_ENTITLEMENT * 100) / 100;
  }

  countRequestDays({ startDate, endDate }) {
    return countCalendarDays(startDate, endDate);
  }

  getExpirationDate({ periodEnd }) {
    // Régimen general: tomar dentro del año siguiente.
    return addDays(periodEnd, 365);
  }

  /** Vacaciones truncas al cese: proporcional a la fecha de término. */
  getSeveranceBalance({ hireDate, terminationDate }) {
    return this.getProportionalDays({
      hireDate,
      referenceDate: terminationDate,
    });
  }

  validateRequest({
    request,
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
    const days = this.countRequestDays({ startDate: start, endDate: end });

    if (!start || !end) {
      errors.push("Fechas de inicio y término inválidas.");
      return { valid: false, errors, days: 0 };
    }
    if (end < start) {
      errors.push("La fecha de término no puede ser anterior al inicio.");
    }
    if (days <= 0) {
      errors.push("El rango seleccionado no contiene días.");
    }
    if (!allowPast && start < today) {
      errors.push("No puedes solicitar vacaciones en fechas pasadas.");
    }

    // Anticipación mínima (días calendario)
    const minNotice = Number(config.minNoticeDaysPE ?? 7);
    if (!allowPast && start >= today) {
      const noticeDays = countCalendarDays(addDays(today, 1), start);
      if (noticeDays < minNotice) {
        errors.push(
          `Debes solicitar con al menos ${minNotice} días de anticipación.`,
        );
      }
    }

    // Fraccionamiento mínimo sugerido (configurable)
    const minFraction = Number(config.minFractionDaysPE ?? 7);
    if (days < minFraction && days < availableBalance) {
      errors.push(
        `Cada fracción debe ser de al menos ${minFraction} días calendario (salvo que agote el saldo).`,
      );
    }

    // Saldo suficiente
    if (days > availableBalance + 0.001) {
      errors.push(
        `Saldo insuficiente: solicitas ${days} día(s) calendario y tienes ${availableBalance} disponible(s).`,
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

    return { valid: errors.length === 0, errors, days };
  }
}

module.exports = PeruVacationStrategy;
