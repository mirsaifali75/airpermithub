import { CFR_60_18_PDF, ECFR_63_CC_TABLE12, ECFR_METHOD_19, EPA_COST_MANUAL_CH2, EPA_NSR_MANUAL } from "../../tools/rule-text";

/**
 * Sources for the air permit engineering calculators: eCFR, the annual CFR on
 * GovInfo, and EPA documents only.
 */
export const AIR = {
  costManual: EPA_COST_MANUAL_CH2,
  nsrManual: EPA_NSR_MANUAL,
  ecfr6018: { title: "40 CFR 60.18, General control device and work practice requirements (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-60/subpart-A/section-60.18" },
  ecfr6311: { title: "40 CFR 63.11, Control device and work practice requirements (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-63/subpart-A/section-63.11" },
  cfr6018Pdf: CFR_60_18_PDF,
  ccTable12: ECFR_63_CC_TABLE12,
  ecfr602: { title: "40 CFR 60.2, Definitions: standard conditions, 293 K (68 °F) and 101.3 kPa (29.92 in Hg) (eCFR)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-60/subpart-A/section-60.2" },
  method19: ECFR_METHOD_19,
  method19Pdf: { title: "EPA Emission Measurement Center, Method 19 (3/29/2023 copy with readable equations 19-1 to 19-18)", url: "https://www.epa.gov/sites/default/files/2017-08/documents/method_19.pdf" },
  nistR: { title: "NIST: CODATA fundamental physical constants (molar gas constant R)", url: "https://physics.nist.gov/cuu/Constants/index.html" },
  nist811: { title: "NIST SP 811: Guide for the Use of the International System of Units (exact conversion factors)", url: "https://www.nist.gov/pml/special-publication-811" },
} as const;
