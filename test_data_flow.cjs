/**
 * 数据流测试脚本
 * 用于验证前后端数据通信和存储流程
 */

const http = require('http');
const net = require('net');

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

let testPassed = {
  connection: false,
  ackReceived: false,
  reportReceived: false,
  fieldsComplete: false
};

// 创建原生 WebSocket 连接
const socket = new net.Socket();
let buffer = '';

socket.connect(8000, 'localhost', () => {
  console.log('2. TCP 连接成功 ✓');
  testPassed.connection = true;
  
  // 发送 WebSocket 握手请求
  const key = Buffer.from(Math.random().toString()).toString('base64');
  const handshake = [
    'GET /ws/analyze HTTP/1.1',
    'Host: localhost:8000',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${key}`,
    'Sec-WebSocket-Version: 13',
    '',
    ''
  ].join('\r\n');
  
  socket.write(handshake);
});

socket.on('data', (data) => {
  buffer += data.toString();
  
  // 检查是否完成握手
  if (buffer.includes('HTTP/1.1 101') && !testPassed.ackReceived) {
    console.log('   WebSocket 握手成功 ✓');
    console.log('3. 发送 POSTURE_STEPPED_ANALYSIS 请求...\n');
    
    // 发送 WebSocket 帧
    const message = JSON.stringify(testData);
    const frame = createWebSocketFrame(message);
    socket.write(frame);
  }
  
  // 解析 WebSocket 帧
  try {
    const frames = parseWebSocketFrames(buffer);
    frames.forEach(frame => {
      if (frame.payload) {
        try {
          const response = JSON.parse(frame.payload);
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
            
            socket.end();
            process.exit(allPassed ? 0 : 1);
          }
        } catch (e) {
          // 不是 JSON 数据，忽略
        }
      }
    });
  } catch (e) {
    // 解析失败，继续等待更多数据
  }
});

socket.on('error', (error) => {
  console.error('连接错误:', error.message);
  console.log('请确保后端服务已启动 (python main.py)');
  process.exit(1);
});

socket.on('close', () => {
  console.log('\n连接已关闭');
});

// 创建 WebSocket 文本帧
function createWebSocketFrame(message) {
  const messageBuffer = Buffer.from(message, 'utf8');
  const messageLength = messageBuffer.length;
  
  let frame;
  if (messageLength < 126) {
    frame = Buffer.allocUnsafe(2);
    frame[0] = 0x81; // FIN=1, opcode=text
    frame[1] = messageLength;
  } else if (messageLength < 65536) {
    frame = Buffer.allocUnsafe(4);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(messageLength, 2);
  } else {
    frame = Buffer.allocUnsafe(10);
    frame[0] = 0x81;
    frame[1] = 127;
    frame.writeUInt32BE(0, 2);
    frame.writeUInt32BE(messageLength, 6);
  }
  
  return Buffer.concat([frame, messageBuffer]);
}

// 解析 WebSocket 帧
function parseWebSocketFrames(buffer) {
  const frames = [];
  let offset = 0;
  
  while (offset < buffer.length) {
    // 查找 HTTP 响应结束
    if (buffer.includes('HTTP/1.1 101')) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        offset = headerEnd + 4;
        continue;
      }
    }
    
    if (offset + 2 > buffer.length) break;
    
    const fin = (buffer[offset] & 0x80) === 0x80;
    const opcode = buffer[offset] & 0x0f;
    const masked = (buffer[offset + 1] & 0x80) === 0x80;
    let payloadLength = buffer[offset + 1] & 0x7f;
    
    let headerLength = 2;
    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLength = buffer.readUInt32BE(offset + 6);
      headerLength = 10;
    }
    
    const maskLength = masked ? 4 : 0;
    const totalLength = offset + headerLength + maskLength + payloadLength;
    
    if (totalLength > buffer.length) break;
    
    let payload = buffer.slice(offset + headerLength + maskLength, totalLength);
    
    if (masked) {
      const mask = buffer.slice(offset + headerLength, offset + headerLength + 4);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
    }
    
    frames.push({
      fin,
      opcode,
      payload: payload.toString('utf8')
    });
    
    offset = totalLength;
  }
  
  return frames;
}

// 超时处理
setTimeout(() => {
  console.log('\n✗ 测试超时 (30秒)');
  console.log('请检查后端服务是否正常运行');
  socket.end();
  process.exit(1);
}, 30000);
