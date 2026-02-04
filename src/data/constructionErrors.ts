import type { ConstructionError } from '../types';

/**
 * Construction errors database based on "أخطاء شائعة في البناء"
 * (Common Mistakes in Construction) — UAE-focused
 */
export const constructionErrors: ConstructionError[] = [
  // ── Design Errors ──
  {
    id: 'D01',
    titleAr: 'إهمال دراسة الموقع',
    titleEn: 'Neglecting site study',
    category: 'design',
    description:
      'Failing to conduct proper geotechnical and topographical surveys before design, leading to foundations and drainage systems that do not suit the actual site conditions.',
    consequences:
      'Structural failures, drainage problems, excessive excavation costs, and potential building settlement or tilting.',
    prevention:
      'Commission a licensed geotechnical engineer to perform soil borings and a topographic survey before design begins. Review results with the structural engineer.',
    detectionMethod:
      'Review project files for soil investigation report and topographic survey before approving the design.',
    severity: 'critical',
    stage: 'design',
  },
  {
    id: 'D02',
    titleAr: 'تجاهل التنسيق بين الأعمال الميكانيكية والكهربائية والسباكة',
    titleEn: 'Ignoring MEP coordination',
    category: 'design',
    description:
      'Designing architectural, structural, and MEP systems independently without checking for clashes between pipes, ducts, and structural elements.',
    consequences:
      'Costly rework on-site, core-drilling through beams or slabs, compromised structural integrity, and construction delays.',
    prevention:
      'Use BIM coordination sessions during design. Require combined MEP drawings with clash detection before tender.',
    detectionMethod:
      'Request BIM clash report or combined services drawing overlay before construction starts.',
    severity: 'critical',
    stage: 'design',
  },
  {
    id: 'D03',
    titleAr: 'عدم مراعاة المناخ المحلي في التصميم',
    titleEn: 'Ignoring local climate in design',
    category: 'design',
    description:
      'Not accounting for UAE extreme heat, humidity, and sandstorms in material and system selection — e.g., using non-insulated walls or unprotected steel.',
    consequences:
      'High energy bills, rapid material degradation, condensation and mold issues, uncomfortable indoor environment.',
    prevention:
      'Specify thermal insulation per Estidama/Al Sa\'fat requirements. Select UV-resistant and corrosion-resistant materials.',
    detectionMethod:
      'Check wall/roof U-values against local code. Verify material spec sheets for UV and corrosion ratings.',
    severity: 'major',
    stage: 'design',
  },
  {
    id: 'D04',
    titleAr: 'التصميم بدون تصريح مسبق',
    titleEn: 'Designing without prior approval',
    category: 'design',
    description:
      'Starting detailed design without obtaining initial planning approval or Affection Plan from the municipality.',
    consequences:
      'Complete redesign needed, project delays, potential fines, wasted design fees.',
    prevention:
      'Obtain Affection Plan and initial no-objection from the municipality before commissioning full design.',
    detectionMethod:
      'Verify municipality approval letter and Affection Plan are on file before detailed design review.',
    severity: 'major',
    stage: 'design',
  },

  // ── Foundation Errors ──
  {
    id: 'F01',
    titleAr: 'عدم كفاية اختبار التربة',
    titleEn: 'Inadequate soil testing',
    category: 'foundation',
    description:
      'Skipping or performing insufficient soil investigation — fewer boreholes than required, shallow depth, or no lab testing of soil samples.',
    consequences:
      'Wrong foundation type or depth selected, differential settlement, structural cracking, and potential building failure.',
    prevention:
      'Follow UAE code requirements for number and depth of boreholes based on plot size. Use an accredited lab. Review with structural engineer.',
    detectionMethod:
      'Check soil report for borehole count, depth, SPT values, and lab test results against code minimums.',
    severity: 'critical',
    stage: 'foundation',
  },
  {
    id: 'F02',
    titleAr: 'ضعف العزل المائي للأساسات',
    titleEn: 'Poor foundation waterproofing',
    category: 'foundation',
    description:
      'Applying waterproofing membrane incorrectly, missing overlaps, or using incompatible products with the soil chemistry.',
    consequences:
      'Water seepage into basement, rebar corrosion, concrete deterioration, mold growth, and costly future repairs.',
    prevention:
      'Use waterproofing system compatible with soil sulfate levels. Ensure minimum 150mm overlaps. Protect membrane before backfill.',
    detectionMethod:
      'Flood test before backfill. Inspect membrane overlaps and protection board installation.',
    severity: 'critical',
    stage: 'foundation',
  },
  {
    id: 'F03',
    titleAr: 'ضعف صب القواعد الخرسانية',
    titleEn: 'Poor foundation concrete pouring',
    category: 'foundation',
    description:
      'Pouring concrete in extreme heat without precautions, insufficient vibration, cold joints from delayed pours, or incorrect mix design.',
    consequences:
      'Weak concrete, honeycombing, cracks, reduced load-bearing capacity, and shortened structural life.',
    prevention:
      'Use chilled water or ice in hot weather. Pour during cooler hours. Ensure continuous pour. Use proper vibration at max 450mm spacing.',
    detectionMethod:
      'Check concrete temperature at delivery (<35°C). Review cube test results at 7 and 28 days. Visual inspection for honeycombing.',
    severity: 'critical',
    stage: 'foundation',
  },
  {
    id: 'F04',
    titleAr: 'عدم حماية الخرسانة بعد الصب',
    titleEn: 'No concrete curing after pour',
    category: 'foundation',
    description:
      'Failing to properly cure concrete after pouring — not keeping it moist for minimum 7 days in UAE heat.',
    consequences:
      'Shrinkage cracks, reduced strength (can lose 30–40% of design strength), surface dusting, and long-term durability issues.',
    prevention:
      'Begin curing within 1 hour of finishing. Use wet burlap, curing compound, or ponding. Maintain for minimum 7 days.',
    detectionMethod:
      'Daily site inspection during curing period. Check for visible drying. Verify curing method documented in daily report.',
    severity: 'major',
    stage: 'foundation',
  },

  // ── Structure Errors ──
  {
    id: 'S01',
    titleAr: 'أخطاء في حديد التسليح',
    titleEn: 'Rebar placement errors',
    category: 'structure',
    description:
      'Incorrect rebar spacing, missing stirrups, insufficient lap length, wrong cover, or using rusted/contaminated bars.',
    consequences:
      'Reduced structural capacity, shear failure risk, accelerated corrosion, structural collapse in extreme cases.',
    prevention:
      'Follow structural drawings exactly. Use spacers for cover. Check lap lengths per code (40–50 diameters). Clean rebar before pour.',
    detectionMethod:
      'Pre-pour inspection: measure spacing, cover, lap lengths. Check rebar diameter with calipers. Photo documentation.',
    severity: 'critical',
    stage: 'structure',
  },
  {
    id: 'S02',
    titleAr: 'صب الخرسانة في الحرارة العالية',
    titleEn: 'Concrete pouring in extreme heat',
    category: 'structure',
    description:
      'Pouring concrete when ambient temperature exceeds 40°C without hot-weather concreting precautions, or when concrete temperature exceeds 35°C.',
    consequences:
      'Rapid moisture loss, plastic shrinkage cracks, reduced strength gain, flash setting, and poor workability.',
    prevention:
      'Schedule pours for early morning or evening. Use ice/chilled water in mix. Wet formwork before pour. Have fog spray on standby.',
    detectionMethod:
      'Record ambient and concrete temperature at pour. Reject loads over 35°C. Check weather forecast before scheduling.',
    severity: 'critical',
    stage: 'structure',
  },
  {
    id: 'S03',
    titleAr: 'عيوب الشدات والفورمات',
    titleEn: 'Formwork and shoring defects',
    category: 'structure',
    description:
      'Using damaged or undersized formwork, inadequate shoring, premature stripping, or incorrect alignment and levels.',
    consequences:
      'Concrete deflection, dimensional errors, surface defects, and potential collapse during or after pour.',
    prevention:
      'Inspect formwork before each use. Check shoring capacity calculations. Follow minimum stripping times (7 days slabs, 21 days beams).',
    detectionMethod:
      'Pre-pour checklist: alignment, levels, cleanliness, release agent, shoring spacing, and tie rod tightness.',
    severity: 'critical',
    stage: 'structure',
  },
  {
    id: 'S04',
    titleAr: 'عدم اختبار الخرسانة',
    titleEn: 'Skipping concrete testing',
    category: 'structure',
    description:
      'Not taking concrete cube samples per code requirements, or not testing slump, temperature, and air content at delivery.',
    consequences:
      'No quality record, undetected weak concrete, liability issues, and potential requirement to demolish and rebuild.',
    prevention:
      'Take cubes every 50m³ or per pour. Test slump and temperature for every truck. Send to accredited lab.',
    detectionMethod:
      'Review concrete test log against pour volume. Verify lab accreditation. Check 7-day results before proceeding.',
    severity: 'major',
    stage: 'structure',
  },

  // ── MEP Errors ──
  {
    id: 'M01',
    titleAr: 'التمديدات العشوائية',
    titleEn: 'Random MEP routing',
    category: 'mep',
    description:
      'Running pipes, conduits, and ducts without following approved shop drawings — routing through structural elements or creating inaccessible installations.',
    consequences:
      'Structural damage from unauthorized core drilling, inaccessible systems for maintenance, and code violations.',
    prevention:
      'Require approved shop drawings before any MEP rough-in. Mark all sleeve locations on formwork before concrete pour.',
    detectionMethod:
      'Compare installed routing with approved shop drawings. Check for unauthorized penetrations in structural elements.',
    severity: 'critical',
    stage: 'mep',
  },
  {
    id: 'M02',
    titleAr: 'عدم اختبار الضغط للسباكة',
    titleEn: 'No pressure testing for plumbing',
    category: 'mep',
    description:
      'Closing walls or slabs over plumbing without performing a pressure test to verify joints are leak-free.',
    consequences:
      'Hidden leaks causing water damage, mold, structural corrosion, and extremely expensive repair once finishes are applied.',
    prevention:
      'Pressure test all supply lines at 1.5x working pressure for minimum 2 hours before closing. Document with photos and signed report.',
    detectionMethod:
      'Verify pressure test report with gauge photos, start/end readings, and consultant sign-off before covering.',
    severity: 'critical',
    stage: 'mep',
  },
  {
    id: 'M03',
    titleAr: 'ضعف العزل الحراري للتكييف',
    titleEn: 'Poor HVAC insulation',
    category: 'mep',
    description:
      'Inadequate insulation on AC ducts and pipes, gaps in insulation, or using low-quality insulation that degrades quickly in high humidity.',
    consequences:
      'Condensation and dripping, mold growth in ceilings, energy waste, and reduced cooling efficiency.',
    prevention:
      'Use closed-cell insulation rated for UAE humidity. Ensure all joints sealed with vapor barrier. Minimum 25mm thickness on ducts.',
    detectionMethod:
      'Visual inspection of duct insulation continuity. Check for any exposed metal. Verify insulation spec matches approved materials.',
    severity: 'major',
    stage: 'mep',
  },
  {
    id: 'M04',
    titleAr: 'التوصيلات الكهربائية غير الآمنة',
    titleEn: 'Unsafe electrical connections',
    category: 'mep',
    description:
      'Using incorrect wire gauges, loose connections, missing earth bonding, or non-rated junction boxes in wet areas.',
    consequences:
      'Fire hazard, electrocution risk, equipment damage, and insurance claim rejection.',
    prevention:
      'Follow IEC standards and local electrical code. Use IP-rated enclosures in wet areas. Torque-test all connections.',
    detectionMethod:
      'Megger test insulation resistance. Verify earth continuity. Thermal imaging after energizing to detect hot spots.',
    severity: 'critical',
    stage: 'mep',
  },

  // ── Finishing Errors ──
  {
    id: 'FN01',
    titleAr: 'ضعف أعمال اللياسة',
    titleEn: 'Poor plastering work',
    category: 'finishing',
    description:
      'Applying plaster too thick in single coat, not wetting the wall, or plastering over dusty/oily surfaces.',
    consequences:
      'Plaster delamination and falling, cracking, uneven surfaces requiring extensive remediation.',
    prevention:
      'Clean and wet block wall. Apply scratch coat first. Maximum 15mm per coat. Allow 24h between coats. Use corner beads.',
    detectionMethod:
      'Tap test for hollow sounds (delamination). Check thickness with depth gauge. Verify straightness with 2m level.',
    severity: 'major',
    stage: 'finishing',
  },
  {
    id: 'FN02',
    titleAr: 'استخدام مواد رديئة الجودة',
    titleEn: 'Using low-quality materials',
    category: 'finishing',
    description:
      'Substituting specified materials with cheaper alternatives — off-spec tiles, uncertified paint, or non-rated waterproofing in wet areas.',
    consequences:
      'Premature deterioration, color fading, tile cracking, waterproofing failure, and voided warranties.',
    prevention:
      'Verify all material submittals against specifications. Require manufacturer certificates. Sample approval before bulk delivery.',
    detectionMethod:
      'Compare delivered materials against approved submittals. Check batch numbers. Request test certificates.',
    severity: 'major',
    stage: 'finishing',
  },
  {
    id: 'FN03',
    titleAr: 'عدم عزل الحمامات بشكل صحيح',
    titleEn: 'Improper bathroom waterproofing',
    category: 'finishing',
    description:
      'Insufficient waterproofing layers in wet areas, not extending membrane up walls (min 200mm, full height in showers), or damaging membrane during tiling.',
    consequences:
      'Water seepage to adjacent rooms and floors below, structural damage, mold, and costly tear-out repairs.',
    prevention:
      'Apply two-coat liquid membrane with fabric reinforcement at corners. Flood test for 48 hours before tiling. Protect membrane.',
    detectionMethod:
      '48-hour flood test before tiling. Check water level drop. Inspect ceiling below for any moisture.',
    severity: 'critical',
    stage: 'finishing',
  },
  {
    id: 'FN04',
    titleAr: 'أخطاء في تركيب البلاط',
    titleEn: 'Tile installation errors',
    category: 'finishing',
    description:
      'Improper adhesive coverage (< 90%), no expansion joints, uneven substrate, or insufficient soaking of cement-based tiles.',
    consequences:
      'Tiles popping, cracking, uneven surfaces, hollow sounds underfoot, and potential trip hazards.',
    prevention:
      'Back-butter large format tiles. Leave 3mm joints minimum. Install expansion joints per layout. Level substrate to ±2mm in 2m.',
    detectionMethod:
      'Tap test entire floor for hollow spots. Check levels with 2m straightedge. Verify joint width consistency.',
    severity: 'minor',
    stage: 'finishing',
  },

  // ── External Works Errors ──
  {
    id: 'E01',
    titleAr: 'ضعف نظام الصرف الخارجي',
    titleEn: 'Inadequate external drainage',
    category: 'external',
    description:
      'Not designing proper surface drainage slopes, missing catch basins, or not connecting to the municipal storm drain system.',
    consequences:
      'Flooding during rain, water pooling around foundation, erosion, mosquito breeding, and neighbor disputes.',
    prevention:
      'Design minimum 1% slope away from building. Install catch basins at low points. Connect to municipal drain. Include French drains if needed.',
    detectionMethod:
      'Pour water test after grading. Check slope with level. Verify drain connections to municipal system.',
    severity: 'major',
    stage: 'external',
  },
  {
    id: 'E02',
    titleAr: 'عدم الاستفادة من المساحات الخارجية',
    titleEn: 'Underutilizing outdoor space',
    category: 'external',
    description:
      'Poor landscape planning that ignores UAE climate — using high-water plants, no shading, and insufficient irrigation.',
    consequences:
      'High water bills, dead landscaping, unusable outdoor areas in summer, and wasted plot potential.',
    prevention:
      'Use native and drought-tolerant plants. Install efficient drip irrigation. Design shaded outdoor areas. Plan for summer use.',
    detectionMethod:
      'Review landscape plan for plant water requirements. Check irrigation system coverage. Verify shade structure design.',
    severity: 'minor',
    stage: 'external',
  },

  // ── Contractual Errors ──
  {
    id: 'C01',
    titleAr: 'عدم وجود عقد مفصل',
    titleEn: 'No detailed contract',
    category: 'contractual',
    description:
      'Starting construction without a comprehensive contract that defines scope, specifications, timeline, payment schedule, and penalties.',
    consequences:
      'Disputes over scope, cost overruns, delays without recourse, quality issues with no contractual remedy.',
    prevention:
      'Use a standard construction contract (FIDIC or local equivalent). Include detailed BOQ, specifications, program, retention, and defects liability period.',
    detectionMethod:
      'Review contract for: scope definition, BOQ, specifications, program, payment terms, variation procedure, and dispute resolution.',
    severity: 'critical',
    stage: 'design',
  },
  {
    id: 'C02',
    titleAr: 'ضعف الإشراف على المقاول',
    titleEn: 'Weak contractor supervision',
    category: 'contractual',
    description:
      'Not hiring a qualified consultant for construction supervision, or relying solely on the contractor\'s self-reporting.',
    consequences:
      'Quality defects go undetected, materials substituted, work not per approved drawings, and no independent documentation.',
    prevention:
      'Hire a licensed supervision consultant. Require daily site reports. Conduct weekly progress meetings. Independent material testing.',
    detectionMethod:
      'Check for supervision contract. Review daily reports log. Verify consultant site visit frequency.',
    severity: 'critical',
    stage: 'design',
  },
];

export function getErrorsByStage(stageId: string): ConstructionError[] {
  return constructionErrors.filter((e) => e.stage === stageId);
}

export function getErrorsByCategory(category: string): ConstructionError[] {
  return constructionErrors.filter((e) => e.category === category);
}

export function getErrorsBySeverity(severity: string): ConstructionError[] {
  return constructionErrors.filter((e) => e.severity === severity);
}
