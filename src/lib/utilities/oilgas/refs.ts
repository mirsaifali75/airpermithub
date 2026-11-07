/**
 * Sources for the oil and gas calculators: the original papers named in the
 * title, linked to the free SPE PetroWiki page that prints the same equations,
 * plus U.S. government pages (eCFR, EPA, NASA, NIST).
 */
export const OG = {
  realGases: { title: "SPE PetroWiki, Real gases: Dranchuk & Abou-Kassem (1975, PETSOC-75-03-03) Z-factor and its constants A1–A11, Sutton (1985, SPE-14265-MS) pseudo-criticals, Wichert & Aziz (1972) sour-gas correction, Kay's rule", url: "https://petrowiki.spe.org/Real_gases" },
  gasVisc: { title: "SPE PetroWiki, Gas viscosity: Lee, Gonzalez & Eakin (1966), The Viscosity of Natural Gases, JPT 18(8), SPE-1340-PA", url: "https://petrowiki.spe.org/Gas_viscosity" },
  oilFvf: { title: "SPE PetroWiki, Oil formation volume factor: Standing (1947), A Pressure-Volume-Temperature Correlation for Mixtures of California Oils and Gases, API Drilling and Production Practice 275–287", url: "https://petrowiki.spe.org/Oil_formation_volume_factor" },
  oilVisc: { title: "SPE PetroWiki, Oil viscosity: Beggs & Robinson (1975), SPE-5434-PA, and Vasquez & Beggs (1980), SPE-6719-PA", url: "https://petrowiki.spe.org/Oil_viscosity" },
  oilWell: { title: "SPE PetroWiki, Oil well performance: Vogel (1968), JPT 20(1), SPE-1476-PA, and the composite IPR with a straight-line productivity index above the bubble point", url: "https://petrowiki.spe.org/Oil_well_performance" },
  vogel: { title: "Vogel (1968), Inflow Performance Relationships for Solution-Gas Drive Wells (OneMine record)", url: "https://onemine.org/documents/producing-equipment-methods-and-materials-inflow-performance-relationships-for-solution-gas-drive-wells" },
  gasWell: { title: "SPE PetroWiki, Gas well deliverability: Rawlins & Schellhardt (U.S. Bureau of Mines Monograph 7) back-pressure equation, n from 0.5 to 1.0", url: "https://petrowiki.spe.org/Gas_well_deliverability" },
  turner: { title: "Turner, An Analysis of the Continuous Removal of Liquids from Gas Wells (University of Houston), basis of Turner, Hubbard & Dukler (1969), JPT, SPE-2198-PA", url: "https://uh-ir.tdl.org/handle/10657/12622" },
  turnerPaper: { title: "Turner, Hubbard & Dukler (1969), Analysis and Prediction of Minimum Flow Rate for the Continuous Removal of Liquids from Gas Wells (OneMine record)", url: "https://onemine.org/documents/natural-gas-technology-analysis-and-prediction-of-minimum-flow-rate-for-the-continuous-removal-of-liquids-from-gas-wells" },
  chokes: { title: "Equinor NeqSim documentation, Well choke implementation: Gilbert (1954), Baxendell (1958), Ros (1960) and Achong (1961) critical-flow choke coefficients (psig, scf/STB, 64ths in)", url: "https://equinor.github.io/neqsim/process/well_choke_implementation" },
  separators: { title: "SPE PetroWiki, Separator sizing: gas capacity from droplet settling and the demister K-factor (ft/s)", url: "https://petrowiki.spe.org/Separator_sizing" },
  gasTest: { title: "SPE PetroWiki, Deliverability testing of gas wells (flow-after-flow tests, absolute open flow)", url: "https://petrowiki.spe.org/Deliverability_testing_of_gas_wells" },
  nasaChoke: { title: "NASA Glenn Research Center: Mass Flow Choking (compressible flow through a restriction)", url: "https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html" },
  nist: { title: "NIST Chemistry WebBook, Thermophysical Properties of Fluid Systems (molar masses and critical constants)", url: "https://webbook.nist.gov/chemistry/fluid/" },
  nist811: { title: "NIST SP 811: Guide for the Use of the International System of Units (exact conversion factors)", url: "https://www.nist.gov/pml/special-publication-811" },
  voc: { title: "40 CFR 51.100(s): definition of volatile organic compounds (methane and ethane excluded)", url: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-51/subpart-F/section-51.100" },
  hap: { title: "U.S. EPA: Initial List of Hazardous Air Pollutants with Modifications (benzene, toluene, ethyl benzene, xylenes, hexane)", url: "https://www.epa.gov/haps/initial-list-hazardous-air-pollutants-modifications" },
  colebrook: { title: "Colebrook (1939), Turbulent Flow in Pipes, Journal of the Institution of Civil Engineers 11(4)", url: "https://www.emerald.com/jince/article/11/4/133/417643/TURBULENT-FLOW-IN-PIPES-WITH-PARTICULAR-REFERENCE" },
  blmOil: { title: "43 CFR Subpart 3174, Measurement of Oil (BLM rules for tank gauging on federal and Indian leases)", url: "https://www.ecfr.gov/current/title-43/subtitle-B/chapter-II/subchapter-C/part-3170/subpart-3174" },
  bseeWells: { title: "30 CFR Part 250 Subpart G, Well Operations and Equipment (BSEE drilling and well-control requirements)", url: "https://www.ecfr.gov/current/title-30/chapter-II/subchapter-B/part-250/subpart-G" },
  bseeProd: { title: "30 CFR Part 250 Subpart H, Oil and Gas Production Safety Systems (BSEE; § 250.841 platform piping)", url: "https://www.ecfr.gov/current/title-30/chapter-II/subchapter-B/part-250/subpart-H" },
  doePump: { title: "U.S. DOE: Improving Pumping System Performance, A Sourcebook for Industry", url: "https://www.energy.gov/sites/prod/files/2014/05/f16/pump.pdf" },
} as const;
