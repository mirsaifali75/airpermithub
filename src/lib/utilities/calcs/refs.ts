/** Engineering references cited by the utility calculators. Government and standards-body sources only. */
export const REF = {
  if97: { title: "IAPWS: Revised Release on the IAPWS Industrial Formulation 1997 (IF97) for water and steam", url: "https://iapws.org/technical-guidance/release/IF97-Rev" },
  visc: { title: "IAPWS: Release on the IAPWS Formulation 2008 for the Viscosity of Ordinary Water Substance", url: "https://iapws.org/technical-guidance/release/viscosity" },
  nist811: { title: "NIST SP 811: Guide for the Use of the International System of Units (conversion factors)", url: "https://www.nist.gov/pml/special-publication-811" },
  doeSteam: { title: "U.S. DOE: Improving Steam System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/sites/prod/files/2014/05/f15/steamsourcebook.pdf" },
  doeBlowdown: { title: "U.S. DOE Steam Tip Sheet #9: Minimize Boiler Blowdown", url: "https://www.energy.gov/sites/prod/files/2014/05/f16/steam9_blowdown.pdf" },
  doeFlash: { title: "U.S. DOE Steam Tip Sheet #12: Flash High-Pressure Condensate to Regenerate Low-Pressure Steam", url: "https://www.energy.gov/sites/prod/files/2014/05/f16/steam12_lowpressure_steam.pdf" },
  doeAir: { title: "U.S. DOE: Improving Compressed Air System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/sites/prod/files/2016/03/f30/Improving%20Compressed%20Air%20Sourcebook%20version%203.pdf" },
  doeLeaks: { title: "U.S. DOE Compressed Air Tip Sheet #3: Minimize Compressed Air Leaks", url: "https://www.energy.gov/sites/prod/files/2014/05/f16/compressed_air3.pdf" },
  doePump: { title: "U.S. DOE: Improving Pumping System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/sites/prod/files/2014/05/f16/pump.pdf" },
  femptower: { title: "U.S. DOE FEMP: Best Management Practice #10, Cooling Tower Management", url: "https://www.energy.gov/cmei/femp/best-management-practice-10-cooling-tower-management" },
  femchiller: { title: "U.S. DOE FEMP: Purchasing Energy-Efficient Electric Chillers", url: "https://www.energy.gov/cmei/femp/purchasing-energy-efficient-electric-chillers" },
  csbN2: { title: "U.S. Chemical Safety Board: Hazards of Nitrogen Asphyxiation (safety bulletin)", url: "https://www.csb.gov/hazards-of-nitrogen-asphyxiation/" },
  ahtt: { title: "Lienhard & Lienhard, A Heat Transfer Textbook (MIT, free edition): log-mean temperature difference, ch. 3", url: "https://ahtt.mit.edu/" },
  nistR: { title: "NIST: CODATA fundamental physical constants (molar gas constant R)", url: "https://physics.nist.gov/cuu/Constants/index.html" },
} as const;
