// STATUTORY WAGE RULES (effective 21 Nov 2025)
export const FLOOR_WAGE = 10000;        // monthly floor wage in ₹
export const OVERTIME_MULTIPLIER = 2;   // overtime rate = 2 × normal wage
export const WORK_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_MONTH = 26;

export interface WageComponent {
  name: string;
  value: number;
}

export interface ValidationRequest {
  components: WageComponent[];
  mode: "SIMPLE" | "DYNAMIC";
  overtimeHours?: number;
  overtimeRate?: number;
}

export interface RecommendationStructure {
  components: WageComponent[];
  totalGross: number;
  employeeNet: number;
  netChange: number;
  employerCostIncrease: number;
  note: string;
}

export interface ValidationResponse {
  status: "COMPLIANT" | "NON_COMPLIANT";
  issues: string[];
  suggestions: Array<{ message: string }>;
  financialImpact?: {
    difference: {
      pfIncrease: number;
      gratuityIncrease: number;
    };
  };
  recommendedStructure?: RecommendationStructure;
}

/**
 * READ-ONLY IMMUTABLE WAGE VALIDATION ENGINE
 * Compliant with Code on Wages, 2019 (effective 21 Nov 2025)
 * Calculations and logic are kept 100% identical to the source project specification.
 */
export const validateWages = (req: ValidationRequest): ValidationResponse => {
  const { components, overtimeHours = 0, overtimeRate = 0 } = req;

  // Subpart 6.5.2: Core validation (50% rule & exclusions)
  const normalized = components.map(c => ({
    name: c.name.toLowerCase(),
    value: Number(c.value) || 0
  }));

  const basic = normalized.find(c => c.name.includes("basic"))?.value || 0;
  const da = normalized.find(c => c.name === "da")?.value || 0;
  const total = normalized.reduce((s, c) => s + c.value, 0);
  const exclusions = normalized.filter(c => !c.name.includes("basic") && c.name !== "da").reduce((s, c) => s + c.value, 0);

  const issues: string[] = [];
  const suggestions: Array<{ message: string }> = [];

  if (basic + da < total * 0.5) {
    issues.push("50% rule violated: Basic+DA < 50% of total wages");
    const needed = (total * 0.5) - (basic + da);
    suggestions.push({ message: `Increase Basic+DA by ₹${needed.toFixed(2)}` });
  }

  if (exclusions > total * 0.5) {
    issues.push("Exclusion components exceed 50% of total wages");
    const reduceBy = exclusions - (total * 0.5);
    suggestions.push({ message: `Reduce exclusions by ₹${reduceBy.toFixed(2)}` });
  }

  // Subpart 6.5.3: Statutory floor wage validation
  if (total < FLOOR_WAGE) {
    issues.push(`Monthly wages (₹${total.toFixed(2)}) are below the statutory floor wage of ₹${FLOOR_WAGE}.`);
    suggestions.push({ message: `Increase total wages by ₹${(FLOOR_WAGE - total).toFixed(2)} to meet minimum wage.` });
  }

  // Subpart 6.5.4: Overtime validation
  const normalHourlyWage = total / (WORKING_DAYS_PER_MONTH * WORK_HOURS_PER_DAY);
  const requiredOvertimeRate = normalHourlyWage * OVERTIME_MULTIPLIER;
  if (overtimeHours > 0) {
    if (overtimeRate < requiredOvertimeRate) {
      issues.push(`Overtime rate (₹${overtimeRate.toFixed(2)}/hr) is below statutory requirement (2× normal wage = ₹${requiredOvertimeRate.toFixed(2)}/hr).`);
      suggestions.push({ message: `Increase overtime rate to at least ₹${requiredOvertimeRate.toFixed(2)}/hr.` });
    }
  }

  // Subpart 6.5.5: Base response object
  const response: ValidationResponse = {
    status: issues.length ? "NON_COMPLIANT" : "COMPLIANT",
    issues,
    suggestions
  };

  if (issues.length) {
    response.financialImpact = {
      difference: {
        pfIncrease: (basic + da) * 0.12,
        gratuityIncrease: (basic + da) * 0.0481
      }
    };
  }

  // ========== Subpart 6.5.6: FULLY CORRECTED RECOMMENDATION ENGINE ==========

  // ---- Branch A: 50% rule violation ----
  if (basic + da < total * 0.5) {
    const shortfall = (total * 0.5) - (basic + da); // n = needed increase in Basic+DA
    // To make (newBasic+da) = 50% of newTotal, we must increase Basic by 2n.
    // Increase Basic by 2*shortfall, total by same amount. No extra component.
    const basicIncrease = 2 * shortfall;
    const newBasic = basic + basicIncrease;
    const newTotal = total + basicIncrease;

    const recommendedComponents = components.map(c => {
      const name = c.name.toLowerCase();
      if (name.includes("basic")) return { ...c, value: newBasic };
      return c;
    });

    const currentPF = (basic + da) * 0.12;
    const currentNet = total - currentPF;
    const newPF = (newBasic + da) * 0.12;
    const newNet = newTotal - newPF;
    const employerCostIncrease = (newPF - currentPF) + (newBasic - basic) * (15 / 26);

    response.recommendedStructure = {
      components: recommendedComponents,
      totalGross: newTotal,
      employeeNet: newNet,
      netChange: newNet - currentNet,
      employerCostIncrease: employerCostIncrease,
      note: `50% rule corrected. Basic increased by ₹${basicIncrease.toFixed(2)} (2× shortfall). Employee net increases by ₹${(newNet - currentNet).toFixed(2)}.`
    };

    // Secondary floor-wage adjustment: if Branch A's recommendation still falls below floor wage
    if (response.recommendedStructure && response.recommendedStructure.totalGross < FLOOR_WAGE) {
      const floorShortfall = FLOOR_WAGE - response.recommendedStructure.totalGross;
      const adjustedBasic = newBasic + floorShortfall;
      const adjustedTotal = response.recommendedStructure.totalGross + floorShortfall;

      response.recommendedStructure.components = response.recommendedStructure.components.map(c => {
        if (c.name.toLowerCase().includes("basic")) return { ...c, value: adjustedBasic };
        return c;
      });

      const adjustedPF = (adjustedBasic + da) * 0.12;
      const adjustedNet = adjustedTotal - adjustedPF;

      response.recommendedStructure.totalGross = adjustedTotal;
      response.recommendedStructure.employeeNet = adjustedNet;
      response.recommendedStructure.netChange = adjustedNet - currentNet;
      response.recommendedStructure.employerCostIncrease += (adjustedBasic - newBasic) * 0.12 + (adjustedBasic - newBasic) * (15 / 26);
      response.recommendedStructure.note += ` Additionally raised to meet floor wage of ₹${FLOOR_WAGE}.`;
    }
  }
  // ---- Branch B: floor wage violation (only if 50% rule already satisfied) ----
  else if (total < FLOOR_WAGE) {
    const shortfall = FLOOR_WAGE - total;
    const newBasic = basic + shortfall; // increase Basic to cover shortfall
    const newTotal = total + shortfall;

    const recommendedComponents = components.map(c => {
      const name = c.name.toLowerCase();
      if (name.includes("basic")) return { ...c, value: newBasic };
      return c;
    });

    const currentPF = (basic + da) * 0.12;
    const currentNet = total - currentPF;
    const newPF = (newBasic + da) * 0.12;
    const newNet = newTotal - newPF;
    const employerCostIncrease = (newPF - currentPF) + (newBasic - basic) * (15 / 26);

    response.recommendedStructure = {
      components: recommendedComponents,
      totalGross: newTotal,
      employeeNet: newNet,
      netChange: newNet - currentNet,
      employerCostIncrease: employerCostIncrease,
      note: `Floor wage violation: total increased to ₹${FLOOR_WAGE}. Basic increased by ₹${shortfall.toFixed(2)}. Employee net increases accordingly.`
    };
  }

  return response;
};
