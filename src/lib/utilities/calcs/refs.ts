/** Engineering references cited by the utility calculators. Government and standards-body sources only. */
export const REF = {
  if97: { title: "IAPWS: Revised Release on the IAPWS Industrial Formulation 1997 (IF97) for water and steam", url: "https://www.iapws.org/relguide/IF97-Rev.html" },
  visc: { title: "IAPWS: Release on the IAPWS Formulation 2008 for the Viscosity of Ordinary Water Substance", url: "https://www.iapws.org/relguide/viscosity.html" },
  nist811: { title: "NIST SP 811: Guide for the Use of the International System of Units (conversion factors)", url: "https://www.nist.gov/pml/special-publication-811" },
  doeSteam: { title: "U.S. DOE: Improving Steam System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/eere/iedo/articles/improving-steam-system-performance-sourcebook-industry-second-edition" },
  doeBlowdown: { title: "U.S. DOE Steam Tip Sheet: Minimize Boiler Blowdown", url: "https://www.energy.gov/eere/iedo/articles/minimize-boiler-blowdown" },
  doeFlash: { title: "U.S. DOE Steam Tip Sheet: Flash High-Pressure Condensate to Regenerate Low-Pressure Steam", url: "https://www.energy.gov/eere/iedo/articles/flash-high-pressure-condensate-regenerate-low-pressure-steam" },
  doeAir: { title: "U.S. DOE: Improving Compressed Air System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/eere/iedo/articles/improving-compressed-air-system-performance-sourcebook-industry" },
  doeLeaks: { title: "U.S. DOE Compressed Air Tip Sheet: Minimize Compressed Air Leaks", url: "https://www.energy.gov/eere/iedo/articles/minimize-compressed-air-leaks" },
  doePump: { title: "U.S. DOE: Improving Pumping System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/eere/iedo/articles/improving-pumping-system-performance-sourcebook-industry-second-edition" },
  femptower: { title: "U.S. DOE FEMP: Best Management Practice #10, Cooling Tower Management", url: "https://www.energy.gov/femp/best-management-practice-10-cooling-tower-management" },
  femchiller: { title: "U.S. DOE FEMP: Purchasing Energy-Efficient Water-Cooled Electric Chillers", url: "https://www.energy.gov/femp/purchasing-energy-efficient-water-cooled-electric-chillers" },
  csbN2: { title: "U.S. Chemical Safety Board: Hazards of Nitrogen Asphyxiation (safety bulletin)", url: "https://www.csb.gov/hazards-of-nitrogen-asphyxiation/" },
  ahtt: { title: "Lienhard & Lienhard, A Heat Transfer Textbook (MIT, free edition): log-mean temperature difference, ch. 3", url: "https://ahtt.mit.edu/" },
  nistR: { title: "NIST CODATA: molar gas constant R", url: "https://physics.nist.gov/cgi-bin/cuu/Value?r" },
} as const;
