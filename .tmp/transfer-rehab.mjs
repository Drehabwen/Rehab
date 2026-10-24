/**
 * 通过 CDP 在桌面端点击「数据中心 → 导出并传输」，验证真实数据流通。
 */
const CDP_PORT = Number(process.argv[2] ?? 9333);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let target = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await res.json();
      target = list.find((item) => item.type === 'page');
      if (target) break;
    } catch {}
    await sleep(500);
  }
  if (!target) throw new Error('no page target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const messageId = (id += 1);
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    return result.result?.result?.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');

  // 1) 点侧栏「数据中心」
  const nav = await evaluate(`(() => {
    const text = (el) => (el.innerText || '').replace(/\\s+/g, ' ').trim();
    const button = [...document.querySelectorAll('aside button, nav button, button')].find((el) => text(el).includes('数据中心'));
    if (!button) return 'nav-not-found';
    button.click();
    return 'clicked';
  })()`);
  console.log('nav:', nav);
  await sleep(1200);

  // 2) 点「导出并传输」
  const transfer = await evaluate(`(() => {
    const text = (el) => (el.innerText || '').replace(/\\s+/g, ' ').trim();
    const button = [...document.querySelectorAll('button')].find((el) => text(el).includes('导出并传输'));
    if (!button) return { found: false, buttons: [...document.querySelectorAll('button')].map(text).filter(Boolean).slice(0, 40) };
    button.click();
    return { found: true, disabled: button.disabled };
  })()`);
  console.log('transfer:', JSON.stringify(transfer));
  await sleep(4000);

  const bodyText = await evaluate(`(() => (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 900))()`);
  console.log('body:', bodyText);

  ws.close();
}

await main();
