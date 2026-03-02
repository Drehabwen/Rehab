/**
 * 数据流测试脚本
 * 用于验证前后端数据通信和存储流程
 */

const WebSocket = require('ws');

// 模拟测试数据
const testData = {
  type: 'POSTURE_STEPPED_ANALYSIS',
  frames: [
    {
      view: 'front',
      width: 640,
      height: 480,
      timeSeriesLandmarks: [
        [
          { x: 0.5, y: 0.2, z: 0, visibility: 0.95 },  // nose
          { x: 0.4, y: 0.3, z: 0, visibility: 0.95 },  // left shoulder
          { x: 0.6, y: 0.3, z: 0, visibility: 0.95 },  // right shoulder
          { x: 0.4, y: 0.5, z: 0, visibility: 0.95 },  // left hip
          { x: 0.6, y: 0.5, z: 0, visibility: 0.95 },  // right hip
        ]
      ],
      timestamp: Date.now()
    }
  ],
  assessmentType: 'quick',
  mock: true,
  requestId: `test_${Date.now()}`
};

console.log('=== 开始数据流测试 ===\n');
console.log('1. 准备发送测试数据到后端...');
console.log('   数据类型:', testData.type);
console.log('   评估类型:', testData.assessmentType);
console.log('   帧数:', testData.frames.length);
console.log('   视角:', testData.frames[0].view);
console.log('');

const ws = new WebSocket('ws://localhost:8002/ws/analyze');

let testPassed = {
  connection: false,
  ackReceived: false,
  reportReceived: false,
  fieldsComplete: false
};

ws.on('open', () => {
  console.log('2. WebSocket 连接成功 ✓');
  testPassed.connection = true;
  
  console.log('3. 发送 POSTURE_STEPPED_ANALYSIS 请求...\n');
  ws.send(JSON.stringify(testData));
});

ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('4. 收到响应:', response.type);
    
    if (response.type === 'POSTURE_ACK') {
      console.log('   ✓ 收到 ACK 确认');
      testPassed.ackReceived = true;
      console.log('   请求ID:', response.requestId);
      console.log('   时间戳:', new Date(response.timestamp).toLocaleString());
      console.log('');
    }
    
    if (response.type === 'POSTURE_REPORT') {
      console.log('5. 收到 POSTURE_REPORT 响应 ✓');
      testPassed.reportReceived = true;
      
      // 检查字段完整性
      const requiredFields = [
        'type', 'markdown', 'reportId', 'timeSeries', 
        'metrics', 'auxiliaryDiagnosis', 'issues', 
        'timestamp', 'assessmentType'
      ];
      
      console.log('\n6. 字段完整性检查:');
      let allFieldsPresent = true;
      
      requiredFields.forEach(field => {
        const hasField = response.hasOwnProperty(field);
        const status = hasField ? '✓' : '✗';
        console.log(`   ${status} ${field}: ${hasField ? '存在' : '缺失'}`);
        if (!hasField) allFieldsPresent = false;
      });
      
      testPassed.fieldsComplete = allFieldsPresent;
      
      // 显示数据详情
      console.log('\n7. 数据详情:');
      console.log('   reportId:', response.reportId);
      console.log('   markdown长度:', response.markdown?.length || 0);
      console.log('   timeSeries长度:', response.timeSeries?.length || 0);
      console.log('   metrics:', JSON.stringify(response.metrics));
      console.log('   auxiliaryDiagnosis:', response.auxiliaryDiagnosis?.substring(0, 50) + '...');
      console.log('   issues数量:', response.issues?.length || 0);
      console.log('   timestamp:', new Date(response.timestamp).toLocaleString());
      console.log('   assessmentType:', response.assessmentType);
      
      if (response.issues && response.issues.length > 0) {
        console.log('\n8. Issues 详情:');
        response.issues.forEach((issue, index) => {
          console.log(`   [${index + 1}] ${issue.title} (${issue.severity})`);
          console.log(`       描述: ${issue.description}`);
          console.log(`       建议: ${issue.recommendation}`);
        });
      }
      
      // 打印测试结果
      console.log('\n=== 测试结果 ===');
      console.log('连接建立:', testPassed.connection ? '✓ 通过' : '✗ 失败');
      console.log('ACK接收:', testPassed.ackReceived ? '✓ 通过' : '✗ 失败');
      console.log('报告接收:', testPassed.reportReceived ? '✓ 通过' : '✗ 失败');
      console.log('字段完整:', testPassed.fieldsComplete ? '✓ 通过' : '✗ 失败');
      
      const allPassed = Object.values(testPassed).every(v => v);
      console.log('\n总体结果:', allPassed ? '✓ 所有测试通过' : '✗ 部分测试失败');
      
      ws.close();
      process.exit(allPassed ? 0 : 1);
    }
    
    if (response.type === 'ERROR') {
      console.log('✗ 收到错误响应:', response.message);
      console.log('错误码:', response.code);
      ws.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('解析响应失败:', error);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket 错误:', error.message);
  console.log('请确保后端服务已启动 (python main.py)');
  process.exit(1);
});

ws.on('close', () => {
  console.log('\nWebSocket 连接已关闭');
});

// 超时处理
setTimeout(() => {
  console.log('\n✗ 测试超时 (30秒)');
  console.log('请检查后端服务是否正常运行');
  ws.close();
  process.exit(1);
}, 30000);
