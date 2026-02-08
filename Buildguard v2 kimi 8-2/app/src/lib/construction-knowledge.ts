// BuildGuard Pro - Comprehensive UAE Construction Knowledge Base
// Based on research from "أخطاء شائعة في البناء" and UAE construction practices

export interface ConstructionError {
  id: string;
  category: 'design' | 'foundation' | 'structure' | 'mep' | 'finishing' | 'external' | 'contractual';
  stage: string;
  titleAr: string;
  titleEn: string;
  description: string;
  consequences: string[];
  prevention: string[];
  detectionMethod: string;
  severity: 'critical' | 'major' | 'minor';
  commonInUAE: boolean;
}

export interface StageChecklist {
  stageId: string;
  stageName: string;
  stageNameAr: string;
  paymentPercentage: number;
  duration: string;
  description: string;
  commonErrors: string[]; // Error IDs
  checklist: ChecklistItem[];
  approvalRequirements: string[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  descriptionAr: string;
  critical: boolean;
  verificationMethod: string;
  commonMistakes: string[];
}

// Comprehensive Construction Errors Database
export const constructionErrors: ConstructionError[] = [
  // DESIGN PHASE ERRORS
  {
    id: 'DES-001',
    category: 'design',
    stage: 'design',
    titleAr: 'إهمال دراسة الموقع الجغرافي',
    titleEn: 'Neglecting Site Geographic Study',
    description: 'Failing to conduct comprehensive site analysis including soil type, groundwater level, wind direction, and rainfall before design.',
    consequences: [
      'Inappropriate foundation selection',
      'Waterproofing failures',
      'Structural instability',
      'Poor natural ventilation'
    ],
    prevention: [
      'Conduct geotechnical study before design',
      'Hire professional engineering office',
      'Analyze soil bearing capacity',
      'Study wind patterns and sun orientation'
    ],
    detectionMethod: 'Review geotechnical reports and site analysis documents',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'DES-002',
    category: 'design',
    stage: 'design',
    titleAr: 'التصميم دون مراعاة الاحتياجات الوظيفية',
    titleEn: 'Design Without Functional Requirements',
    description: 'Designing spaces without studying usage patterns, family size, or future needs.',
    consequences: [
      'Wasted space',
      'Uncomfortable living',
      'Future renovation costs',
      'Poor room flow'
    ],
    prevention: [
      'Conduct space programming study',
      'Interview client for needs',
      'Plan for future expansion',
      'Consider family growth'
    ],
    detectionMethod: 'Review space program vs actual design',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'DES-003',
    category: 'design',
    stage: 'design',
    titleAr: 'تجاهل التمديدات الكهربائية والميكانيكية',
    titleEn: 'Ignoring MEP in Early Design',
    description: 'Not coordinating electrical, plumbing, and HVAC systems in initial design phase.',
    consequences: [
      'Wall breaking after plastering',
      'MEP conflicts',
      'Poor AC distribution',
      'Electrical overloads'
    ],
    prevention: [
      'Early coordination between architects and MEP',
      'Detailed MEP drawings before construction',
      'BIM coordination',
      'Clash detection'
    ],
    detectionMethod: 'Review MEP drawings coordination',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'DES-004',
    category: 'design',
    stage: 'design',
    titleAr: 'عدم مراعاة توجيه الموقع والطاقة الشمسية',
    titleEn: 'Ignoring Site Orientation and Sunlight',
    description: 'Not considering sun path, wind direction, and natural ventilation in villa design.',
    consequences: [
      'Overheated rooms',
      'High AC costs',
      'Poor natural lighting',
      'Privacy issues'
    ],
    prevention: [
      'Study sun path analysis',
      'Orient living spaces north',
      'Design for cross-ventilation',
      'Use shading devices'
    ],
    detectionMethod: 'Sun path simulation and energy analysis',
    severity: 'major',
    commonInUAE: true
  },

  // FOUNDATION ERRORS
  {
    id: 'FND-001',
    category: 'foundation',
    stage: 'foundation',
    titleAr: 'عدم اختبار التربة بدقة',
    titleEn: 'Inadequate Soil Testing',
    description: 'Relying on visual assessment or old soil reports without proper SPT testing.',
    consequences: [
      'Uneven settlement',
      'Building cracks',
      'Structural failure',
      'Foundation collapse'
    ],
    prevention: [
      'Conduct SPT (Standard Penetration Test)',
      'Laboratory soil analysis',
      'Determine bearing capacity',
      'Select appropriate foundation type'
    ],
    detectionMethod: 'Review soil test reports and SPT results',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'FND-002',
    category: 'foundation',
    stage: 'foundation',
    titleAr: 'ضعف صب القواعد الخرسانية',
    titleEn: 'Poor Foundation Concrete Pouring',
    description: 'Pouring foundation concrete without checking mix quality or proper compaction.',
    consequences: [
      'Honeycombing in concrete',
      'Voids and air pockets',
      'Reduced strength',
      'Water infiltration'
    ],
    prevention: [
      'Use certified ready-mix concrete',
      'Proper vibration during pouring',
      'Quality control testing',
      'Engineer supervision during pour'
    ],
    detectionMethod: 'Visual inspection and core sampling',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'FND-003',
    category: 'foundation',
    stage: 'foundation',
    titleAr: 'عدم مراعاة مستوى منسوب المياه الجوفية',
    titleEn: 'Ignoring Groundwater Level',
    description: 'Not accounting for groundwater presence which weakens foundations over time.',
    consequences: [
      'Foundation water damage',
      'Basement flooding',
      'Concrete deterioration',
      'Mold and mildew'
    ],
    prevention: [
      'Install effective drainage system',
      'Use appropriate waterproofing',
      'Monitor groundwater levels',
      'Design for water table'
    ],
    detectionMethod: 'Groundwater monitoring and waterproofing inspection',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'FND-004',
    category: 'foundation',
    stage: 'foundation',
    titleAr: 'عزل مائي غير كافٍ للأساسات',
    titleEn: 'Inadequate Foundation Waterproofing',
    description: 'Poor waterproofing application or wrong material selection for foundations.',
    consequences: [
      'Water seepage',
      'Dampness in basement',
      'Concrete corrosion',
      'Structural weakening'
    ],
    prevention: [
      'Use approved waterproofing materials',
      'Hire specialized waterproofing contractors',
      'Flood test for 24-48 hours',
      'Multiple layer application'
    ],
    detectionMethod: 'Flood test and moisture detection',
    severity: 'critical',
    commonInUAE: true
  },

  // STRUCTURAL ERRORS
  {
    id: 'STR-001',
    category: 'structure',
    stage: 'superstructure',
    titleAr: 'أخطاء في أعمال الحدادة',
    titleEn: 'Reinforcement Steel Errors',
    description: 'Incorrect rebar tying, insufficient concrete cover, or wrong steel grade.',
    consequences: [
      'Structural weakness',
      'Concrete spalling',
      'Rebar corrosion',
      'Reduced load capacity'
    ],
    prevention: [
      'Follow structural drawings exactly',
      'Ensure proper concrete cover (min 40mm)',
      'Use specified steel grade',
      'Engineer inspection before pour'
    ],
    detectionMethod: 'Cover meter testing and visual inspection',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'STR-002',
    category: 'structure',
    stage: 'superstructure',
    titleAr: 'صب الخرسانة في أجواء غير مناسبة',
    titleEn: 'Concrete Pouring in Extreme Weather',
    description: 'Pouring concrete in extreme heat without proper curing measures.',
    consequences: [
      'Rapid water evaporation',
      'Plastic shrinkage cracks',
      'Reduced concrete strength',
      'Surface defects'
    ],
    prevention: [
      'Pour during cooler hours',
      'Use ice in mix during summer',
      'Immediate curing with water',
      'Cover with wet burlap'
    ],
    detectionMethod: 'Visual crack inspection and strength testing',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'STR-003',
    category: 'structure',
    stage: 'superstructure',
    titleAr: 'عدم معالجة الخرسانة بعد الصب',
    titleEn: 'Inadequate Concrete Curing',
    description: 'Not watering concrete after pouring for minimum 7 days.',
    consequences: [
      'Reduced strength gain',
      'Surface cracking',
      'Dusty surface',
      'Premature deterioration'
    ],
    prevention: [
      'Water curing for 7 days minimum',
      'Keep surface continuously wet',
      'Use curing compounds if needed',
      'Protect from direct sun'
    ],
    detectionMethod: 'Hammer test and visual inspection',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'STR-004',
    category: 'structure',
    stage: 'superstructure',
    titleAr: 'عدم انتظام أعمدة الدورات',
    titleEn: 'Misaligned Columns Between Floors',
    description: 'Columns not vertically aligned between ground and upper floors.',
    consequences: [
      'Load path disruption',
      'Structural instability',
      'Cracking in walls',
      'Uneven settlement'
    ],
    prevention: [
      'Use laser level for alignment',
      'Template for column locations',
      'Engineer verification at each floor',
      'Plumb bob checking'
    ],
    detectionMethod: 'Laser level and plumb line verification',
    severity: 'critical',
    commonInUAE: true
  },

  // MEP ERRORS
  {
    id: 'MEP-001',
    category: 'mep',
    stage: 'mep',
    titleAr: 'تمديدات عشوائية للكهرباء والسباكة',
    titleEn: 'Random MEP Routing',
    description: 'Unplanned electrical and plumbing routes causing conflicts.',
    consequences: [
      'MEP clashes',
      'Difficult maintenance',
      'Wall breaking for repairs',
      'Safety hazards'
    ],
    prevention: [
      'Detailed MEP coordination drawings',
      'Use BIM for clash detection',
      'Follow standard routing paths',
      'Future access consideration'
    ],
    detectionMethod: 'BIM clash detection and drawing review',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'MEP-002',
    category: 'mep',
    stage: 'mep',
    titleAr: 'عدم اختبار الشبكات قبل التغليف',
    titleEn: 'Not Testing Systems Before Concealing',
    description: 'Covering MEP systems without pressure testing and electrical checks.',
    consequences: [
      'Hidden leaks',
      'Electrical faults',
      'Expensive repairs',
      'Wall damage'
    ],
    prevention: [
      'Water pressure test (24 hours)',
      'Electrical continuity test',
      'Insulation resistance test',
      'Video inspection where possible'
    ],
    detectionMethod: 'Pressure testing and electrical verification',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'MEP-003',
    category: 'mep',
    stage: 'mep',
    titleAr: 'أحمال كهربائية زائدة على الدوائر',
    titleEn: 'Overloaded Electrical Circuits',
    description: 'Connecting too many devices to single circuit causing overheating.',
    consequences: [
      'Circuit breaker trips',
      'Fire hazard',
      'Equipment damage',
      'Electrical fires'
    ],
    prevention: [
      'Proper load calculation',
      'Dedicated circuits for AC',
      'Adequate circuit capacity',
      'Professional electrical design'
    ],
    detectionMethod: 'Thermal imaging and load testing',
    severity: 'critical',
    commonInUAE: true
  },
  {
    id: 'MEP-004',
    category: 'mep',
    stage: 'mep',
    titleAr: 'تكييف غير مناسب للمساحة',
    titleEn: 'Improper HVAC Sizing',
    description: 'AC units too small or too large for the space requirements.',
    consequences: [
      'High energy bills',
      'Poor cooling',
      'Humidity problems',
      'Equipment failure'
    ],
    prevention: [
      'Proper heat load calculation',
      'Consider insulation and windows',
      'Right-size AC units',
      'Professional HVAC design'
    ],
    detectionMethod: 'Temperature monitoring and energy analysis',
    severity: 'major',
    commonInUAE: true
  },

  // FINISHING ERRORS
  {
    id: 'FIN-001',
    category: 'finishing',
    stage: 'finishing',
    titleAr: 'ضعف أعمال المحارة أو التلييس',
    titleEn: 'Poor Plastering Work',
    description: 'Using poor mortar mix or rushing plaster work causing cracks.',
    consequences: [
      'Wall cracks',
      'Uneven surfaces',
      'Paint problems',
      'Tile adhesion issues'
    ],
    prevention: [
      'Use quality cement and sand',
      'Proper mix ratio (1:4)',
      'Allow proper drying between coats',
      'Skilled plasterers'
    ],
    detectionMethod: 'Visual inspection and sounding',
    severity: 'minor',
    commonInUAE: true
  },
  {
    id: 'FIN-002',
    category: 'finishing',
    stage: 'finishing',
    titleAr: 'تركيب الأرضيات قبل الانتهاء من التمديدات',
    titleEn: 'Installing Floors Before MEP Completion',
    description: 'Laying tiles or flooring before finishing electrical and plumbing work.',
    consequences: [
      'Floor breaking for repairs',
      'Wasted materials',
      'Additional costs',
      'Project delays'
    ],
    prevention: [
      'Follow proper construction sequence',
      'Complete MEP before finishes',
      'Test all systems first',
      'Detailed work schedule'
    ],
    detectionMethod: 'Work sequence verification',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'FIN-003',
    category: 'finishing',
    stage: 'finishing',
    titleAr: 'استخدام مواد منخفضة الجودة',
    titleEn: 'Using Low-Quality Materials',
    description: 'Choosing cheap paints, tiles, or sanitary ware to reduce costs.',
    consequences: [
      'Frequent maintenance',
      'Early replacement',
      'Poor appearance',
      'Reduced property value'
    ],
    prevention: [
      'Invest in quality materials',
      'Check product certifications',
      'Use reputable brands',
      'Consider lifecycle cost'
    ],
    detectionMethod: 'Material testing and certification review',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'FIN-004',
    category: 'finishing',
    stage: 'finishing',
    titleAr: 'تشققات في الحوائط بعد البناء',
    titleEn: 'Wall Cracks After Construction',
    description: 'Cracks appearing in walls due to structural movement or poor workmanship.',
    consequences: [
      'Aesthetic issues',
      'Water infiltration',
      'Structural concerns',
      'Expensive repairs'
    ],
    prevention: [
      'Use control joints',
      'Proper curing of concrete',
      'Quality plastering',
      'Allow settlement period'
    ],
    detectionMethod: 'Visual crack mapping and monitoring',
    severity: 'major',
    commonInUAE: true
  },

  // EXTERNAL WORKS ERRORS
  {
    id: 'EXT-001',
    category: 'external',
    stage: 'external',
    titleAr: 'تصريف مياه الأمطار غير كافٍ',
    titleEn: 'Inadequate Storm Water Drainage',
    description: 'Poor drainage design causing water accumulation and damage.',
    consequences: [
      'Flooding',
      'Pavement damage',
      'Foundation exposure',
      'Landscape destruction'
    ],
    prevention: [
      'Design adequate drainage network',
      'Follow site slope directions',
      'Regular drain maintenance',
      'Permeable surfaces where possible'
    ],
    detectionMethod: 'Drainage flow simulation',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'EXT-002',
    category: 'external',
    stage: 'external',
    titleAr: 'عدم استغلال المساحات الخارجية',
    titleEn: 'Underutilizing Outdoor Spaces',
    description: 'Not planning gardens, parking, and outdoor areas effectively.',
    consequences: [
      'Wasted space',
      'Poor functionality',
      'Low property value',
      'Maintenance issues'
    ],
    prevention: [
      'Landscape design early',
      'Plan for vehicle access',
      'Consider outdoor living',
      'Proper irrigation design'
    ],
    detectionMethod: 'Site plan review',
    severity: 'minor',
    commonInUAE: true
  },

  // CONTRACTUAL ERRORS
  {
    id: 'CTR-001',
    category: 'contractual',
    stage: 'all',
    titleAr: 'عدم وجود عقد تفصيلي واضح',
    titleEn: 'Lack of Detailed Contract',
    description: 'Vague contract without clear specifications, timeline, and penalties.',
    consequences: [
      'Disputes',
      'Project delays',
      'Cost overruns',
      'Legal issues'
    ],
    prevention: [
      'Detailed contract with specifications',
      'Clear payment terms',
      'Define penalties for delay',
      'Include variation order process'
    ],
    detectionMethod: 'Contract review by legal',
    severity: 'major',
    commonInUAE: true
  },
  {
    id: 'CTR-002',
    category: 'contractual',
    stage: 'all',
    titleAr: 'ضعف الرقابة والإشراف الهندسي',
    titleEn: 'Weak Engineering Supervision',
    description: 'Absence of qualified engineer supervising construction work.',
    consequences: [
      'Poor quality work',
      'Code violations',
      'Safety hazards',
      'Hidden defects'
    ],
    prevention: [
      'Hire licensed supervision company',
      'Regular site inspections',
      'Document all work phases',
      'Independent quality control'
    ],
    detectionMethod: 'Supervision reports review',
    severity: 'critical',
    commonInUAE: true
  }
];

// Comprehensive Stage Checklists with UAE Best Practices
export const stageChecklists: StageChecklist[] = [
  {
    stageId: 'stage-001',
    stageName: 'Mobilization & Site Setup',
    stageNameAr: 'التعبئة وإعداد الموقع',
    paymentPercentage: 2,
    duration: '10 days',
    description: 'Site preparation, temporary facilities, and safety setup',
    commonErrors: ['CTR-001', 'CTR-002'],
    checklist: [
      {
        id: 'chk-001',
        description: 'Site clearance and removal of obstacles',
        descriptionAr: 'إزالة العوائق وتنظيف الموقع',
        critical: true,
        verificationMethod: 'Visual inspection and photo documentation',
        commonMistakes: ['Incomplete debris removal', 'Damage to neighboring properties']
      },
      {
        id: 'chk-002',
        description: 'Perimeter fencing with safety signage',
        descriptionAr: 'سياج محيط مع لافتات السلامة',
        critical: true,
        verificationMethod: 'Walk-around inspection',
        commonMistakes: ['Insufficient height', 'Missing warning signs']
      },
      {
        id: 'chk-003',
        description: 'Temporary site office setup',
        descriptionAr: 'إعداد مكتب الموقع المؤقت',
        critical: false,
        verificationMethod: 'Visual verification',
        commonMistakes: ['Inadequate space', 'Missing utilities']
      },
      {
        id: 'chk-004',
        description: 'Worker accommodation (if required)',
        descriptionAr: 'سكن العمال (إذا لزم الأمر)',
        critical: true,
        verificationMethod: 'Municipality inspection',
        commonMistakes: ['Overcrowding', 'Poor sanitation']
      },
      {
        id: 'chk-005',
        description: 'Temporary water and electricity connection',
        descriptionAr: 'توصيل المياه والكهرباء المؤقتة',
        critical: true,
        verificationMethod: 'Test all connections',
        commonMistakes: ['Unsafe electrical setup', 'Water contamination']
      },
      {
        id: 'chk-006',
        description: 'Safety equipment and first aid station',
        descriptionAr: 'معدات السلامة ومحطة الإسعافات الأولية',
        critical: true,
        verificationMethod: 'Inventory check',
        commonMistakes: ['Expired equipment', 'Insufficient PPE']
      }
    ],
    approvalRequirements: [
      'Site setup photos',
      'Safety compliance certificate',
      'Municipal approval for temporary structures'
    ]
  },
  {
    stageId: 'stage-002',
    stageName: 'Excavation & Shoring',
    stageNameAr: 'الحفر والدعامات',
    paymentPercentage: 5,
    duration: '20 days',
    description: 'Site excavation, soil testing, and shoring installation',
    commonErrors: ['FND-001', 'FND-003'],
    checklist: [
      {
        id: 'chk-007',
        description: 'Geotechnical soil testing (SPT) completed',
        descriptionAr: 'إجراء اختبار التربة الجيوتقنية (SPT)',
        critical: true,
        verificationMethod: 'Review lab test report',
        commonMistakes: ['Insufficient test points', 'Using old reports']
      },
      {
        id: 'chk-008',
        description: 'Excavation to required depth with level verification',
        descriptionAr: 'الحفر للعمق المطلوب مع التحقق من المستوى',
        critical: true,
        verificationMethod: 'Survey level check',
        commonMistakes: ['Uneven excavation', 'Insufficient depth']
      },
      {
        id: 'chk-009',
        description: 'Groundwater monitoring and dewatering system',
        descriptionAr: 'مراقبة المياه الجوفية ونظام التصريف',
        critical: true,
        verificationMethod: 'Water level monitoring',
        commonMistakes: ['Inadequate pumps', 'No monitoring wells']
      },
      {
        id: 'chk-010',
        description: 'Shoring installation with engineer approval',
        descriptionAr: 'تركيب الدعامات مع موافقة المهندس',
        critical: true,
        verificationMethod: 'Structural engineer sign-off',
        commonMistakes: ['Insufficient shoring', 'Wrong shoring type']
      },
      {
        id: 'chk-011',
        description: 'Slope stability verification',
        descriptionAr: 'التحقق من استقرار المنحدر',
        critical: true,
        verificationMethod: 'Geotechnical assessment',
        commonMistakes: ['Over-steep slopes', 'No erosion control']
      },
      {
        id: 'chk-012',
        description: 'Protection of adjacent structures',
        descriptionAr: 'حماية المباني المجاورة',
        critical: true,
        verificationMethod: 'Pre-construction survey',
        commonMistakes: ['No monitoring', 'Damage to neighbors']
      }
    ],
    approvalRequirements: [
      'Soil test report',
      'Shoring design approval',
      'Excavation depth verification',
      'Adjacent property condition report'
    ]
  },
  {
    stageId: 'stage-003',
    stageName: 'Foundation & Substructure',
    stageNameAr: 'الأساسات والبنية التحتية',
    paymentPercentage: 8,
    duration: '45 days',
    description: 'Foundation construction, waterproofing, and backfilling',
    commonErrors: ['FND-002', 'FND-004', 'STR-001'],
    checklist: [
      {
        id: 'chk-013',
        description: 'Foundation layout verification with survey',
        descriptionAr: 'التحقق من تخطيط الأساسات بالمسح',
        critical: true,
        verificationMethod: 'Total station survey',
        commonMistakes: ['Misaligned foundations', 'Wrong dimensions']
      },
      {
        id: 'chk-014',
        description: 'Reinforcement steel as per structural drawings',
        descriptionAr: 'حديد التسليح حسب المخططات الإنشائية',
        critical: true,
        verificationMethod: 'Bar bending schedule check',
        commonMistakes: ['Wrong bar size', 'Insufficient cover']
      },
      {
        id: 'chk-015',
        description: 'Formwork installation and alignment',
        descriptionAr: 'تركيب ومحاذاة القوالب',
        critical: true,
        verificationMethod: 'Level and plumb check',
        commonMistakes: ['Formwork gaps', 'Poor alignment']
      },
      {
        id: 'chk-016',
        description: 'Concrete pour with quality control',
        descriptionAr: 'صب الخرسانة مع مراقبة الجودة',
        critical: true,
        verificationMethod: 'Cube test results',
        commonMistakes: ['Wrong mix', 'Inadequate vibration']
      },
      {
        id: 'chk-017',
        description: 'Concrete curing for minimum 7 days',
        descriptionAr: 'معالجة الخرسانة لمدة 7 أيام على الأقل',
        critical: true,
        verificationMethod: 'Curing log and photos',
        commonMistakes: ['Curing stopped early', 'Insufficient water']
      },
      {
        id: 'chk-018',
        description: 'Waterproofing application and flood test',
        descriptionAr: 'تطبيق العزل المائي واختبار الفيضان',
        critical: true,
        verificationMethod: '24-48 hour flood test',
        commonMistakes: ['Skipped flood test', 'Poor application']
      },
      {
        id: 'chk-019',
        description: 'Backfilling with proper compaction',
        descriptionAr: 'ردم مع دك مناسب',
        critical: true,
        verificationMethod: 'Density test',
        commonMistakes: ['Organic material in fill', 'Poor compaction']
      },
      {
        id: 'chk-020',
        description: 'Foundation level verification',
        descriptionAr: 'التحقق من مستوى الأساسات',
        critical: true,
        verificationMethod: 'Survey level check',
        commonMistakes: ['Wrong elevation', 'Uneven surface']
      }
    ],
    approvalRequirements: [
      'Concrete cube test results (28-day)',
      'Waterproofing flood test certificate',
      'Compaction test results',
      'Structural engineer inspection report'
    ]
  },
  {
    stageId: 'stage-004',
    stageName: 'Superstructure (Columns/Beams/Slabs)',
    stageNameAr: 'الهيكل الإنشائي (أعمدة/كمرات/بلاطات)',
    paymentPercentage: 15,
    duration: '60 days',
    description: 'Structural frame construction including columns, beams, and floor slabs',
    commonErrors: ['STR-001', 'STR-002', 'STR-003', 'STR-004'],
    checklist: [
      {
        id: 'chk-021',
        description: 'Column reinforcement and formwork',
        descriptionAr: 'تسليح وقوالب الأعمدة',
        critical: true,
        verificationMethod: 'Engineer inspection before pour',
        commonMistakes: ['Misaligned columns', 'Insufficient ties']
      },
      {
        id: 'chk-022',
        description: 'Column verticality check (plumb)',
        descriptionAr: 'التحقق من عمودية الأعمدة',
        critical: true,
        verificationMethod: 'Laser level or plumb bob',
        commonMistakes: ['Out of plumb', 'Not checked each floor']
      },
      {
        id: 'chk-023',
        description: 'Beam and slab reinforcement',
        descriptionAr: 'تسليح الكمرات والبلاطات',
        critical: true,
        verificationMethod: 'Drawing comparison',
        commonMistakes: ['Wrong bar spacing', 'Missing stirrups']
      },
      {
        id: 'chk-024',
        description: 'Formwork stability and support',
        descriptionAr: 'استقرار ودعامات القوالب',
        critical: true,
        verificationMethod: 'Load calculation check',
        commonMistakes: ['Insufficient props', 'Weak support']
      },
      {
        id: 'chk-025',
        description: 'Concrete pour in suitable weather',
        descriptionAr: 'صب الخرسانة في طقس مناسب',
        critical: true,
        verificationMethod: 'Temperature log',
        commonMistakes: ['Pouring in extreme heat', 'No ice in mix']
      },
      {
        id: 'chk-026',
        description: 'Proper concrete vibration',
        descriptionAr: 'الاهتزاز المناسب للخرسانة',
        critical: true,
        verificationMethod: 'Visual inspection during pour',
        commonMistakes: ['Under-vibration', 'Honeycombing']
      },
      {
        id: 'chk-027',
        description: 'Curing period (14 days for slabs)',
        descriptionAr: 'فترة المعالجة (14 يوم للبلاطات)',
        critical: true,
        verificationMethod: 'Curing records',
        commonMistakes: ['Stopped early', 'Dry surface']
      },
      {
        id: 'chk-028',
        description: 'Formwork removal timing',
        descriptionAr: 'توقيت فك القوالب',
        critical: true,
        verificationMethod: 'Strength test results',
        commonMistakes: ['Removed too early', 'No strength check']
      },
      {
        id: 'chk-029',
        description: 'Structural element dimensions check',
        descriptionAr: 'التحقق من أبعاد العناصر الإنشائية',
        critical: true,
        verificationMethod: 'Measurement verification',
        commonMistakes: ['Wrong dimensions', 'Insufficient cover']
      }
    ],
    approvalRequirements: [
      'Concrete cube test results for each pour',
      'Structural engineer floor-by-floor approval',
      'Column plumb verification report',
      'Formwork removal approval'
    ]
  },
  {
    stageId: 'stage-005',
    stageName: 'Blockwork & Plaster',
    stageNameAr: 'أعمال البلوك والمحارة',
    paymentPercentage: 10,
    duration: '40 days',
    description: 'Masonry walls and plastering works',
    commonErrors: ['FIN-001', 'FIN-004'],
    checklist: [
      {
        id: 'chk-030',
        description: 'Block quality and type verification',
        descriptionAr: 'التحقق من نوع وجودة البلوك',
        critical: true,
        verificationMethod: 'Material test certificate',
        commonMistakes: ['Wrong block type', 'Poor quality blocks']
      },
      {
        id: 'chk-031',
        description: 'Wall layout and alignment',
        descriptionAr: 'تخطيط ومحاذاة الحوائط',
        critical: true,
        verificationMethod: 'Laser level check',
        commonMistakes: ['Misaligned walls', 'Wrong room sizes']
      },
      {
        id: 'chk-032',
        description: 'Mortar mix ratio (1:4 for blockwork)',
        descriptionAr: 'نسبة خلط المونة (1:4 للبلوك)',
        critical: true,
        verificationMethod: 'Mix proportion check',
        commonMistakes: ['Weak mix', 'Too much water']
      },
      {
        id: 'chk-033',
        description: 'Reinforcement in blockwork (where required)',
        descriptionAr: 'التسليح في البلوك (حيثما يُشترط)',
        critical: true,
        verificationMethod: 'Drawing comparison',
        commonMistakes: ['Missing reinforcement', 'Wrong placement']
      },
      {
        id: 'chk-034',
        description: 'Plaster mix quality and application',
        descriptionAr: 'جودة خلط المحارة وتطبيقها',
        critical: true,
        verificationMethod: 'Visual and sounding test',
        commonMistakes: ['Hollow plaster', 'Poor adhesion']
      },
      {
        id: 'chk-035',
        description: 'Control joints installation',
        descriptionAr: 'تركيب فواصل التمدد',
        critical: true,
        verificationMethod: 'Visual inspection',
        commonMistakes: ['Missing joints', 'Wrong spacing']
      },
      {
        id: 'chk-036',
        description: 'Plaster curing',
        descriptionAr: 'معالجة المحارة',
        critical: true,
        verificationMethod: 'Curing records',
        commonMistakes: ['No curing', 'Premature drying']
      }
    ],
    approvalRequirements: [
      'Block quality certificate',
      'Plaster adhesion test',
      'Wall dimensional verification'
    ]
  },
  {
    stageId: 'stage-006',
    stageName: 'MEP Rough-in',
    stageNameAr: 'التمديدات الكهربائية والميكانيكية',
    paymentPercentage: 12,
    duration: '50 days',
    description: 'Electrical, plumbing, and HVAC rough installations',
    commonErrors: ['MEP-001', 'MEP-002', 'MEP-003', 'MEP-004'],
    checklist: [
      {
        id: 'chk-037',
        description: 'MEP coordination drawings approved',
        descriptionAr: 'موافقة المخططات التنسيقية للتمديدات',
        critical: true,
        verificationMethod: 'Drawing review with stamps',
        commonMistakes: ['No coordination', 'Clashes not resolved']
      },
      {
        id: 'chk-038',
        description: 'Electrical conduit routing',
        descriptionAr: 'توجيه مواسير الكهرباء',
        critical: true,
        verificationMethod: 'Route verification vs drawings',
        commonMistakes: ['Random routing', 'Insufficient conduits']
      },
      {
        id: 'chk-039',
        description: 'Plumbing pipe installation',
        descriptionAr: 'تركيب مواسير السباكة',
        critical: true,
        verificationMethod: 'Pressure test before conceal',
        commonMistakes: ['No pressure test', 'Wrong slopes']
      },
      {
        id: 'chk-040',
        description: 'HVAC ductwork installation',
        descriptionAr: 'تركيب مجاري التكييف',
        critical: true,
        verificationMethod: 'Leak test and airflow check',
        commonMistakes: ['Duct leaks', 'Poor insulation']
      },
      {
        id: 'chk-041',
        description: 'Water pressure test (24 hours minimum)',
        descriptionAr: 'اختبار ضغط المياه (24 ساعة على الأقل)',
        critical: true,
        verificationMethod: 'Pressure gauge reading',
        commonMistakes: ['Test too short', 'No documentation']
      },
      {
        id: 'chk-042',
        description: 'Electrical continuity and insulation tests',
        descriptionAr: 'اختبارات استمرارية وعزل الكهرباء',
        critical: true,
        verificationMethod: 'Megger test results',
        commonMistakes: ['Skipped tests', 'Faulty connections']
      },
      {
        id: 'chk-043',
        description: 'Fire protection system installation',
        descriptionAr: 'تركيب نظام الحماية من الحريق',
        critical: true,
        verificationMethod: 'Civil defense approval',
        commonMistakes: ['Wrong detector spacing', 'Missing devices']
      },
      {
        id: 'chk-044',
        description: 'MEP as-built drawings prepared',
        descriptionAr: 'إعداد مخططات التنفيذ الفعلي للتمديدات',
        critical: true,
        verificationMethod: 'Drawing review',
        commonMistakes: ['No as-builts', 'Inaccurate records']
      }
    ],
    approvalRequirements: [
      'Water pressure test certificate',
      'Electrical test reports',
      'HVAC commissioning report',
      'Civil defense approval',
      'MEP as-built drawings'
    ]
  },
  {
    stageId: 'stage-007',
    stageName: 'Finishing Works',
    stageNameAr: 'أعمال التشطيبات',
    paymentPercentage: 20,
    duration: '70 days',
    description: 'Flooring, painting, kitchen, and bathroom installations',
    commonErrors: ['FIN-002', 'FIN-003'],
    checklist: [
      {
        id: 'chk-045',
        description: 'Flooring material quality verification',
        descriptionAr: 'التحقق من جودة مواد الأرضيات',
        critical: true,
        verificationMethod: 'Material certificates',
        commonMistakes: ['Wrong grade', 'Insufficient quantity']
      },
      {
        id: 'chk-046',
        description: 'Tile installation with proper leveling',
        descriptionAr: 'تركيب السيراميك مع التسوية المناسبة',
        critical: true,
        verificationMethod: 'Level check and sounding',
        commonMistakes: ['Hollow tiles', 'Uneven surface']
      },
      {
        id: 'chk-047',
        description: 'Painting surface preparation',
        descriptionAr: 'تحضير السطح للدهان',
        critical: true,
        verificationMethod: 'Visual inspection',
        commonMistakes: ['Poor preparation', 'Primer skipped']
      },
      {
        id: 'chk-048',
        description: 'Paint application quality',
        descriptionAr: 'جودة تطبيق الدهان',
        critical: true,
        verificationMethod: 'Visual under different lighting',
        commonMistakes: ['Brush marks', 'Uneven coats']
      },
      {
        id: 'chk-049',
        description: 'Kitchen cabinet installation',
        descriptionAr: 'تركيب خزائن المطبخ',
        critical: true,
        verificationMethod: 'Level and alignment check',
        commonMistakes: ['Poor alignment', 'Gaps visible']
      },
      {
        id: 'chk-050',
        description: 'Bathroom fixtures installation',
        descriptionAr: 'تركيب أدوات الحمام',
        critical: true,
        verificationMethod: 'Function test',
        commonMistakes: ['Leaks', 'Poor sealing']
      },
      {
        id: 'chk-051',
        description: 'Door and window installation',
        descriptionAr: 'تركيب الأبواب والنوافذ',
        critical: true,
        verificationMethod: 'Operation test and sealing check',
        commonMistakes: ['Poor sealing', 'Difficulty operating']
      },
      {
        id: 'chk-052',
        description: 'Final cleaning',
        descriptionAr: 'التنظيف النهائي',
        critical: false,
        verificationMethod: 'Visual inspection',
        commonMistakes: ['Incomplete cleaning', 'Paint residue']
      }
    ],
    approvalRequirements: [
      'Material quality certificates',
      'Tile adhesion test sample',
      'Snagging list completion'
    ]
  },
  {
    stageId: 'stage-008',
    stageName: 'External Works',
    stageNameAr: 'أعمال الموقع الخارجي',
    paymentPercentage: 8,
    duration: '30 days',
    description: 'Landscaping, driveway, boundary wall, and external lighting',
    commonErrors: ['EXT-001', 'EXT-002'],
    checklist: [
      {
        id: 'chk-053',
        description: 'Landscaping design implementation',
        descriptionAr: 'تنفيذ تصميم المناظر الطبيعية',
        critical: false,
        verificationMethod: 'Design comparison',
        commonMistakes: ['Wrong plant species', 'Poor irrigation']
      },
      {
        id: 'chk-054',
        description: 'Driveway construction with proper slope',
        descriptionAr: 'بناء الممر مع الميل المناسب',
        critical: true,
        verificationMethod: 'Level check',
        commonMistakes: ['Poor drainage', 'Wrong slope']
      },
      {
        id: 'chk-055',
        description: 'Boundary wall construction',
        descriptionAr: 'بناء السور المحيط',
        critical: true,
        verificationMethod: 'Height and alignment check',
        commonMistakes: ['Height variation', 'Poor foundation']
      },
      {
        id: 'chk-056',
        description: 'Storm water drainage system',
        descriptionAr: 'نظام تصريف مياه الأمطار',
        critical: true,
        verificationMethod: 'Flow test',
        commonMistakes: ['Insufficient capacity', 'Wrong slopes']
      },
      {
        id: 'chk-057',
        description: 'External lighting installation',
        descriptionAr: 'تركيب الإضاءة الخارجية',
        critical: false,
        verificationMethod: 'Function test',
        commonMistakes: ['Poor positioning', 'Insufficient lighting']
      },
      {
        id: 'chk-058',
        description: 'Irrigation system installation',
        descriptionAr: 'تركيب نظام الري',
        critical: false,
        verificationMethod: 'Coverage test',
        commonMistakes: ['Poor coverage', 'Leaks']
      }
    ],
    approvalRequirements: [
      'Drainage flow test',
      'Landscape completion certificate'
    ]
  },
  {
    stageId: 'stage-009',
    stageName: 'Final Completion & Handover',
    stageNameAr: 'الانتهاء النهائي والتسليم',
    paymentPercentage: 20,
    duration: '20 days',
    description: 'Snagging, final inspection, documentation, and handover',
    commonErrors: ['CTR-001', 'CTR-002'],
    checklist: [
      {
        id: 'chk-059',
        description: 'Comprehensive snagging inspection',
        descriptionAr: 'فحص شامل للعيوب',
        critical: true,
        verificationMethod: 'Professional snagging report',
        commonMistakes: ['Self-inspection only', 'Missed defects']
      },
      {
        id: 'chk-060',
        description: 'All snags rectified',
        descriptionAr: 'إصلاح جميع العيوب',
        critical: true,
        verificationMethod: 'Re-inspection',
        commonMistakes: ['Incomplete rectification', 'Poor quality fix']
      },
      {
        id: 'chk-061',
        description: 'Final cleaning',
        descriptionAr: 'التنظيف النهائي',
        critical: true,
        verificationMethod: 'Visual inspection',
        commonMistakes: ['Dust remaining', 'Construction debris']
      },
      {
        id: 'chk-062',
        description: 'Final inspection by consultant',
        descriptionAr: 'الفحص النهائي من قبل الاستشاري',
        critical: true,
        verificationMethod: 'Consultant sign-off',
        commonMistakes: ['No professional inspection', 'Rushed approval']
      },
      {
        id: 'chk-063',
        description: 'Handover documentation complete',
        descriptionAr: 'استكمال وثائق التسليم',
        critical: true,
        verificationMethod: 'Document checklist',
        commonMistakes: ['Missing manuals', 'No as-built drawings']
      },
      {
        id: 'chk-064',
        description: 'Keys and access cards handed over',
        descriptionAr: 'تسليم المفاتيح وبطاقات الدخول',
        critical: true,
        verificationMethod: 'Inventory list',
        commonMistakes: ['Missing keys', 'Access not working']
      },
      {
        id: 'chk-065',
        description: 'Maintenance manual provided',
        descriptionAr: 'تقديم دليل الصيانة',
        critical: true,
        verificationMethod: 'Document review',
        commonMistakes: ['Generic manual', 'Missing equipment info']
      },
      {
        id: 'chk-066',
        description: 'Warranty documentation',
        descriptionAr: 'وثائق الضمان',
        critical: true,
        verificationMethod: 'Warranty register',
        commonMistakes: ['Missing warranties', 'Wrong dates']
      }
    ],
    approvalRequirements: [
      'Final completion certificate',
      'Snagging completion report',
      'As-built drawings',
      'Operation and maintenance manuals',
      'Warranty documents',
      'Keys handover receipt'
    ]
  }
];

// Helper function to get errors for a specific stage
export function getErrorsForStage(stageId: string): ConstructionError[] {
  const stage = stageChecklists.find(s => s.stageId === stageId);
  if (!stage) return [];
  return constructionErrors.filter(e => stage.commonErrors.includes(e.id));
}

// Helper function to get all critical errors
export function getCriticalErrors(): ConstructionError[] {
  return constructionErrors.filter(e => e.severity === 'critical');
}

// Helper function to get errors by category
export function getErrorsByCategory(category: ConstructionError['category']): ConstructionError[] {
  return constructionErrors.filter(e => e.category === category);
}
