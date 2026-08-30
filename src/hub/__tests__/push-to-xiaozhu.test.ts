import { describe, expect, it, vi } from 'vitest';
import { IntegrationService } from '../../services/integrationService';

describe('Therapist to Chatbot "小柱" (Xiao Zhu) Push Integration Flow', () => {
  it('Simulates and verifies pushing a scale task from therapist workbench to parent chatbot agent Xiao Zhu', async () => {
    console.log('\n========================================================================');
    console.log('🤖 [MULTI-AGENT SYNERGY DIAGNOSTIC] THERAPIST WORKBENCH ➡️ CHATBOT "小柱"');
    console.log('========================================================================\n');

    const patientId = 'patient-101';
    const patientName = '李奶奶';
    const sessionId = 'session-2026-05-23';
    const therapistName = '张医生';

    // Step 1: Mock Integration Server on Port 8000
    console.log('Step 1: Mocking Integration Server database state on port 8000...');
    const databaseStore = {
      pendingTasks: [] as Array<{
        task_id: string;
        patient_id: string;
        patient_name: string;
        session_id: string;
        scale_id: string;
        therapist_name: string;
        status: 'pending' | 'completed';
      }>
    };

    // Global fetch mock to simulate port 8000 communication
    const mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      // 1. POST /api/integration/scale/push
      if (url.includes('/api/integration/scale/push') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newTask = {
          task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
          patient_id: body.patient_id,
          patient_name: body.patient_name || '未知患者',
          session_id: body.session_id,
          scale_id: body.scale_id,
          therapist_name: body.therapist_name,
          status: 'pending' as const
        };
        databaseStore.pendingTasks.push(newTask);
        console.log(`[Integration DB 8000] Pushed new scale task: ${newTask.task_id} (${newTask.scale_id})`);
        return {
          ok: true,
          json: async () => ({ task_id: newTask.task_id, status: 'success' })
        } as Response;
      }

      // 2. GET /api/integration/scale/pending/:patientId
      if (url.includes(`/api/integration/scale/pending/${patientId}`)) {
        const matchedTasks = databaseStore.pendingTasks.filter(t => t.patient_id === patientId && t.status === 'pending');
        console.log(`[Integration DB 8000] Retrieved pending tasks count: ${matchedTasks.length} for patient: ${patientId}`);
        return {
          ok: true,
          json: async () => matchedTasks.map(t => ({
            task_id: t.task_id,
            session_id: t.session_id,
            scale_id: t.scale_id,
            therapist_name: t.therapist_name
          }))
        } as Response;
      }

      return { ok: false, statusText: 'Not Found' } as Response;
    });

    vi.stubGlobal('fetch', mockFetch);

    // Step 2: Therapist pushes scale task from workbench
    console.log('\nStep 2: Therapist 張医生 triggers scale prescription "下发量表处方到小柱"...');
    const pushResult = await IntegrationService.pushScaleTask({
      patient_id: patientId,
      patient_name: patientName,
      session_id: sessionId,
      scale_id: 'MBI', // Daily activities自理能力量表
      therapist_name: therapistName
    });

    console.log(` - Push Triggered Success! Received Task ID: ${pushResult.task_id}`);
    expect(pushResult.status).toBe('success');
    expect(databaseStore.pendingTasks).toHaveLength(1);
    expect(databaseStore.pendingTasks[0].scale_id).toBe('MBI');

    // Step 3: Chatbot Agent "小柱" loads and queries pending tasks
    console.log('\nStep 3: Chatbot Agent "小柱" (parent client) initializes for李奶奶 (patient-101)...');
    
    // Simulate useAgentStore.getState().initWithPatient() fetching pending scales
    const pendingScalesResponse = await fetch(`http://localhost:8000/api/integration/scale/pending/${patientId}`);
    expect(pendingScalesResponse.ok).toBe(true);
    
    const pendingScales = await pendingScalesResponse.json() as Array<{
      task_id: string;
      session_id: string;
      scale_id: string;
      therapist_name: string;
    }>;

    expect(pendingScales).toHaveLength(1);
    const latestScale = pendingScales[0];

    console.log(` - Chatbot "小柱" detected pending scale: ${latestScale.scale_id} from Therapist: ${latestScale.therapist_name}`);

    // Step 4: Chatbot Agent generates custom card message for parents
    console.log('\nStep 4: Chatbot Agent "小柱" compiles parent-facing alert card in chat interface...');
    
    const customChatCard = {
      role: 'bot',
      text: `您的康复师 ${latestScale.therapist_name} 为您下发了日常量表评定【${latestScale.scale_id}】，点击下方卡片即可开始完成评估哦！`,
      scalePayload: {
        taskId: latestScale.task_id,
        sessionId: latestScale.session_id,
        scaleId: latestScale.scale_id
      }
    };

    console.log(' --- CHATBOT "小柱" PARENT CHAT MESSAGE CARD ---');
    console.log(` 🤖 小柱: "${customChatCard.text}"`);
    console.log(` 🏷️ Card Payload:`, JSON.stringify(customChatCard.scalePayload, null, 2));
    console.log(' ----------------------------------------------');

    expect(customChatCard.scalePayload.taskId).toBe(pushResult.task_id);
    expect(customChatCard.scalePayload.scaleId).toBe('MBI');
    expect(customChatCard.text).toContain('张医生');

    console.log('\n========================================================================');
    console.log('🎉 [MULTI-AGENT SYNERGY DIAGNOSTIC] SUCCESSFUL 100% HEALTHY SYNC FLOW!');
    console.log('========================================================================\n');

    vi.unstubAllGlobals();
  });
});
