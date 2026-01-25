import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
import json
import threading
import os
from datetime import datetime
import sys

from case_manager import CaseManager
from case_structurer import CaseStructurer
from document_generator import DocumentGenerator
from nlp_processor import NLPProcessor


class VoiceToCaseApp:
    def __init__(self, root):
        self.root = root
        self.root.title("智能语音转病例助手 (MVP)")
        self.root.geometry("1000x800")
        
        self.load_config()
        self.case_manager = CaseManager(self.config)
        self.case_structurer = CaseStructurer()
        self.document_generator = DocumentGenerator(self.config)
        self.nlp_processor = NLPProcessor()
        
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
        self.create_menu()
        self.create_main_content()

    def create_menu(self):
        menubar = tk.Menu(self.root)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="新建病例", command=self.new_case)
        file_menu.add_command(label="打开病例", command=self.open_case)
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.root.quit)
        menubar.add_cascade(label="文件", menu=file_menu)
        self.root.config(menu=menubar)

    def create_main_content(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        
        self.create_transcription_panel(main_frame)
        self.create_case_form_panel(main_frame)
        self.create_history_panel(main_frame)

    def create_transcription_panel(self, parent):
        frame = ttk.LabelFrame(parent, text="语音转录", padding="10")
        frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5, pady=5)
        
        button_frame = ttk.Frame(frame)
        button_frame.pack(fill=tk.X, pady=5)
        
        self.record_button = ttk.Button(button_frame, text="开始录音", command=self.toggle_recording)
        self.record_button.pack(side=tk.LEFT, padx=5)
        
        self.process_button = ttk.Button(button_frame, text="结构化病例", command=self.structure_case)
        self.process_button.pack(side=tk.LEFT, padx=5)
        
        self.status_label = ttk.Label(button_frame, text="状态：就绪")
        self.status_label.pack(side=tk.LEFT, padx=20)
        
        self.transcript_text_widget = scrolledtext.ScrolledText(frame, height=15, wrap=tk.WORD)
        self.transcript_text_widget.pack(fill=tk.BOTH, expand=True, pady=5)
        
        parent.columnconfigure(0, weight=1)

    def create_case_form_panel(self, parent):
        frame = ttk.LabelFrame(parent, text="病例信息", padding="10")
        frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5, pady=5)
        
        self.case_fields = {}
        fields = [
            ("case_id", "病例编号"),
            ("patient_name", "患者姓名"),
            ("gender", "性别"),
            ("age", "年龄"),
            ("visit_date", "就诊日期"),
            ("chief_complaint", "主诉"),
            ("present_illness", "现病史"),
            ("past_history", "既往史"),
            ("allergies", "过敏史"),
            ("physical_exam", "体格检查"),
            ("diagnosis", "诊断"),
            ("treatment_plan", "治疗建议")
        ]
        
        for i, (field_key, label) in enumerate(fields):
            ttk.Label(frame, text=label + "：").grid(row=i, column=0, sticky=tk.W, pady=2)
            
            if field_key == "gender":
                entry = ttk.Combobox(frame, values=["男", "女"], width=30)
            elif field_key == "age":
                entry = ttk.Spinbox(frame, from_=0, to=120, width=30)
            elif field_key == "case_id":
                entry = ttk.Entry(frame, width=30, state="readonly")
            else:
                entry = ttk.Entry(frame, width=30)
            
            entry.grid(row=i, column=1, sticky=(tk.W, tk.E), pady=2, padx=5)
            self.case_fields[field_key] = entry
        
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=len(fields), column=0, columnspan=2, pady=10)
        
        ttk.Button(button_frame, text="生成病历文本", command=self.generate_medical_record_text).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="保存病例", command=self.save_case).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="导出Word", command=self.export_case).pack(side=tk.LEFT, padx=5)
        
        parent.columnconfigure(1, weight=1)

    def create_history_panel(self, parent):
        frame = ttk.LabelFrame(parent, text="历史病例", padding="10")
        frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        
        self.history_tree = ttk.Treeview(frame, columns=("case_id", "patient_name", "visit_date", "diagnosis"), show="headings", height=8)
        self.history_tree.heading("case_id", text="病例编号")
        self.history_tree.heading("patient_name", text="患者姓名")
        self.history_tree.heading("visit_date", text="就诊日期")
        self.history_tree.heading("diagnosis", text="诊断")
        
        self.history_tree.column("case_id", width=120)
        self.history_tree.column("patient_name", width=120)
        self.history_tree.column("visit_date", width=120)
        self.history_tree.column("diagnosis", width=300)
        
        scrollbar = ttk.Scrollbar(frame, orient=tk.VERTICAL, command=self.history_tree.yview)
        self.history_tree.configure(yscrollcommand=scrollbar.set)
        
        self.history_tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        self.history_tree.bind("<Double-1>", self.on_history_double_click)
        
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=1, column=0, columnspan=2, pady=5)
        
        ttk.Button(button_frame, text="刷新列表", command=self.refresh_history).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="删除病例", command=self.delete_case).pack(side=tk.LEFT, padx=5)
        
        parent.rowconfigure(1, weight=1)
        
        self.refresh_history()

    def toggle_recording(self):
        if self.is_recording:
            self.stop_recording()
        else:
            self.start_recording()

    def start_recording(self):
        self.is_recording = True
        self.record_button.config(text="停止录音")
        self.status_label.config(text="状态：录音中...")
        
        thread = threading.Thread(target=self._record_thread)
        thread.daemon = True
        thread.start()

    def stop_recording(self):
        self.is_recording = False
        self.record_button.config(text="开始录音")
        self.status_label.config(text="状态：处理中...")

    def _record_thread(self):
        try:
            import voice
            transcript = voice.record_transcript()
            self.root.after(0, lambda: self._on_transcription_complete(transcript))
        except Exception as e:
            self.root.after(0, lambda: self._on_transcription_error(str(e)))

    def _on_transcription_complete(self, transcript):
        self.transcript_text_widget.delete(1.0, tk.END)
        self.transcript_text_widget.insert(1.0, transcript)
        self.transcript_text = transcript
        
        print(f"\n=== 转录完成 ===\n{transcript}")
        
        self.status_label.config(text="状态：转录完成")

    def _on_transcription_error(self, error):
        messagebox.showerror("错误", f"转录失败: {error}")
        self.status_label.config(text="状态：就绪")
        self.is_recording = False
        self.record_button.config(text="开始录音")

    def structure_case(self):
        transcript = self.transcript_text_widget.get(1.0, tk.END).strip()
        if not transcript:
            messagebox.showwarning("警告", "请先进行语音转录")
            return
        
        self.status_label.config(text="状态：正在用AI分析...")
        
        def process_thread():
            try:
                result = self.nlp_processor.process_transcript(transcript)
                self.root.after(0, lambda: self._on_structure_complete(result))
            except Exception as e:
                self.root.after(0, lambda: self._on_structure_error(str(e)))
        
        thread = threading.Thread(target=process_thread)
        thread.daemon = True
        thread.start()

    def _on_structure_complete(self, result):
        speaker_dialogues = result.get("speaker_dialogues", [])
        case_data = result.get("case", {})
        
        if speaker_dialogues:
            formatted = self.nlp_processor.format_speaker_dialogues(speaker_dialogues)
            print(f"\n=== 角色区分结果 ===\n{formatted}")
        
        if case_data:
            self.populate_case_form(case_data)
            messagebox.showinfo("成功", "病例结构化完成")
        else:
            messagebox.showwarning("警告", "未能提取病例信息，请手动填写")
        
        self.status_label.config(text="状态：就绪")

    def _on_structure_error(self, error):
        messagebox.showerror("错误", f"结构化失败: {error}")
        self.status_label.config(text="状态：就绪")

    def generate_medical_record_text(self):
        case_data = self.get_case_from_form()
        
        if not case_data["diagnosis"]:
            messagebox.showwarning("警告", "请先完成病例结构化，确保诊断信息已填写")
            return
        
        self.status_label.config(text="状态：正在生成病历文本...")
        
        def process_thread():
            try:
                medical_record = self.nlp_processor.generate_medical_record(case_data, self.config)
                self.root.after(0, lambda: self._on_medical_record_generated(medical_record))
            except Exception as e:
                self.root.after(0, lambda: self._on_medical_record_error(str(e)))
        
        thread = threading.Thread(target=process_thread)
        thread.daemon = True
        thread.start()

    def _on_medical_record_generated(self, medical_record):
        if medical_record:
            self.transcript_text_widget.delete(1.0, tk.END)
            self.transcript_text_widget.insert(1.0, medical_record)
            self.transcript_text = medical_record
            messagebox.showinfo("成功", "病历文本生成完成，您可以查看并导出")
        else:
            messagebox.showwarning("警告", "病历文本生成失败，请重试")
        
        self.status_label.config(text="状态：就绪")

    def _on_medical_record_error(self, error):
        messagebox.showerror("错误", f"生成病历文本失败: {error}")
        self.status_label.config(text="状态：就绪")

    def populate_case_form(self, case):
        for field, entry in self.case_fields.items():
            if field in case:
                if isinstance(entry, ttk.Combobox):
                    entry.set(case[field])
                elif isinstance(entry, ttk.Spinbox):
                    entry.delete(0, tk.END)
                    entry.insert(0, str(case[field]))
                else:
                    entry.delete(0, tk.END)
                    entry.insert(0, str(case[field]))

    def new_case(self):
        self.transcript_text_widget.delete(1.0, tk.END)
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
        
        if not case_data["patient_name"]:
            messagebox.showwarning("警告", "请填写患者姓名")
            return
        
        if not case_data["diagnosis"]:
            messagebox.showwarning("警告", "请填写诊断")
            return
        
        success, result = self.case_manager.save_case(case_data)
        if success:
            self.current_case = case_data
            self.refresh_history()
            messagebox.showinfo("成功", f"病例已保存: {result}")
        else:
            messagebox.showerror("错误", f"保存失败: {result}")

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

    def get_case_from_form(self):
        case = {}
        for field, entry in self.case_fields.items():
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
            self.history_tree.insert("", tk.END, values=(
                case["case_id"],
                case["patient_name"],
                case["visit_date"],
                case["diagnosis"]
            ))

    def on_history_double_click(self, event):
        case_id = self.get_selected_case_id()
        if case_id:
            case = self.case_manager.load_case(case_id)
            if case:
                self.populate_case_form(case)
                self.current_case = case

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
    root = tk.Tk()
    app = VoiceToCaseApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
