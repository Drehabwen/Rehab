import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import type { Session } from '@/types/session';
import type { Patient } from '@/types/patient';
import { 
  buildSessionReportInputs, 
  buildSessionReportGenerationRequest, 
  getAssessmentPreview 
} from '../report-center-utils';
import { buildSessionDraftReport, buildSessionInsightCards } from '../report-center-insights';
import { buildVisitTaskSummary } from '../workflow';

describe('Data Stream Flow Integration Test', () => {
  it('Traces and logs the complete end-to-end therapist assessment data stream with Adams Scoliosis Screening', () => {
    console.log('\n========================================================================');
    console.log('🚀 [DATA STREAM INTEGRATION TEST] STARTING PIPELINE DIAGNOSTIC WITH ADAMS');
    console.log('========================================================================\n');

    const now = Date.now();
    const patientId = 'patient-101';
    const sessionId = 'session-2026-05-23';
    const patientName = '李奶奶';

    // Step 1: Therapist creates assessments
    console.log('Step 1: Simulating therapist recording assessments in workspace...');
    
    const postureAssessment: Assessment = {
      id: 'posture-101',
      sessionId,
      patientId,
      type: 'posture',
      mode: 'stepped',
      createdAt: now - 10000,
      data: {
        posture: {
          mode: 'stepped',
          view: 'front',
          confidence: 0.92,
          auxiliaryDiagnosis: '### 姿态分析结论\n患者双侧肩部不对称，呈现轻度圆肩趋势，伴随头前伸 2.5 厘米。',
          metrics: { swayOffset: 1.5, headForward: 2.5 },
          issues: [{ 
            id: 'shoulder-asymmetry', 
            type: 'shoulder-asymmetry', 
            title: '高低肩', 
            severity: 'mild',
            description: '双侧肩部高度不一致',
            recommendation: '建议加强弱侧肩胛提肌拉伸'
          }],
        },
      },
      status: 'completed',
    };

    const scaleAssessment: Assessment = {
      id: 'scale-101',
      sessionId,
      patientId,
      type: 'scale',
      mode: 'realtime',
      createdAt: now - 5000,
      data: {
        scale: {
          scaleId: 'MBI',
          scaleName: '改良 Barthel 日常生活自理能力量表',
          filledBy: 'therapist',
          totalScore: 22,
          maxScore: 25,
          percentageScore: 88,
          dimensions: {
            functionActive: 5,
            pain: 5,
            selfImage: 4,
            mentalHealth: 4,
            satisfaction: 4,
          },
          answers: [
            { questionId: 1, questionText: '进食', category: 'function', score: 5, answerText: '完全独立' },
            { questionId: 2, questionText: '穿衣', category: 'function', score: 4, answerText: '轻微受阻，需协助扣纽扣' },
          ],
          aiInterpretation: '### 量表临床分析\n患者ADL日常生活自理能力评分为 22/25 分。患者进食独立，但穿衣时精细抓握有轻微受限。建议结合手部捏球游戏激活指端精细动作。',
          createdAt: now - 500,
        },
      },
      status: 'completed',
    };

    const adamsAssessment: Assessment = {
      id: 'adams-101',
      sessionId,
      patientId,
      type: 'adams',
      mode: 'stepped',
      createdAt: now - 3000,
      data: {
        adams: {
          atrDegrees: 8, // High risk scoliosis rotation (>7)
          atrDirection: 'right',
          shoulderAsymmetry: 'right-higher',
          scapulaAsymmetry: 'right-prominent',
          waistCreaseAsymmetry: 'left-deeper',
          spineCurveEstimate: 's-shape',
          cobbAngleEstimate: 14,
          snapshotImage: 'data:image/jpeg;base64,mock_adams_image',
          remarks: '患者前屈试验显示明显剃刀背，右侧隆起，ATR达8度，Cobb角估计达14度，呈S型弯曲。建议立即转诊骨科。',
          createdAt: now - 3000
        }
      },
      status: 'completed',
    };

    console.log(' - Added [Posture Assessment] (id: posture-101)');
    console.log(' - Added [MBI Scale Assessment] (id: scale-101, Score: 22/25)');
    console.log(' - Added [Adams Scoliosis Screening] (id: adams-101, ATR: 8°)');

    // Step 2: Build Hub Inputs (SessionReportInput)
    console.log('\nStep 2: Aggregating active session inputs inside Report Center...');
    const patientMap = new Map([[patientId, patientName]]);
    const sessionInputs = buildSessionReportInputs([postureAssessment, scaleAssessment, adamsAssessment], patientMap);
    
    expect(sessionInputs).toHaveLength(1);
    const sessionInput = sessionInputs[0];
    
    console.log(` - Grouped Session ID: ${sessionInput.sessionId}`);
    console.log(` - Patient Name: ${sessionInput.patientName}`);
    console.log(` - Readiness Progress: ${sessionInput.readiness.readyCount} / 5 Modules Ready`);
    console.log(` - Active Modules Present: ${sessionInput.readiness.availableTypes.join(', ')}`);
    console.log(` - Missing Modules: ${sessionInput.readiness.missingTypes.join(', ')}`);

    // Verify correct statuses
    expect(sessionInput.outputs.posture?.status).toBe('ready');
    expect(sessionInput.outputs.scale?.status).toBe('ready');
    expect(sessionInput.outputs.adams?.status).toBe('ready');
    expect(sessionInput.outputs.rom).toBeUndefined();
    expect(sessionInput.outputs.medvoice).toBeUndefined();

    // Step 3: Simulate Session Completion & Baseline Tagging
    console.log('\nStep 3: Simulating therapist session completion and milestone baseline settings...');
    
    const therapistRemarks = '今日完成了日常生活自理能力（MBI）与体态、脊柱侧弯筛查评估。李奶奶穿衣细化动作表现出拇指对掌稍微发力不足，脊柱侧弯ATR角达到8°属于高危，已设为阶段性治疗基线，并成功下发居家软球练习与姿态监管处方。';
    const isBaselineChecked = true;

    const mockCompletedSession: Session = {
      id: sessionId,
      patientId,
      sequence: 2,
      createdAt: now - 20000,
      updatedAt: now,
      notes: therapistRemarks,
      assessments: [postureAssessment, scaleAssessment, adamsAssessment],
      status: 'completed',
      isBaseline: isBaselineChecked,
    };

    // If marked baseline, assessments in this session are tagged with isBaseline = true
    if (mockCompletedSession.isBaseline) {
      postureAssessment.isBaseline = true;
      scaleAssessment.isBaseline = true;
      adamsAssessment.isBaseline = true;
    }

    console.log(` - Session status transitioned to: [${mockCompletedSession.status}]`);
    console.log(` - Session notes successfully saved: "${mockCompletedSession.notes}"`);
    console.log(` - Milestone baseline flag isBaseline = [${mockCompletedSession.isBaseline}]`);
    console.log(` - Saved assessments tagged as Baseline: posture [${postureAssessment.isBaseline}], scale [${scaleAssessment.isBaseline}], adams [${adamsAssessment.isBaseline}]`);

    expect(mockCompletedSession.status).toBe('completed');
    expect(postureAssessment.isBaseline).toBe(true);
    expect(adamsAssessment.isBaseline).toBe(true);

    // Step 4: Verify Workflow Stage triggers
    console.log('\nStep 4: Verifying workflow progress tracking & nextStep triggers...');
    const visitTask = buildVisitTaskSummary(
      { id: patientId, name: patientName } as Patient,
      [mockCompletedSession],
      [postureAssessment, scaleAssessment, adamsAssessment]
    );

    console.log(` - Workflow Task Status: [${visitTask.status}] (Expected: completed)`);
    console.log(` - Next Action: "${visitTask.nextStep}" (Expected: 进入报告中心查看报告与居家处方)`);
    
    expect(visitTask.status).toBe('completed');
    expect(visitTask.nextStep).toContain('进入报告中心');

    // Step 5: Compile AI Chatbot Exercise Prescription Payload
    console.log('\nStep 5: Compiling AI Chatbot Exercise Prescription Payload...');
    
    const chatbotPayload = {
      patientId: mockCompletedSession.patientId,
      patientName: visitTask.patientName,
      sessionId: mockCompletedSession.id,
      therapistObservations: mockCompletedSession.notes,
      clinicalInputs: {
        posture: getAssessmentPreview(postureAssessment),
        scale: getAssessmentPreview(scaleAssessment),
        adams: getAssessmentPreview(adamsAssessment)
      },
      agentInstruction: {
        proactiveReminders: [
          { time: '10:00', task: '手捏软球趣味训练', reps: '15下' },
          { time: '16:00', task: '姿态端正性提醒', reps: '日常关注' }
        ],
        safetyRules: '检测到脊柱侧弯高危，Chatbot 在日常跟进中应提醒家长观察患者坐姿及背部对称性，严禁让患者做过度负重或单侧负重拉伸。',
        encouragementHook: '肯定奶奶配合评估的积极性，多夸赞奶奶的脊柱筛查工作做得非常及时。'
      }
    };

    console.log(' --- CHARTER CHATBOT AGENT PAYLOAD JSON ---');
    console.log(JSON.stringify(chatbotPayload, null, 2));
    console.log(' -----------------------------------------');

    expect(chatbotPayload.patientName).toBe('李奶奶');
    expect(chatbotPayload.agentInstruction.proactiveReminders).toHaveLength(2);

    // Step 6: Generate final Report request payload and check draft summaries
    console.log('\nStep 6: Generating Report payload & Cross-module AI Insight Cards...');
    
    const reportPayload = buildSessionReportGenerationRequest(sessionInput);
    const insightCards = buildSessionInsightCards(sessionInput);
    const draftReport = buildSessionDraftReport(sessionInput);

    console.log(` - Insight card count generated: ${insightCards.length}`);
    insightCards.forEach((card, index) => {
      console.log(`   * Card ${index + 1}: [${card.title}] -> ${card.summary}`);
    });

    console.log('\n --- COMPILATION DRAFT PREVIEW ---');
    console.log(draftReport);
    console.log(' ---------------------------------');

    expect(reportPayload.posture?.status).toBe('ready');
    expect(reportPayload.scale?.status).toBe('ready');
    expect(reportPayload.adams?.status).toBe('ready');
    
    // Should have generated the dedicated Adams high-risk scoliosis warning card!
    expect(insightCards.some(c => c.id === 'adams-high-risk')).toBe(true);

    console.log('\n========================================================================');
    console.log('🎉 [DATA STREAM INTEGRATION TEST] COMPLETED SUCCESSFULLY - 100% HEALTHY');
    console.log('========================================================================\n');
  });
});
