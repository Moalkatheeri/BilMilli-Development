import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useProject } from '../context/ProjectContext';

const constructionStages = [
  {
    id: 'foundation',
    name: 'Foundation & Excavation',
    nameAr: 'الأساسات والحفر',
    description: 'Site preparation, excavation, and foundation work',
    descriptionAr: 'تحضير الموقع، الحفر، وأعمال الأساسات',
    duration: '4-8 weeks',
    checklist: [
      'Soil testing completed',
      'Excavation to required depth',
      'Foundation reinforcement installed',
      'Concrete pour completed',
      'Curing period observed',
    ],
    commonErrors: [
      'Insufficient soil compaction',
      'Incorrect reinforcement placement',
      'Inadequate concrete curing',
    ],
  },
  {
    id: 'structure',
    name: 'Structural Frame',
    nameAr: 'الهيكل الإنشائي',
    description: 'Columns, beams, slabs, and structural walls',
    descriptionAr: 'الأعمدة، الكمرات، البلاطات، والجدران الإنشائية',
    duration: '8-16 weeks',
    checklist: [
      'Column reinforcement approved',
      'Formwork installed correctly',
      'Concrete quality tested',
      'Structural connections verified',
    ],
    commonErrors: [
      'Honeycomb in concrete',
      'Misaligned columns',
      'Insufficient concrete cover',
    ],
  },
  {
    id: 'masonry',
    name: 'Masonry & Blockwork',
    nameAr: 'أعمال البلوك والمباني',
    description: 'Internal and external walls, partitions',
    descriptionAr: 'الجدران الداخلية والخارجية، الفواصل',
    duration: '4-8 weeks',
    checklist: [
      'Block quality verified',
      'Wall alignment checked',
      'Mortar mix approved',
      'Curing completed',
    ],
    commonErrors: [
      'Cracked blocks',
      'Uneven wall surfaces',
      'Poor mortar adhesion',
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical Rough-in',
    nameAr: 'أعمال الكهرباء الأولية',
    description: 'Conduit installation, wiring, junction boxes',
    descriptionAr: 'تركيب المواسير، الأسلاك، صناديق التوصيل',
    duration: '3-6 weeks',
    checklist: [
      'Conduit routing approved',
      'Wire sizing correct',
      'Junction boxes positioned',
      'Grounding system installed',
    ],
    commonErrors: [
      'Undersized wiring',
      'Poor conduit sealing',
      'Incorrect junction box depth',
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Rough-in',
    nameAr: 'أعمال السباكة الأولية',
    description: 'Water supply, drainage, sewer lines',
    descriptionAr: 'توفير المياه، الصرف، خطوط المجاري',
    duration: '3-6 weeks',
    checklist: [
      'Pipe pressure tested',
      'Drainage slope verified',
      'Waterproofing applied',
      'Cleanouts installed',
    ],
    commonErrors: [
      'Insufficient pipe slope',
      'Poor joint sealing',
      'Missing cleanouts',
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC Installation',
    nameAr: 'تركيب التكييف',
    description: 'Ductwork, units, vents, and controls',
    descriptionAr: 'مجاري الهواء، الوحدات، الفتحات، والتحكم',
    duration: '2-4 weeks',
    checklist: [
      'Ductwork sealed',
      'Unit capacity verified',
      'Vents positioned correctly',
      'Controls wired',
    ],
    commonErrors: [
      'Duct leaks',
      'Insufficient airflow',
      'Poor insulation',
    ],
  },
  {
    id: 'finishes',
    name: 'Interior Finishes',
    nameAr: 'التشطيبات الداخلية',
    description: 'Flooring, painting, ceiling, fixtures',
    descriptionAr: 'الأرضيات، الدهان، الأسقف، التجهيزات',
    duration: '6-12 weeks',
    checklist: [
      'Surface preparation done',
      'Paint quality approved',
      'Flooring installed',
      'Fixtures mounted',
    ],
    commonErrors: [
      'Paint peeling',
      'Uneven flooring',
      'Poor grout work',
    ],
  },
  {
    id: 'exterior',
    name: 'Exterior Works',
    nameAr: 'أعمال الواجهات الخارجية',
    description: 'Facade, windows, doors, landscaping',
    descriptionAr: 'الواجهة، النوافذ، الأبواب، التنسيق',
    duration: '4-8 weeks',
    checklist: [
      'Facade waterproofing done',
      'Windows sealed',
      'Doors aligned',
      'Drainage installed',
    ],
    commonErrors: [
      'Water infiltration',
      'Poor window sealing',
      'Inadequate drainage',
    ],
  },
  {
    id: 'final',
    name: 'Final Inspections',
    nameAr: 'الفحوصات النهائية',
    description: 'Snagging, testing, commissioning',
    descriptionAr: 'المسح، الاختبار، التشغيل',
    duration: '2-4 weeks',
    checklist: [
      'All systems tested',
      'Snag list completed',
      'Documentation handed over',
      'Final approval obtained',
    ],
    commonErrors: [
      'Incomplete punch list',
      'Missing documentation',
      'Unaddressed defects',
    ],
  },
];

const stageStatusColors = {
  not_started: '#8B9EB0',
  in_progress: '#FFCC00',
  completed: '#00D4AA',
  blocked: '#FF4444',
};

export default function StagesScreen() {
  const { currentProject } = useProject();
  const [expandedStage, setExpandedStage] = useState(null);
  const [projectStages, setProjectStages] = useState({});

  useEffect(() => {
    // In real app, fetch from API
    if (currentProject?.stages) {
      const stagesMap = {};
      currentProject.stages.forEach(stage => {
        stagesMap[stage.stageId] = stage;
      });
      setProjectStages(stagesMap);
    }
  }, [currentProject]);

  const getStageStatus = (stageId) => {
    return projectStages[stageId]?.status || 'not_started';
  };

  const getStageProgress = (stageId) => {
    return projectStages[stageId]?.progress || 0;
  };

  const toggleStage = (stageId) => {
    setExpandedStage(expandedStage === stageId ? null : stageId);
  };

  const renderStageCard = (stage, index) => {
    const status = getStageStatus(stage.id);
    const progress = getStageProgress(stage.id);
    const isExpanded = expandedStage === stage.id;
    const isActive = currentProject?.currentStage?.id === stage.id;

    return (
      <TouchableOpacity
        key={stage.id}
        style={[
          styles.stageCard,
          isActive && styles.stageCardActive,
        ]}
        onPress={() => toggleStage(stage.id)}
      >
        <View style={styles.stageHeader}>
          <View style={styles.stageNumber}>
            <Text style={styles.stageNumberText}>{index + 1}</Text>
          </View>
          
          <View style={styles.stageInfo}>
            <Text style={styles.stageName}>{stage.name}</Text>
            <Text style={styles.stageNameAr}>{stage.nameAr}</Text>
            <View style={styles.stageMeta}>
              <Text style={styles.stageDuration}>⏱ {stage.duration}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: stageStatusColors[status] }
              ]}>
                <Text style={styles.statusText}>
                  {status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: stageStatusColors[status]
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.stageDescription}>{stage.description}</Text>
            
            {/* Checklist */}
            <View style={styles.checklistSection}>
              <Text style={styles.sectionTitle}>Checklist</Text>
              {stage.checklist.map((item, idx) => (
                <View key={idx} style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>○</Text>
                  <Text style={styles.checklistText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Common Errors */}
            <View style={styles.errorsSection}>
              <Text style={styles.sectionTitle}>Common Errors to Watch</Text>
              {stage.commonErrors.map((error, idx) => (
                <View key={idx} style={styles.errorItem}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            {status !== 'completed' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>📸 Add Photos</Text>
                </TouchableOpacity>
                {status === 'in_progress' && (
                  <TouchableOpacity style={[styles.actionButton, styles.completeButton]}>
                    <Text style={styles.completeButtonText}>✓ Mark Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Construction Stages</Text>
        <Text style={styles.headerSubtitle}>
          {currentProject?.name || 'Select a project'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.stagesList}>
          {constructionStages.map((stage, index) => renderStageCard(stage, index))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    padding: 20,
    backgroundColor: '#111D2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#8B9EB0',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  stagesList: {
    padding: 16,
  },
  stageCard: {
    backgroundColor: '#111D2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  stageCardActive: {
    borderColor: '#00D4AA',
    borderWidth: 2,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stageNumberText: {
    color: '#00D4AA',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stageNameAr: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 2,
  },
  stageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stageDuration: {
    color: '#8B9EB0',
    fontSize: 12,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: '#8B9EB0',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#8B9EB0',
    fontSize: 12,
    marginLeft: 10,
    width: 40,
    textAlign: 'right',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  stageDescription: {
    color: '#8B9EB0',
    fontSize: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  checklistSection: {
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checklistIcon: {
    color: '#00D4AA',
    fontSize: 14,
    marginRight: 10,
    width: 20,
  },
  checklistText: {
    color: '#8B9EB0',
    fontSize: 13,
  },
  errorsSection: {
    marginBottom: 16,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#00D4AA',
    marginRight: 0,
    marginLeft: 8,
  },
  completeButtonText: {
    color: '#0A1628',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
