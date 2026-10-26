# 端侧 ASR 资源（sherpa-onnx WASM）

把模型与运行时放到本目录，构建后由 `/asr/` 访问（Vite public 目录）。

```
public/asr/
  sherpa-onnx-wasm-main.js
  sherpa-onnx-wasm-main.wasm
  sherpa-onnx-wasm-main.data
  model/
    model.onnx        # 中文模型（int8 量化，建议 30-60MB 内）
    tokens.txt
```

推荐模型（二选一）：
- sherpa-onnx-streaming-zipformer-zh-14M（流式，体积小）
- sherpa-onnx-offline-paraformer-zh（离线，准确率高）

未放置资源时，应用自动降级为「关键要点点选」，不影响接诊流程。
