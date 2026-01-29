import tkinter as tk
from tkinter import ttk, messagebox
import customtkinter as ctk
import json
import threading
import os
from datetime import datetime
import sys
import requests
import importlib
import nlp_processor
import case_structurer
import voice
import case_manager
import document_generator

from case_manager import CaseManager
from document_generator import DocumentGenerator
from nlp_processor import NLPProcessor
from case_structurer import CaseStructurer

# 设置外观
ctk.set_appearance_mode("System")
ctk.set_default_color_theme("green")  # 改为绿色基调，后续手动调整低饱和度

class VoiceToCaseApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("智能语音转病例助手 (MVP)")
        
        # 优化初始窗口大小及最小尺寸，提升不同分辨率下的适配性
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        
        width = min(1200, int(screen_width * 0.8))
        height = min(900, int(screen_height * 0.8))
        
        self.geometry(f"{width}x{height}")
        self.minsize(1000, 750) # 设置最小尺寸防止 UI 崩溃
        
        self.configure(fg_color=("#FCF8F3", "#1A1A1A")) # 设置主窗口米白色背景
        
        self.load_config()
        self.case_manager = CaseManager(self.config)
        self.document_generator = DocumentGenerator(self.config)
        self.nlp_processor = NLPProcessor(self.config)
        self.case_structurer = CaseStructurer(self.nlp_processor)
        
        self.voice_recognizer = voice.VoiceRecognizer(self.config)
        
        self.current_case = None
        self.transcript_text = ""
        self.is_recording = False
        
        self.create_ui()
        
    def load_config(self):
        config_path = "config.json"
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        else:
            self.config = {
                "hospital_name": "XX社区卫生服务中心",
                "doctor_name": "王医生",
                "audio_sample_rate": 16000,
                "audio_channels": 1,
                "cases_dir": "./cases",
                "exports_dir": "./exports"
            }
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)

    def create_ui(self):
        # 配置网格布局
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # 创建侧边栏
        self.sidebar_frame = ctk.CTkFrame(self, width=160, corner_radius=0, fg_color=("#F2EFE9", "#252525")) # 暖米色背景
        self.sidebar_frame.grid(row=0, column=0, rowspan=4, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)
        
        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="AI 病历助手", font=ctk.CTkFont(size=20, weight="bold"), text_color=("#2C3E50", "#AED6F1"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))
        
        self.new_button = ctk.CTkButton(self.sidebar_frame, text="新建病例", command=self.new_case, fg_color="#7FB3D5", hover_color="#5499C7")
        self.new_button.grid(row=1, column=0, padx=20, pady=10)
        
        self.open_button = ctk.CTkButton(self.sidebar_frame, text="刷新历史", command=self.refresh_history, fg_color="#82E0AA", hover_color="#58D68D")
        self.open_button.grid(row=2, column=0, padx=20, pady=10)
        
        self.reload_button = ctk.CTkButton(self.sidebar_frame, text="全量同步代码", command=self.reload_ai_modules, fg_color="#A2D9CE", hover_color="#76D7C4", text_color="#1B4F72")
        self.reload_button.grid(row=3, column=0, padx=20, pady=10)
        
        self.settings_button = ctk.CTkButton(self.sidebar_frame, text="软件设置", command=self.show_settings, fg_color="#BDC3C7", hover_color="#A6ACAF")
        self.settings_button.grid(row=4, column=0, padx=20, pady=10)
        
        self.appearance_mode_label = ctk.CTkLabel(self.sidebar_frame, text="外观模式:", anchor="w")
        self.appearance_mode_label.grid(row=5, column=0, padx=20, pady=(10, 0))
        self.appearance_mode_optionemenu = ctk.CTkOptionMenu(self.sidebar_frame, values=["Light", "Dark", "System"],
                                                                       command=self.change_appearance_mode_event)
        self.appearance_mode_optionemenu.grid(row=6, column=0, padx=20, pady=(10, 10))
        self.appearance_mode_optionemenu.set("System")

        # 创建主容器
        self.main_container = ctk.CTkFrame(self, corner_radius=10, fg_color=("#FCF8F3", "#1E1E1E"))
        self.main_container.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        self.main_container.grid_columnconfigure(0, weight=1)
        self.main_container.grid_columnconfigure(1, weight=1)
        self.main_container.grid_rowconfigure(0, weight=3)
        self.main_container.grid_rowconfigure(1, weight=2)

        self.create_transcription_panel(self.main_container)
        self.create_case_form_panel(self.main_container)
        self.create_history_panel(self.main_container)

    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)

    def reload_ai_modules(self):
        """
        全量热更新：重新加载所有业务逻辑模块
        无需重启软件即可使修改后的代码（包括 UI 逻辑之外的所有 .py 文件）生效
        """
        try:
            # 1. 重新加载配置 (以防代码中写死了新路径)
            self.load_config()
            
            # 2. 重新加载所有核心 Python 模块
            importlib.reload(voice)
            importlib.reload(nlp_processor)
            importlib.reload(case_structurer)
            importlib.reload(case_manager)
            importlib.reload(document_generator)
            
            # 3. 重新实例化所有业务对象
            # 注意：这里会保留当前 UI 状态，但底层处理逻辑已更新
            self.case_manager = case_manager.CaseManager(self.config)
            self.document_generator = document_generator.DocumentGenerator(self.config)
            self.nlp_processor = nlp_processor.NLPProcessor(self.config)
            self.case_structurer = case_structurer.CaseStructurer(self.nlp_processor)
            
            # 特别处理录音对象：确保旧的录音线程（如果有）不会冲突
            if self.is_recording:
                self.voice_recognizer.stop()
                self.is_recording = False
                self.record_button.configure(text="开始录音", fg_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"])
            
            self.voice_recognizer = voice.VoiceRecognizer(self.config)
            
            messagebox.showinfo("热更新成功", "所有底层逻辑模块已重新加载！\n\n更新范围：\n- 录音转写逻辑 (voice.py)\n- AI 分析提示词 (nlp_processor.py)\n- 病历结构化逻辑 (case_structurer.py)\n- 导出文档格式 (document_generator.py)\n- 数据存储方式 (case_manager.py)")
            self.status_label.configure(text="状态：全量模块热更新成功")
        except Exception as e:
            messagebox.showerror("热更新失败", f"重新加载模块时出错: {str(e)}")

    def add_right_click_menu(self, widget):
        """为输入框添加右键菜单并增强无障碍支持"""
        # 对于 CustomTkinter 包装的 Entry，尝试获取内部的真实 Entry
        target_widget = widget._entry if hasattr(widget, "_entry") else widget
        
        menu = tk.Menu(target_widget, tearoff=0)
        menu.add_command(label="剪切", command=lambda: self._accessible_action(target_widget, "<<Cut>>", "内容已剪切"))
        menu.add_command(label="复制", command=lambda: self._accessible_action(target_widget, "<<Copy>>", "内容已复制"))
        menu.add_command(label="粘贴", command=lambda: self._accessible_action(target_widget, "<<Paste>>", "内容已粘贴"))
        menu.add_separator()
        menu.add_command(label="全选", command=lambda: self._accessible_action(target_widget, "<<SelectAll>>", "内容已全选"))

        def show_menu(event):
            target_widget.focus_set()
            menu.tk_popup(event.x_root, event.y_root)

        target_widget.bind("<Button-3>", show_menu)
        
        # 键盘焦点视觉反馈
        target_widget.bind("<FocusIn>", lambda e: self._on_focus_change(widget, True))
        target_widget.bind("<FocusOut>", lambda e: self._on_focus_change(widget, False))

        # 标准键盘快捷键监听
        target_widget.bind("<Control-a>", lambda e: self._accessible_action(target_widget, "<<SelectAll>>", "内容已全选"))
        target_widget.bind("<Control-A>", lambda e: self._accessible_action(target_widget, "<<SelectAll>>", "内容已全选"))
        target_widget.bind("<Control-c>", lambda e: self._accessible_action(target_widget, "<<Copy>>", "内容已复制"))
        target_widget.bind("<Control-C>", lambda e: self._accessible_action(target_widget, "<<Copy>>", "内容已复制"))
        target_widget.bind("<Control-v>", lambda e: self._accessible_action(target_widget, "<<Paste>>", "内容已粘贴"))
        target_widget.bind("<Control-V>", lambda e: self._accessible_action(target_widget, "<<Paste>>", "内容已粘贴"))
        target_widget.bind("<Control-Insert>", lambda e: self._accessible_action(target_widget, "<<Copy>>", "内容已复制"))
        target_widget.bind("<Shift-Insert>", lambda e: self._accessible_action(target_widget, "<<Paste>>", "内容已粘贴"))

    def _on_focus_change(self, widget, has_focus):
        """增强焦点的视觉指示"""
        if has_focus:
            # 增加高亮边框色（模拟 WCAG 焦点指示器）
            if hasattr(widget, "configure"):
                try:
                    widget.configure(border_color="#3498DB", border_width=2)
                except: pass
        else:
            if hasattr(widget, "configure"):
                try:
                    widget.configure(border_color=ctk.ThemeManager.theme["CTkEntry"]["border_color"], border_width=1)
                except: pass

    def _accessible_action(self, widget, event_name, announcement):
        """执行动作并向屏幕阅读器/状态栏发送播报"""
        widget.focus_set()
        
        # 针对粘贴动作做特殊加强处理
        if event_name == "<<Paste>>":
            try:
                # 尝试从剪贴板直接读取并插入，这比 event_generate 更可靠
                clipboard_text = self.clipboard_get()
                if clipboard_text:
                    # 如果有选中内容，先删除
                    try:
                        # tk.Text 支持 tag_ranges, tk.Entry 使用 select_present
                        is_text = hasattr(widget, "tag_ranges")
                        if is_text:
                            if widget.tag_ranges("sel"):
                                widget.delete(tk.SEL_FIRST, tk.SEL_LAST)
                        else:
                            if widget.select_present():
                                widget.delete(tk.SEL_FIRST, tk.SEL_LAST)
                    except (tk.TclError, AttributeError):
                        pass
                    widget.insert(tk.INSERT, clipboard_text)
                    self.announce_status(announcement)
                    return "break"
            except Exception as e:
                pass # 忽略错误，回退到标准事件生成
        
        widget.event_generate(event_name)
        self.announce_status(announcement)
        return "break"

    def _copy_to_clipboard(self, entry_widget):
        """通用复制功能，带无障碍反馈"""
        content = entry_widget.get()
        self.root.clipboard_clear()
        self.root.clipboard_append(content)
        self.announce_status("API 内容已复制到剪贴板")
        
    def announce_status(self, message):
        """向辅助技术用户播报确认信息 (ARIA Live 区域等效实现)"""
        if hasattr(self, "status_label"):
            self.status_label.configure(text=f"状态：{message}")
        
        # 屏幕阅读器通常会捕捉对话框标题或系统提示，这里使用短暂的提示音或静默弹窗（可选）
        # 在 GUI 中，状态栏的文本变化是最标准的无障碍反馈方式
        print(f"[Accessibility Announcement]: {message}")

    def show_settings(self):
        settings_win = ctk.CTkToplevel(self)
        settings_win.title("软件设置")
        
        # 适配不同高度的屏幕
        screen_height = self.winfo_screenheight()
        win_height = min(900, int(screen_height * 0.9))
        settings_win.geometry(f"600x{win_height}")
        
        settings_win.after(100, lambda: settings_win.focus())
        # settings_win.grab_set()  # 移除 grab_set 以免阻塞主界面交互，提升用户体验
        
        frame = ctk.CTkScrollableFrame(settings_win, width=560, height=850)
        frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 预设配置
        API_PRESETS = {
            "deepseek": "DeepSeek (api.deepseek.com)",
            "zhipu": "智谱 AI (open.bigmodel.cn)",
            "moonshot": "Moonshot (api.moonshot.cn)",
            "ollama": "Ollama (localhost:11434)",
            "openai_generic": "其他 (OpenAI 协议)"
        }

        # --- 基础设置 ---
        ctk.CTkLabel(frame, text="基础设置", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor=tk.W, pady=(10, 5), padx=10)
        
        base_info_frame = ctk.CTkFrame(frame, fg_color="transparent")
        base_info_frame.pack(fill=tk.X, padx=10)
        
        ctk.CTkLabel(base_info_frame, text="医院名称：", width=100).grid(row=0, column=0, sticky=tk.W, pady=5)
        hosp_entry = ctk.CTkEntry(base_info_frame, width=350)
        hosp_entry.insert(0, self.config.get("hospital_name", ""))
        hosp_entry.grid(row=0, column=1, pady=5)
        self.add_right_click_menu(hosp_entry)
        
        ctk.CTkLabel(base_info_frame, text="医生姓名：", width=100).grid(row=1, column=0, sticky=tk.W, pady=5)
        doc_entry = ctk.CTkEntry(base_info_frame, width=350)
        doc_entry.insert(0, self.config.get("doctor_name", ""))
        doc_entry.grid(row=1, column=1, pady=5)
        self.add_right_click_menu(doc_entry)

        # --- 录音与转写设置 ---
        ctk.CTkFrame(frame, height=2, fg_color="gray").pack(fill=tk.X, pady=15, padx=10)
        ctk.CTkLabel(frame, text="录音与转写 (ASR) 设置", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor=tk.W, pady=(0, 5), padx=10)
        
        asr_frame = ctk.CTkFrame(frame, fg_color="transparent")
        asr_frame.pack(fill=tk.X, padx=10)
        
        ctk.CTkLabel(asr_frame, text="讯飞 AppID：", width=100).grid(row=0, column=0, sticky=tk.W, pady=5)
        asr_appid_entry = ctk.CTkEntry(asr_frame, width=350)
        asr_appid_entry.insert(0, self.config.get("asr_appid", ""))
        asr_appid_entry.grid(row=0, column=1, pady=5)
        self.add_right_click_menu(asr_appid_entry)
        
        ctk.CTkLabel(asr_frame, text="讯飞 API Key：", width=100).grid(row=1, column=0, sticky=tk.W, pady=5)
        asr_key_entry = ctk.CTkEntry(asr_frame, width=350)
        asr_key_entry.insert(0, self.config.get("asr_api_key", ""))
        asr_key_entry.grid(row=1, column=1, pady=5)
        self.add_right_click_menu(asr_key_entry)
        
        ctk.CTkLabel(asr_frame, text="讯飞 API Secret：", width=100).grid(row=2, column=0, sticky=tk.W, pady=5)
        asr_secret_entry = ctk.CTkEntry(asr_frame, width=350, show="*")
        asr_secret_entry.insert(0, self.config.get("asr_api_secret", ""))
        asr_secret_entry.grid(row=2, column=1, pady=5)
        self.add_right_click_menu(asr_secret_entry)

        ctk.CTkLabel(asr_frame, text="音频采样率：", width=100).grid(row=3, column=0, sticky=tk.W, pady=5)
        sample_rate_menu = ctk.CTkOptionMenu(asr_frame, values=["8000", "16000"], width=350)
        sample_rate_menu.set(str(self.config.get("audio_sample_rate", 16000)))
        sample_rate_menu.grid(row=3, column=1, pady=5)
        
        ctk.CTkLabel(asr_frame, text="转写语言：", width=100).grid(row=4, column=0, sticky=tk.W, pady=5)
        lang_menu = ctk.CTkOptionMenu(asr_frame, values=["zh_cn", "en_us"], width=350)
        lang_menu.set(self.config.get("iat_language", "zh_cn"))
        lang_menu.grid(row=4, column=1, pady=5)
        
        ctk.CTkLabel(asr_frame, text="角色分离：", width=100).grid(row=5, column=0, sticky=tk.W, pady=5)
        diarization_var = tk.BooleanVar(value=self.config.get("enable_diarization", False))
        ctk.CTkCheckBox(asr_frame, text="开启 [医生/患者] 识别 (需讯飞权限)", variable=diarization_var).grid(row=5, column=1, sticky=tk.W, pady=5)

        # --- 模型配置辅助函数 ---
        def create_model_block(parent, title, config_prefix):
            block = ctk.CTkFrame(parent, fg_color="gray25", corner_radius=10)
            block.pack(fill=tk.X, padx=10, pady=10)
            
            ctk.CTkLabel(block, text=title, font=ctk.CTkFont(size=13, weight="bold")).pack(anchor=tk.W, padx=15, pady=5)
            
            # 提供商选择
            ctrl_frame = ctk.CTkFrame(block, fg_color="transparent")
            ctrl_frame.pack(fill=tk.X, padx=10, pady=5)
            
            ctk.CTkLabel(ctrl_frame, text="提供商：", width=80).grid(row=0, column=0, sticky=tk.W)
            provider_menu = ctk.CTkOptionMenu(ctrl_frame, values=list(API_PRESETS.values()), width=300)
            current_provider = self.config.get(f"llm_{config_prefix}_provider", "deepseek")
            provider_menu.set(API_PRESETS.get(current_provider, API_PRESETS["deepseek"]))
            provider_menu.grid(row=0, column=1, sticky=tk.W)

            # 通用配置面板 (OpenAI 协议)
            gen_panel = ctk.CTkFrame(block, fg_color="transparent")
            gen_panel.pack(fill=tk.X, padx=10, pady=5)
            
            ctk.CTkLabel(gen_panel, text="Base URL：", width=80).grid(row=0, column=0, sticky=tk.W, pady=2)
            gen_url = ctk.CTkEntry(gen_panel, width=300)
            gen_url.insert(0, self.config.get(f"llm_{config_prefix}_base_url", "https://api.deepseek.com"))
            gen_url.grid(row=0, column=1, sticky=tk.W, pady=2)
            self.add_right_click_menu(gen_url)
            
            ctk.CTkLabel(gen_panel, text="API Key：", width=80).grid(row=1, column=0, sticky=tk.W, pady=2)
            gen_key_container = ctk.CTkFrame(gen_panel, fg_color="transparent")
            gen_key_container.grid(row=1, column=1, sticky=tk.W, pady=2)
            
            gen_key = ctk.CTkEntry(gen_key_container, width=240, show="*")
            gen_key.insert(0, self.config.get(f"llm_{config_prefix}_api_key", ""))
            gen_key.pack(side=tk.LEFT)
            self.add_right_click_menu(gen_key)
            
            gen_copy_btn = ctk.CTkButton(gen_key_container, text="复制", width=50, 
                                        fg_color="#5DADE2", hover_color="#3498DB",
                                        command=lambda e=gen_key: self._copy_to_clipboard(e))
            gen_copy_btn.pack(side=tk.LEFT, padx=2)
            
            gen_paste_btn = ctk.CTkButton(gen_key_container, text="粘贴", width=50,
                                         fg_color="#48C9B0", hover_color="#1ABC9C",
                                         command=lambda e=gen_key: self._accessible_action(e._entry if hasattr(e, "_entry") else e, "<<Paste>>", "内容已粘贴"))
            gen_paste_btn.pack(side=tk.LEFT, padx=2)
            
            gen_copy_btn.bind("<Return>", lambda e, k=gen_key: self._copy_to_clipboard(k))
            gen_copy_btn.bind("<space>", lambda e, k=gen_key: self._copy_to_clipboard(k))
            gen_paste_btn.bind("<Return>", lambda e, k=gen_key: self._accessible_action(k._entry if hasattr(k, "_entry") else k, "<<Paste>>", "内容已粘贴"))
            gen_paste_btn.bind("<space>", lambda e, k=gen_key: self._accessible_action(k._entry if hasattr(k, "_entry") else k, "<<Paste>>", "内容已粘贴"))
            
            ctk.CTkLabel(gen_panel, text="模型：", width=80).grid(row=2, column=0, sticky=tk.W, pady=2)
            gen_model = ctk.CTkEntry(gen_panel, width=300)
            gen_model.insert(0, self.config.get(f"llm_{config_prefix}_model", "deepseek-chat"))
            gen_model.grid(row=2, column=1, sticky=tk.W, pady=2)
            self.add_right_click_menu(gen_model)

            def toggle(display_name):
                p_key = next((k for k, v in API_PRESETS.items() if v == display_name), "deepseek")
                
                # 预设填充
                presets_url = {"deepseek": "https://api.deepseek.com", "zhipu": "https://open.bigmodel.cn/api/paas/v4/", 
                               "moonshot": "https://api.moonshot.cn/v1", "ollama": "http://localhost:11434/v1"}
                model_presets = {"deepseek": "deepseek-chat", "zhipu": "glm-4", "moonshot": "moonshot-v1-8k", "ollama": "llama3"}
                
                if p_key in presets_url:
                    gen_url.delete(0, tk.END)
                    gen_url.insert(0, presets_url[p_key])
                if p_key in model_presets:
                    gen_model.delete(0, tk.END)
                    gen_model.insert(0, model_presets[p_key])

            provider_menu.configure(command=toggle)
            
            # 测试连接按钮
            def test_conn():
                p_key = next((k for k, v in API_PRESETS.items() if v == provider_menu.get()), "deepseek")
                test_cfg = self.config.copy()
                test_cfg[f"llm_{config_prefix}_provider"] = p_key
                test_cfg[f"llm_{config_prefix}_base_url"] = gen_url.get()
                test_cfg[f"llm_{config_prefix}_api_key"] = gen_key.get()
                test_cfg[f"llm_{config_prefix}_model"] = gen_model.get()
                
                # 添加全局参数用于测试
                test_cfg["llm_temperature"] = temp_slider.get()
                test_cfg["llm_max_tokens"] = int(tokens_entry.get())
                test_cfg["proxy_url"] = proxy_entry.get()
                
                from nlp_processor import NLPProcessor
                tester = NLPProcessor(test_cfg)
                target_model = tester.model_base if config_prefix == "base" else tester.model_pro
                res = target_model.test_connection()
                if res["success"]:
                    messagebox.showinfo("测试成功", f"连接正常！响应：\n{res['content'][:100]}...")
                else:
                    messagebox.showerror("测试失败", f"错误：\n{res['error']}")

            ctk.CTkButton(block, text="测试此模型连接", command=test_conn, fg_color="green", height=24, width=120).pack(anchor=tk.E, padx=15, pady=5)
            
            return {
                "provider": provider_menu, 
                "gen_url": gen_url, "gen_key": gen_key, "gen_model": gen_model
            }

        # --- 分别创建两个模型配置块 ---
        ctk.CTkFrame(frame, height=2, fg_color="gray").pack(fill=tk.X, pady=15, padx=10)
        ctk.CTkLabel(frame, text="AI 模型设置 (完全独立配置)", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor=tk.W, pady=(0, 5), padx=10)
        
        base_block_ui = create_model_block(frame, "1. 分析模型 (Base) - 用于角色分离与初步分析", "base")
        pro_block_ui = create_model_block(frame, "2. 生成模型 (Pro) - 用于病例提取与正式文书生成", "pro")

        # --- 全局参数 ---
        ctk.CTkFrame(frame, height=2, fg_color="gray").pack(fill=tk.X, pady=15, padx=10)
        ctk.CTkLabel(frame, text="全局模型参数", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor=tk.W, pady=(0, 5), padx=10)
        
        global_frame = ctk.CTkFrame(frame, fg_color="transparent")
        global_frame.pack(fill=tk.X, padx=10)
        
        ctk.CTkLabel(global_frame, text="Temperature：", width=100).grid(row=0, column=0, sticky=tk.W, pady=5)
        temp_slider = ctk.CTkSlider(global_frame, from_=0, to=1.5, number_of_steps=15, width=300)
        temp_slider.set(float(self.config.get("llm_temperature", 0.5)))
        temp_slider.grid(row=0, column=1, sticky=tk.W)
        
        temp_val = ctk.CTkLabel(global_frame, text=f"{temp_slider.get():.1f}")
        temp_val.grid(row=0, column=1, sticky=tk.E, padx=10)
        temp_slider.configure(command=lambda v: temp_val.configure(text=f"{v:.1f}"))
        
        ctk.CTkLabel(global_frame, text="Max Tokens：", width=100).grid(row=1, column=0, sticky=tk.W, pady=5)
        tokens_entry = ctk.CTkEntry(global_frame, width=350)
        tokens_entry.insert(0, str(self.config.get("llm_max_tokens", 4096)))
        tokens_entry.grid(row=1, column=1, pady=5)
        
        ctk.CTkLabel(global_frame, text="网络代理：", width=100).grid(row=2, column=0, sticky=tk.W, pady=5)
        proxy_entry = ctk.CTkEntry(global_frame, width=350, placeholder_text="e.g. http://127.0.0.1:7890")
        proxy_entry.insert(0, self.config.get("proxy_url", ""))
        proxy_entry.grid(row=2, column=1, pady=5)

        def save_all():
            try:
                self.config["hospital_name"] = hosp_entry.get().strip()
                self.config["doctor_name"] = doc_entry.get().strip()
                
                # ASR
                self.config["asr_appid"] = asr_appid_entry.get().strip()
                self.config["asr_api_key"] = asr_key_entry.get().strip()
                self.config["asr_api_secret"] = asr_secret_entry.get().strip()
                self.config["audio_sample_rate"] = int(sample_rate_menu.get())
                self.config["iat_language"] = lang_menu.get()
                self.config["enable_diarization"] = diarization_var.get()
                
                # LLM Base
                p_base = next((k for k, v in API_PRESETS.items() if v == base_block_ui["provider"].get()), "deepseek")
                self.config["llm_base_provider"] = p_base
                self.config["llm_base_base_url"] = base_block_ui["gen_url"].get().strip()
                self.config["llm_base_api_key"] = base_block_ui["gen_key"].get().strip()
                self.config["llm_base_model"] = base_block_ui["gen_model"].get().strip()
                
                # LLM Pro
                p_pro = next((k for k, v in API_PRESETS.items() if v == pro_block_ui["provider"].get()), "deepseek")
                self.config["llm_pro_provider"] = p_pro
                self.config["llm_pro_base_url"] = pro_block_ui["gen_url"].get().strip()
                self.config["llm_pro_api_key"] = pro_block_ui["gen_key"].get().strip()
                self.config["llm_pro_model"] = pro_block_ui["gen_model"].get().strip()
                
                # Global
                self.config["llm_temperature"] = temp_slider.get()
                try:
                    self.config["llm_max_tokens"] = int(tokens_entry.get().strip())
                except ValueError:
                    self.config["llm_max_tokens"] = 4096
                    
                self.config["proxy_url"] = proxy_entry.get().strip()
                
                with open("config.json", "w", encoding="utf-8") as f:
                    json.dump(self.config, f, ensure_ascii=False, indent=2)
                
                # 重新初始化组件
                self.nlp_processor = NLPProcessor(self.config)
                self.voice_recognizer = voice.VoiceRecognizer(self.config)
                self.case_structurer = CaseStructurer(self.nlp_processor) # 同步更新结构化处理器
                self.case_manager = CaseManager(self.config) # 同步更新路径等配置
                
                messagebox.showinfo("成功", "所有配置已保存并生效")
                settings_win.destroy()
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                print(f"Save failed: {error_detail}")
                messagebox.showerror("错误", f"保存失败：{str(e)}\n\n详情请查看控制台输出")

        ctk.CTkButton(frame, text="保存所有配置", command=save_all, height=40).pack(fill=tk.X, padx=20, pady=30)

    def create_transcription_panel(self, parent):
        self.trans_frame = ctk.CTkFrame(parent, fg_color=("#FFFFFF", "#2B2B2B")) # 纯白卡片感
        self.trans_frame.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        self.trans_frame.grid_columnconfigure(0, weight=1)
        self.trans_frame.grid_rowconfigure(1, weight=1)

        # 标题
        title_label = ctk.CTkLabel(self.trans_frame, text="语音转录", font=ctk.CTkFont(size=16, weight="bold"))
        title_label.grid(row=0, column=0, padx=10, pady=(10, 5), sticky="w")
        
        button_frame = ctk.CTkFrame(self.trans_frame, fg_color="transparent")
        button_frame.grid(row=2, column=0, sticky="ew", padx=10, pady=10)
        
        self.record_button = ctk.CTkButton(button_frame, text="开始录音", command=self.toggle_recording, width=100, fg_color="#5DADE2", hover_color="#3498DB")
        self.record_button.pack(side=tk.LEFT, padx=5)
        
        self.process_button = ctk.CTkButton(button_frame, text="结构化病例", command=self.structure_case, width=100, fg_color="#48C9B0", hover_color="#1ABC9C")
        self.process_button.pack(side=tk.LEFT, padx=5)
        
        self.status_label = ctk.CTkLabel(button_frame, text="状态：就绪")
        self.status_label.pack(side=tk.LEFT, padx=20)
        
        self.transcript_text_widget = ctk.CTkTextbox(self.trans_frame, font=("Segoe UI", 12))
        self.transcript_text_widget.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)
        
        # 配置颜色标签 (Node 2 优化显示)
        self.transcript_text_widget.tag_config("doctor", foreground="#2E86C1")
        self.transcript_text_widget.tag_config("patient", foreground="#E67E22")
        self.transcript_text_widget.tag_config("system", foreground="#7F8C8D")
        
        self.add_right_click_menu(self.transcript_text_widget)

    def create_case_form_panel(self, parent):
        self.form_frame = ctk.CTkFrame(parent, fg_color=("#FFFFFF", "#2B2B2B")) # 纯白卡片感
        self.form_frame.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
        self.form_frame.grid_columnconfigure(1, weight=1)
        self.form_frame.grid_rowconfigure(2, weight=1) # 让正文文本框垂直拉伸
        
        # 标题
        title_label = ctk.CTkLabel(self.form_frame, text="病例信息", font=ctk.CTkFont(size=16, weight="bold"))
        title_label.grid(row=0, column=0, columnspan=2, padx=10, pady=(10, 5), sticky="w")
        
        self.case_fields = {}
        
        # 顶部基础信息 (横向排列)
        top_info_frame = ctk.CTkFrame(self.form_frame, fg_color="transparent")
        top_info_frame.grid(row=1, column=0, columnspan=2, sticky="ew", padx=10)
        
        ctk.CTkLabel(top_info_frame, text="姓名:").pack(side=tk.LEFT, padx=5)
        name_entry = ctk.CTkEntry(top_info_frame, width=80)
        name_entry.pack(side=tk.LEFT, padx=5)
        self.case_fields["patient_name"] = name_entry
        
        ctk.CTkLabel(top_info_frame, text="性别:").pack(side=tk.LEFT, padx=5)
        gender_menu = ctk.CTkOptionMenu(top_info_frame, values=["男", "女"], width=70)
        gender_menu.set("男")
        gender_menu.pack(side=tk.LEFT, padx=5)
        self.case_fields["gender"] = gender_menu
        
        ctk.CTkLabel(top_info_frame, text="年龄:").pack(side=tk.LEFT, padx=5)
        age_entry = ctk.CTkEntry(top_info_frame, width=50)
        age_entry.pack(side=tk.LEFT, padx=5)
        self.case_fields["age"] = age_entry

        ctk.CTkLabel(top_info_frame, text="编号:").pack(side=tk.LEFT, padx=5)
        id_entry = ctk.CTkEntry(top_info_frame, width=120, state="disabled")
        id_entry.pack(side=tk.LEFT, padx=5)
        self.case_fields["case_id"] = id_entry
        
        # 病例正文 (占据主要空间)
        ctk.CTkLabel(self.form_frame, text="病例正文:").grid(row=2, column=0, sticky="nw", padx=10, pady=5)
        case_text = ctk.CTkTextbox(self.form_frame, font=("Segoe UI", 12))
        case_text.grid(row=2, column=1, sticky="nsew", padx=10, pady=5)
        self.case_fields["chief_complaint"] = case_text # 借用原字段存储正文
        
        # 配置建议标签
        self.case_fields["chief_complaint"].tag_config("suggestion_title", foreground="#16A085")
        self.case_fields["chief_complaint"].tag_config("suggestion_body", foreground="#16A085", background="#F0F9F7")
        self.case_fields["chief_complaint"].tag_config("separator", foreground="#BDC3C7")
        
        self.add_right_click_menu(case_text)
        
        # 操作按钮
        btn_frame = ctk.CTkFrame(self.form_frame, fg_color="transparent")
        btn_frame.grid(row=3, column=0, columnspan=2, sticky="ew", padx=10, pady=10)
        
        ctk.CTkButton(btn_frame, text="保存病例", command=self.save_case, width=100, fg_color="#48C9B0", hover_color="#1ABC9C").pack(side=tk.LEFT, padx=5)
        ctk.CTkButton(btn_frame, text="导出Word", command=self.export_case, width=100, fg_color="#ABB2B9", hover_color="#808B96").pack(side=tk.LEFT, padx=5)
        ctk.CTkButton(btn_frame, text="导出PDF", command=self.export_case_pdf, width=100, fg_color="#5DADE2", hover_color="#3498DB").pack(side=tk.LEFT, padx=5)
        ctk.CTkButton(btn_frame, text="清空", command=self.new_case, width=60, fg_color="gray").pack(side=tk.RIGHT, padx=5)

    def create_history_panel(self, parent):
        self.history_frame = ctk.CTkFrame(parent, fg_color=("#FFFFFF", "#2B2B2B")) # 纯白卡片感
        self.history_frame.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=5, padx=5)
        self.history_frame.grid_columnconfigure(0, weight=1)
        self.history_frame.grid_rowconfigure(1, weight=1)

        # 标题
        title_label = ctk.CTkLabel(self.history_frame, text="历史病例", font=ctk.CTkFont(size=16, weight="bold"))
        title_label.grid(row=0, column=0, padx=10, pady=(10, 5), sticky="w")
        
        # 使用 Treeview 处理列表，但放在 CTkFrame 中
        tree_container = ctk.CTkFrame(self.history_frame, fg_color="transparent")
        tree_container.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)
        tree_container.grid_columnconfigure(0, weight=1)
        tree_container.grid_rowconfigure(0, weight=1)

        style = ttk.Style()
        style.configure("Treeview", rowheight=25)
        
        self.history_tree = ttk.Treeview(tree_container, columns=("case_id", "patient_name", "visit_date", "diagnosis"), show="headings", height=8)
        self.history_tree.heading("case_id", text="病例编号")
        self.history_tree.heading("patient_name", text="患者姓名")
        self.history_tree.heading("visit_date", text="就诊日期")
        self.history_tree.heading("diagnosis", text="诊断")
        
        self.history_tree.column("case_id", width=120)
        self.history_tree.column("patient_name", width=120)
        self.history_tree.column("visit_date", width=120)
        self.history_tree.column("diagnosis", width=300)
        
        scrollbar = ttk.Scrollbar(tree_container, orient=tk.VERTICAL, command=self.history_tree.yview)
        self.history_tree.configure(yscrollcommand=scrollbar.set)
        
        self.history_tree.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")
        
        self.history_tree.bind("<Double-1>", self.on_history_double_click)
        
        button_frame = ctk.CTkFrame(self.history_frame, fg_color="transparent")
        button_frame.grid(row=2, column=0, pady=10)
        
        ctk.CTkButton(button_frame, text="刷新列表", command=self.refresh_history, width=100, fg_color="#ABB2B9", hover_color="#808B96").pack(side=tk.LEFT, padx=5)
        ctk.CTkButton(button_frame, text="删除病例", command=self.delete_case, width=100, fg_color="#E59866", hover_color="#D35400").pack(side=tk.LEFT, padx=5)
        
        self.refresh_history()

    def toggle_recording(self):
        if self.is_recording:
            self.stop_recording()
        else:
            self.start_recording()

    def start_recording(self):
        self.is_recording = True
        self.record_button.configure(text="停止录音", fg_color="#E59866", hover_color="#D35400")
        self.status_label.configure(text="状态：录音中...")
        
        # 如果当前焦点不在输入框，清空并聚焦到输入框
        if self.focus_get() != self.transcript_text_widget:
            self.transcript_text_widget.delete("0.0", "end")
            self.transcript_text_widget.focus_set()
            
        self.transcript_text = ""
        self.structured_transcript_data = None # 重置结构化数据
        
        self.voice_recognizer.start(
            on_update=self._on_transcription_update,
            on_complete=self._on_transcription_complete_wrapper,
            on_error=self._on_transcription_error
        )

    def stop_recording(self):
        self.is_recording = False
        self.record_button.configure(text="开始录音", fg_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"], hover_color=ctk.ThemeManager.theme["CTkButton"]["hover_color"])
        self.status_label.configure(text="状态：正在完成最后转录...")
        self.voice_recognizer.stop()

    def _on_transcription_update(self, text):
        self.after(0, lambda: self._update_transcript_ui(text))

    def _update_transcript_ui(self, text):
        # 如果当前正在录音且用户焦点在对话框，跳过自动刷新以防止干扰打字
        current_focus = self.focus_get()
        if self.is_recording and current_focus == self.transcript_text_widget:
            # 只更新内部变量，不更新 UI
            self.transcript_text = text
            return

        self.transcript_text_widget.delete("0.0", "end")
        self.transcript_text_widget.insert("0.0", text)
        self.transcript_text = text
        
        # 恢复焦点
        if current_focus:
            current_focus.focus_set()

    def _on_transcription_complete_wrapper(self, text):
        self.after(0, lambda: self._on_transcription_complete(text))
        # 自动触发分析
        self.after(500, self.structure_case)

    def _record_thread(self):
        # 这个方法现在不再需要，因为 VoiceRecognizer 内部处理了线程
        pass

    def _on_transcription_complete(self, result):
        # result 可能是结构化列表也可能是普通文本
        if isinstance(result, list):
            # 将结构化列表转换为带角色标识的文本用于显示
            display_text = ""
            for item in result:
                display_text += f"{item['speaker']}：{item['text']}\n\n"
            self.structured_transcript_data = result # 保存原始结构化数据
        else:
            display_text = result
            self.structured_transcript_data = None

        # 即使正在打字，录音结束时也强制更新一次最终结果
        current_focus = self.focus_get()
        self.transcript_text_widget.delete("0.0", "end")
        self.transcript_text_widget.insert("0.0", display_text)
        self.transcript_text = display_text
        
        if current_focus:
            current_focus.focus_set()
            
        print(f"\n=== 转录完成 ===\n{display_text}")
        
        self.status_label.configure(text="状态：转录完成")

    def _on_transcription_error(self, error):
        messagebox.showerror("错误", f"转录失败: {error}")
        self.status_label.configure(text="状态：就绪")
        self.is_recording = False
        self.record_button.configure(text="开始录音", fg_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"], hover_color=ctk.ThemeManager.theme["CTkButton"]["hover_color"])

    def structure_case(self):
        # 1. 检查 API Key 是否配置
        base_key = self.config.get("llm_base_api_key", "")
        if not base_key:
            messagebox.showwarning("配置提示", "检测到未配置 DeepSeek API Key。\n\n请点击右上角‘设置’按钮，在‘AI模型配置’中填写您的 API Key 并保存。")
            self.show_settings()
            return

        # 2. 获取转录文本（或使用已保存的结构化数据）
        if hasattr(self, "structured_transcript_data") and self.structured_transcript_data:
            input_data = self.structured_transcript_data
        else:
            input_data = self.transcript_text_widget.get("0.0", "end").strip()
            
        if not input_data:
            messagebox.showwarning("警告", "请先进行语音转录")
            return
        
        self.status_label.configure(text="状态：正在进行AI分析与结构化...")
        self._set_processing_state(True)
        
        def process_thread():
            try:
                # 第一步：对话分析与角色校验 (Analyze)
                print("--- 步骤1: 对话分析与角色校验 ---")
                analyzed_dialogue = self.case_structurer.analyze_dialogue(input_data)
                
                # 第二步：病例结构化 (Structure)
                print("--- 步骤2: 病例结构化 ---")
                case_data = self.case_structurer.structure(analyzed_dialogue)
                
                result = {
                    "analyzed_dialogue": analyzed_dialogue,
                    "case_data": case_data
                }
                self.after(0, lambda: self._on_structure_complete(result))
            except Exception as e:
                error_msg = str(e)
                self.after(0, lambda: self._on_structure_error(error_msg))
            finally:
                self.after(0, lambda: self._set_processing_state(False))
        
        thread = threading.Thread(target=process_thread)
        thread.daemon = True
        thread.start()

    def _set_processing_state(self, is_processing):
        """设置按钮的加载状态"""
        if is_processing:
            self.process_button.configure(text="处理中...", state="disabled", fg_color="gray")
        else:
            self.process_button.configure(text="结构化病例", state="normal", fg_color="#48C9B0")

    def _on_structure_complete(self, result):
        analyzed_dialogue = result.get("analyzed_dialogue", [])
        case_data = result.get("case_data", {}) # 现在是一个包含 fields 和 markdown 的字典
        
        if analyzed_dialogue:
            # 实时显示区显示分析后的对话
            self.transcript_text_widget.delete("0.0", "end")
            self.transcript_text_widget.insert("end", "--- 医患对话分析 ---\n\n", "system")
            
            if isinstance(analyzed_dialogue, list):
                for item in analyzed_dialogue:
                    speaker = item.get('speaker', '未知')
                    text = item.get('text', '')
                    
                    # 根据角色应用不同的标签
                    tag = "system"
                    if "医生" in speaker:
                        tag = "doctor"
                    elif "患者" in speaker:
                        tag = "patient"
                    
                    self.transcript_text_widget.insert("end", f"{speaker}：", tag)
                    self.transcript_text_widget.insert("end", f"{text}\n\n")
            else:
                self.transcript_text_widget.insert("end", str(analyzed_dialogue))
            
            self.transcript_text = self.transcript_text_widget.get("0.0", "end")
        
        if case_data and isinstance(case_data, dict):
            # 1. 填充基本信息字段
            if "patient_name" in case_data:
                self.case_fields["patient_name"].delete(0, tk.END)
                self.case_fields["patient_name"].insert(0, str(case_data["patient_name"]))
            
            if "gender" in case_data:
                self.case_fields["gender"].set(case_data["gender"])
                
            if "age" in case_data:
                self.case_fields["age"].delete(0, tk.END)
                self.case_fields["age"].insert(0, str(case_data["age"]))
            
            # 2. 填充病例正文
            case_text = case_data.get("markdown_content", "")
            ai_suggestions = case_data.get("ai_suggestions", "")
            
            if case_text or ai_suggestions:
                self.case_fields["chief_complaint"].delete("0.0", "end")
                
                # 插入病例正文
                if case_text:
                    self.case_fields["chief_complaint"].insert("end", case_text)
                
                # 插入 AI 建议（带样式）
                if ai_suggestions:
                    self.case_fields["chief_complaint"].insert("end", "\n\n" + "─"*40 + "\n", "separator")
                    self.case_fields["chief_complaint"].insert("end", "💡 AI 临床建议 (仅供医生参考)\n", "suggestion_title")
                    self.case_fields["chief_complaint"].insert("end", ai_suggestions, "suggestion_body")
                
                # 状态栏播报
                self.announce_status("病例分析与结构化完成")
            else:
                messagebox.showwarning("警告", "未能自动生成病例正文，请手动填写")
        else:
            messagebox.showwarning("警告", "AI 未能返回有效的结构化数据")
        
        self.status_label.configure(text="状态：就绪")

    def _on_structure_error(self, error):
        messagebox.showerror("错误", f"结构化失败: {error}")
        self.status_label.configure(text="状态：就绪")

    def generate_medical_record_text(self):
        case_data = self.get_case_from_form()
        
        if not case_data.get("patient_name"):
            messagebox.showwarning("警告", "请先选择或创建一个病历")
            return
            
        self.status_label.configure(text="状态：正在生成病历文本...")
        
        def process_thread():
            try:
                # 使用 CaseStructurer 生成病历报告
                medical_record = self.case_structurer.generate_report(case_data, self.config)
                
                if medical_record:
                    self.after(0, lambda: self._on_medical_record_generated(medical_record))
                    # 自动保存病历内容到当前 case
                    case_data["medical_record"] = medical_record
                    self.case_manager.save_case(case_data)
                else:
                    self.after(0, lambda: self._on_medical_record_error("生成报告失败，请检查 API 配置"))
            except Exception as e:
                self.after(0, lambda: self._on_medical_record_error(str(e)))
        
        thread = threading.Thread(target=process_thread)
        thread.daemon = True
        thread.start()

    def _on_medical_record_generated(self, medical_record):
        if medical_record:
            self.transcript_text_widget.delete("0.0", "end")
            self.transcript_text_widget.insert("0.0", medical_record)
            self.transcript_text = medical_record
            messagebox.showinfo("成功", "病历文本生成完成，您可以查看并导出")
        else:
            messagebox.showwarning("警告", "病历文本生成失败，请重试")
        
        self.status_label.configure(text="状态：就绪")

    def _on_medical_record_error(self, error):
        messagebox.showerror("错误", f"生成病历文本失败: {error}")
        self.status_label.configure(text="状态：就绪")

    def populate_case_form(self, case):
        for field, entry in self.case_fields.items():
            if field in case:
                value = case[field]
                # 真实性校验：只有当 AI 识别到有效内容（非空、非 None、非 0 年龄）时才填充
                if value is not None and value != "" and value != "null":
                    # 特殊处理年龄为 0 的情况（通常意味着未检测到）
                    if field == "age" and (value == 0 or value == "0"):
                        continue
                        
                    if isinstance(entry, ctk.CTkOptionMenu):
                        entry.set(value)
                    elif isinstance(entry, ctk.CTkTextbox):
                        entry.delete("0.0", "end")
                        entry.insert("0.0", str(value))
                    elif isinstance(entry, ctk.CTkEntry):
                        # 对于只读字段（如 case_id），需要临时开启 state 以便填充
                        old_state = entry.cget("state")
                        if old_state == "disabled":
                            entry.configure(state="normal")
                        
                        entry.delete(0, tk.END)
                        entry.insert(0, str(value))
                        
                        if old_state == "disabled":
                            entry.configure(state="disabled")

    def new_case(self):
        self.transcript_text_widget.delete("0.0", "end")
        self.transcript_text = ""
        
        new_case = self.case_manager.create_new_case("", "男", 30)
        self.populate_case_form(new_case)
        self.current_case = None

    def open_case(self):
        case_id = self.get_selected_case_id()
        if not case_id:
            messagebox.showwarning("警告", "请先选择一个病例")
            return
        
        case = self.case_manager.load_case(case_id)
        if case:
            self.populate_case_form(case)
            self.current_case = case
            messagebox.showinfo("成功", f"已加载病例 {case_id}")
        else:
            messagebox.showerror("错误", "加载病例失败")

    def save_case(self):
        case_data = self.get_case_from_form()
        
        patient_name = case_data.get("patient_name", "").strip()
        if not patient_name:
            messagebox.showwarning("提示", "请输入患者姓名后再进行保存")
            return
        
        case_id = case_data.get("case_id", "")
        is_new_case = not case_id
            
        # 允许不填写诊断，但自动补充
        if not case_data.get("diagnosis"):
            case_data["diagnosis"] = "待完善诊断"
        
        # 进度提示
        action_text = "创建新病例" if is_new_case else f"更新病例 [{case_id}]"
        self.status_label.configure(text=f"状态：正在{action_text}...")
        
        try:
            success, result = self.case_manager.save_case(case_data)
            if success:
                # 更新 UI 中的病例 ID（如果是新生成的）
                self.case_fields["case_id"].configure(state="normal")
                self.case_fields["case_id"].delete(0, tk.END)
                self.case_fields["case_id"].insert(0, result)
                self.case_fields["case_id"].configure(state="disabled")
                
                # 同步更新本地数据
                case_data["case_id"] = result
                self.current_case = case_data
                
                # 刷新历史列表
                self.refresh_history()
                
                # 成功提示
                self.status_label.configure(text=f"状态：{action_text}成功")
                msg = f"病例 [{result}] 已保存至本地库。"
                if is_new_case:
                    msg = f"新病例创建成功！编号：{result}"
                else:
                    msg = f"病例 {result} 的修改已同步。"
                messagebox.showinfo("成功", msg)
            else:
                self.status_label.configure(text="状态：保存失败")
                messagebox.showerror("保存失败", f"错误详情：{result}")
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            self.status_label.configure(text="状态：系统异常")
            messagebox.showerror("系统异常", f"保存过程中出现意外错误，请检查控制台输出。")

    def export_case(self):
        case_data = self.get_case_from_form()
        
        if not case_data["case_id"]:
            messagebox.showwarning("警告", "请先保存病例")
            return
        
        try:
            filepath = self.document_generator.generate_word(case_data)
            messagebox.showinfo("成功", f"Word文档已生成: {filepath}")
            os.startfile(filepath)
        except Exception as e:
            messagebox.showerror("错误", f"导出失败: {str(e)}")

    def export_case_pdf(self):
        case_data = self.get_case_from_form()
        
        if not case_data["case_id"]:
            messagebox.showwarning("警告", "请先保存病例")
            return
        
        try:
            filepath = self.document_generator.generate_pdf(case_data)
            messagebox.showinfo("成功", f"PDF文档已生成: {filepath}")
            os.startfile(filepath)
        except Exception as e:
            messagebox.showerror("错误", f"导出失败: {str(e)}")

    def get_case_from_form(self):
        case = {}
        for field, entry in self.case_fields.items():
            if isinstance(entry, ctk.CTkTextbox):
                value = entry.get("0.0", "end").strip()
            else:
                value = entry.get()
                
            if field == "age":
                try:
                    case[field] = int(value) if value else 0
                except ValueError:
                    case[field] = 0
            else:
                case[field] = value
        return case

    def refresh_history(self):
        for item in self.history_tree.get_children():
            self.history_tree.delete(item)
        
        cases = self.case_manager.list_cases()
        for case in cases:
            # 确保诊断信息不为空
            diagnosis = case.get("diagnosis", "")
            self.history_tree.insert("", tk.END, values=(
                case.get("case_id", ""),
                case.get("patient_name", ""),
                case.get("visit_date", ""),
                diagnosis
            ))

    def on_history_double_click(self, event):
        # 记录当前有焦点的组件
        current_focus = self.focus_get()
        
        case_id = self.get_selected_case_id()
        if case_id:
            case = self.case_manager.load_case(case_id)
            if case:
                self.populate_case_form(case)
                self.current_case = case
        
        # 恢复之前的焦点，防止焦点被劫持到 Treeview
        if current_focus:
            current_focus.focus_set()

    def get_selected_case_id(self):
        selection = self.history_tree.selection()
        if selection:
            item = self.history_tree.item(selection[0])
            return item["values"][0]
        return None

    def delete_case(self):
        case_id = self.get_selected_case_id()
        if not case_id:
            messagebox.showwarning("警告", "请先选择一个病例")
            return
        
        if messagebox.askyesno("确认", f"确定要删除病例 {case_id} 吗？"):
            if self.case_manager.delete_case(case_id):
                self.refresh_history()
                messagebox.showinfo("成功", "病例已删除")
            else:
                messagebox.showerror("错误", "删除失败")


def main():
    app = VoiceToCaseApp()
    app.mainloop()

if __name__ == "__main__":
    main()
