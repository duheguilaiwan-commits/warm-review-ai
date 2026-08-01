import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Plus, ChevronRight, Copy, RefreshCw, X, MessageCircle, Mic, ChevronLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "login" | "list" | "checkin" | "result" | "account";

interface Student {
  id: string;
  name: string;
  personality: string;
  learningTrait: string;
}

// ─── Mock last-review history (keyed by student id) ──────────────────────────
// 王思远 (id "4") intentionally has no history → bar hidden for that student

interface LastReview {
  date: string;          // display date
  summary: string;       // 1–2 line excerpt shown in bar
  fullText: string;      // complete wechat text shown in modal
}

const LAST_REVIEWS: Record<string, LastReview> = {
  "1": {
    date: "7月25日",
    summary: "今天林小雨上课专注度很高，互动积极，举手回答问题两次，老师印象很深刻。",
    fullText:
      "您好！今天这节课，林小雨的表现让老师很欣慰 😊\n\n全程专注度很高，互动积极，两次主动举手回答问题，思路清晰。课堂练习完成度也不错，细节处理比上次有明显进步。\n\n有一点小小的提醒：读题时稍微慢一点，确保完全理解题意再动笔，这样错误率还能再降低。相信孩子的进步会越来越快！期待下次继续加油 ✨",
  },
  "2": {
    date: "7月24日",
    summary: "陈俊豪这节课逻辑清晰，概念扎实，独立解题流畅，是一次高质量的课堂表现。",
    fullText:
      "您好！今天陈俊豪的表现非常稳定 😊\n\n逻辑清晰，概念掌握扎实，独立完成了全部课堂练习，解题过程流畅，鲜少需要提示。老师观察到他在分析步骤时比之前更有条理，这是一个很好的成长信号。\n\n接下来可以鼓励他多一点口头表达，把脑子里的想法说出来，对理解的深化很有帮助。期待他继续保持这份专注 ✨",
  },
  "3": {
    date: "7月23日",
    summary: "赵雨桐这次创意表现非常亮眼，色彩大胆，构图有想法，老师给了很高的肯定。",
    fullText:
      "您好！赵雨桐这次课的表现让老师眼前一亮 😊\n\n创意十足，色彩搭配大胆又和谐，构图很有个人风格，在班里属于非常突出的水平。老师特别鼓励了她，她也显得很开心、很有动力。\n\n小小建议：在细节处理上可以再多一点耐心，把细节做精，作品会更加完整。期待她下次带来更多惊喜 ✨",
  },
  // id "4" (王思远) has no entry → bar hidden
};

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "通用习惯",
    color: "#F97316",
    light: "#FFEFE5",
    textColor: "#EA580C",
    tags: ["上课专注", "容易走神", "互动积极", "作业按时交", "需要鼓励", "状态回暖"],
  },
  {
    label: "理科表现",
    color: "#3B82F6",
    light: "#DBEAFE",
    textColor: "#1D4ED8",
    tags: ["计算粗心", "公式不熟", "举一反三", "逻辑清晰", "审题马虎", "概念扎实"],
  },
  {
    label: "文科表现",
    color: "#A855F7",
    light: "#F3E8FF",
    textColor: "#7E22CE",
    tags: ["词汇量丰富", "语感不错", "阅读薄弱", "表达清晰", "书写需规范", "理解深刻"],
  },
  {
    label: "素质艺术",
    color: "#34D399",
    light: "#D1FAE5",
    textColor: "#065F46",
    tags: ["色彩大胆", "透视准确", "节奏感好", "练习刻苦", "动作标准", "表现力强"],
  },
  {
    label: "成人教育",
    color: "#F59E0B",
    light: "#FEF3C7",
    textColor: "#92400E",
    tags: ["概念扎实", "论述逻辑散", "刷题效率高", "基础薄弱", "备考状态佳", "执行力强"],
  },
];

// ─── Initial students ─────────────────────────────────────────────────────────

const INITIAL_STUDENTS: Student[] = [
  { id: "1", name: "林小雨", personality: "活泼好动，爱提问", learningTrait: "视觉型学习者，容易分心" },
  { id: "2", name: "陈俊豪", personality: "内敛专注，逻辑清晰", learningTrait: "理解快，需鼓励开口表达" },
  { id: "3", name: "赵雨桐", personality: "创意丰富，想象力强", learningTrait: "发散思维好，需加强规范" },
  { id: "4", name: "王思远", personality: "踏实勤奋，不服输", learningTrait: "执行力强，细节容易马虎" },
];

const AVATAR_COLORS = ["#FFEFE5", "#DBEAFE", "#F3E8FF", "#D1FAE5", "#FEF3C7"];
const AVATAR_TEXT_COLORS = ["#EA580C", "#1D4ED8", "#7E22CE", "#065F46", "#92400E"];

function avatarStyle(idx: number) {
  return { bg: AVATAR_COLORS[idx % AVATAR_COLORS.length], text: AVATAR_TEXT_COLORS[idx % AVATAR_TEXT_COLORS.length] };
}

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #fdf2e9 0%, #fce4d6 50%, #fdf6f0 100%)" }}
    >
      <div
        style={{
          width: 375,
          height: 812,
          borderRadius: 44,
          boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08), inset 0 0 0 2px rgba(255,255,255,0.6)",
          background: "#FFF8F3",
          fontFamily: "'Noto Sans SC','PingFang SC',-apple-system,'Helvetica Neue',sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Status bar */}
        <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "relative", zIndex: 50 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>9:41</span>
          <div style={{ width: 120, height: 28, background: "#1F2937", borderRadius: 20, position: "absolute", left: "50%", transform: "translateX(-50%)", top: 8 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="#1F2937">
              <rect x="0" y="5" width="2.5" height="6" rx="0.5" opacity="0.4"/>
              <rect x="4" y="3" width="2.5" height="8" rx="0.5" opacity="0.6"/>
              <rect x="8" y="1" width="2.5" height="10" rx="0.5" opacity="0.8"/>
              <rect x="12" y="0" width="2.5" height="11" rx="0.5"/>
            </svg>
            <div style={{ width: 24, height: 11, border: "1.5px solid #1F2937", borderRadius: 3, padding: 1.5 }}>
              <div style={{ width: "80%", height: "100%", background: "#1F2937", borderRadius: 1 }} />
            </div>
          </div>
        </div>
        {/* Screen */}
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0 }}>
          {children}
        </div>
        {/* Home indicator */}
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 50 }}>
          <div style={{ width: 134, height: 5, background: "#1F2937", borderRadius: 3, opacity: 0.15 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "0 20px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "white", borderRadius: 24, padding: "24px", width: "100%", maxHeight: "78%", overflowY: "auto", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 999, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={13} color="#6B7280" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Profile Card (no subject field) ─────────────────────────────────────────

function ProfileCard({ student, idx }: { student: Student; idx: number }) {
  const { bg, text } = avatarStyle(idx);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 999, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: text, flexShrink: 0 }}>
          {student.name[0]}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1F2937" }}>{student.name}</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>学生档案</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ProfileRow label="性格底色" value={student.personality} />
        <ProfileRow label="学习特点" value={student.learningTrait} />
      </div>
      <div style={{ marginTop: 18, padding: "12px 14px", background: "#FFF8F3", borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.65, margin: 0 }}>
          💡 暖评 AI 会根据性格底色自动调整反馈语气，学科语境由打卡页「本节课学科」提供
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ fontSize: 13, color: "#9CA3AF", flexShrink: 0, width: 56, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#1F2937", lineHeight: 1.65 }}>{value}</span>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFF8F3" }}>
      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, paddingBottom: 16, paddingLeft: 24, paddingRight: 24 }}>
        {/* Illustration */}
        <div style={{ marginBottom: 28 }}>
          <svg viewBox="0 0 200 160" fill="none" width="200" height="160">
            <circle cx="100" cy="80" r="70" fill="#FFEFE5" opacity="0.55" />
            <rect x="55" y="42" width="90" height="76" rx="10" fill="white" stroke="#F97316" strokeWidth="1.5" />
            <rect x="67" y="57" width="48" height="2.5" rx="1.25" fill="#F3F4F6" />
            <rect x="67" y="65" width="38" height="2.5" rx="1.25" fill="#F3F4F6" />
            <rect x="67" y="73" width="44" height="2.5" rx="1.25" fill="#F3F4F6" />
            <rect x="67" y="81" width="28" height="2.5" rx="1.25" fill="#FFEFE5" />
            <g transform="rotate(-35 132 48)">
              <rect x="120" y="28" width="7" height="32" rx="2" fill="#F97316" />
              <polygon points="120,60 127,60 123.5,70" fill="#EA580C" />
              <rect x="120" y="25" width="7" height="5" rx="1" fill="#6B7280" />
            </g>
            <rect x="106" y="94" width="52" height="30" rx="10" fill="#F97316" />
            <polygon points="116,124 126,124 121,132" fill="#F97316" />
            <rect x="113" y="102" width="28" height="2.5" rx="1.25" fill="white" opacity="0.8" />
            <rect x="113" y="109" width="20" height="2.5" rx="1.25" fill="white" opacity="0.55" />
            <g transform="translate(26,32) rotate(-20)">
              <path d="M0 0L28 11L0 22L7 11Z" fill="#FFEFE5" stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 11L28 11" stroke="#F97316" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Logo — text only */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: "#1F2937", letterSpacing: "-0.5px" }}>暖评 AI</span>
        </div>

        {/* Slogan */}
        <p style={{ fontSize: 16, color: "#6B7280", textAlign: "center", lineHeight: 1.7, maxWidth: 230, margin: 0 }}>
          把每一句点评，<br />写成孩子愿意听的话
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "0 24px", marginBottom: 32 }}>
        {["30秒生成", "高情商措辞", "一键复制"].map(f => (
          <div key={f} style={{ fontSize: 12, color: "#F97316", background: "#FFEFE5", padding: "5px 12px", borderRadius: 999, fontWeight: 500 }}>{f}</div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 12, marginTop: "auto", marginBottom: 12 }}>
        <button
          onClick={onEnter}
          style={{ width: "100%", height: 54, background: "#1F2937", color: "white", borderRadius: 999, fontSize: 17, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(31,41,55,0.25)" }}
        >
          一键体验
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button style={{ fontSize: 13, color: "#C4C9D4", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
          邮箱账号登录
        </button>
      </div>

      {/* Version */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24 }}>
        <span style={{ fontSize: 11, color: "#D1D5DB" }}>专为老师设计</span>
      </div>
    </div>
  );
}

// ─── Student List Screen ──────────────────────────────────────────────────────

function ListScreen({
  students,
  onSelect,
  onAddStudent,
  onAccount,
}: {
  students: Student[];
  onSelect: (s: Student) => void;
  onAddStudent: (s: Student) => void;
  onAccount: () => void;
}) {
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPersonality, setNewPersonality] = useState("");
  const [newLearning, setNewLearning] = useState("");

  const handleConfirm = () => {
    if (!newName.trim()) return;
    onAddStudent({
      id: Date.now().toString(),
      name: newName.trim(),
      personality: newPersonality.trim() || "暂未填写",
      learningTrait: newLearning.trim() || "暂未填写",
    });
    setNewName(""); setNewPersonality(""); setNewLearning("");
    setShowAdd(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFF8F3" }}>
      {/* Top bar */}
      <div style={{ background: "#FFF8F3", borderBottom: "1px solid #F3F4F6", padding: "14px 20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1F2937" }}>暖评 AI</span>
          {/* Account avatar */}
          <button
            onClick={onAccount}
            style={{ width: 36, height: 36, borderRadius: 999, background: "#FFEFE5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="3.5" stroke="#F97316" strokeWidth="1.5" />
              <path d="M2 16.5c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>共 {students.length} 位学生</p>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 100px" }}>
        {students.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="42" fill="#FFEFE5" opacity="0.6" />
              <path d="M33 62Q50 44 67 62" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="40" cy="46" r="4" fill="#F97316" opacity="0.5" />
              <circle cx="60" cy="46" r="4" fill="#F97316" opacity="0.5" />
            </svg>
            <p style={{ fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 1.65, margin: 0 }}>还没有学生<br />先添加第一位吧</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {students.map((s, i) => {
              const { bg, text } = avatarStyle(i);
              return (
                <div
                  key={s.id}
                  onClick={() => onSelect(s)}
                  style={{ background: "white", borderRadius: 20, padding: "15px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", cursor: "pointer", border: "1px solid transparent" }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: 999, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: text, flexShrink: 0 }}>
                    {s.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1F2937" }}>{s.name}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setProfileStudent(s); }}
                    style={{ fontSize: 12, color: "#9CA3AF", background: "#F9FAFB", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
                  >
                    档案 <ChevronRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* profile modal (list-row 真档案弹层) */}
      {profileStudent && (
        <Modal onClose={() => setProfileStudent(null)}>
          <ProfileCard student={profileStudent} idx={students.indexOf(profileStudent)} />
        </Modal>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{ position: "absolute", bottom: 32, right: 20, width: 52, height: 52, borderRadius: 999, background: "#F97316", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(249,115,22,0.35)", zIndex: 10 }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </button>

      {/* Profile modal */}
      {profileStudent && (
        <Modal onClose={() => setProfileStudent(null)}>
          <ProfileCard student={profileStudent} idx={students.findIndex(s => s.id === profileStudent.id)} />
        </Modal>
      )}

      {/* Add student modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", marginBottom: 20 }}>新增学生</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="姓名 *" placeholder="请输入学生姓名" value={newName} onChange={setNewName} />
              <FormField label="性格底色" placeholder="如：活泼好动，爱提问" value={newPersonality} onChange={setNewPersonality} />
              <FormField label="学习特点" placeholder="如：视觉型学习者，计算易粗心" value={newLearning} onChange={setNewLearning} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, height: 48, background: "#F9FAFB", border: "1.5px solid #F3F4F6", borderRadius: 14, fontSize: 15, color: "#6B7280", cursor: "pointer" }}>
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!newName.trim()}
                style={{ flex: 2, height: 48, background: newName.trim() ? "#1F2937" : "#D1D5DB", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: newName.trim() ? "pointer" : "not-allowed" }}
              >
                确定，添加学生
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: "100%", height: 44, borderRadius: 12, border: `1.5px solid ${focused ? "#F97316" : "#F3F4F6"}`, padding: "0 12px", fontSize: 14, color: "#1F2937", background: "white", outline: "none", boxSizing: "border-box", boxShadow: focused ? "0 4px 16px rgba(249,115,22,0.1)" : "none", transition: "all 0.2s" }}
      />
    </div>
  );
}

// ─── Last Review Bar ─────────────────────────────────────────────────────────

function LastReviewBar({ review }: { review: LastReview | null }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!review) return;
    if (!review.fullText || !review.fullText.trim()) {
      setCopied(false);
      return; // 空态：不复制空内容
    }
    try {
      navigator.clipboard?.writeText(review.fullText);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowModal(false); }, 1600);
    } catch (e) {
      setCopied(false);
      // 复制失败（如非安全上下文）→ 显错误态
      window.alert("复制失败：当前环境不支持 Clipboard API，请手动选择文本复制");
    }
  };

  return (
    <>
      <div style={{ padding: "10px 20px 0" }}>
        <div
          style={{
            background: "#FFEFE5",
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: review ? "flex-start" : "center",
            gap: 10,
            minHeight: 56,
          }}
        >
          {review ? (
            <>
              {/* Has history: label + summary */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontWeight: 500 }}>
                  上次点评
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#1F2937",
                    lineHeight: 1.6,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {review.summary}
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  flexShrink: 0,
                  alignSelf: "center",
                  fontSize: 12,
                  color: "#F97316",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  whiteSpace: "nowrap",
                }}
              >
                查看
              </button>
            </>
          ) : (
            /* No history: placeholder text, no view button */
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2.5" stroke="#9CA3AF" strokeWidth="1.3"/>
                <path d="M4 5h6M4 7.5h3.5" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.55 }}>
                还没有点评记录，生成后这里会自动显示上一次点评
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full-text modal */}
      {showModal && review && (
        <Modal onClose={() => setShowModal(false)}>
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>上次点评</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>微信长文全文</div>
            </div>
            <div style={{ height: 1, background: "#F3F4F6", marginBottom: 14 }} />
            <div style={{ fontSize: 15, color: "#333333", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 20 }}>
              {review.fullText}
            </div>
            <button
              onClick={handleCopy}
              style={{ width: "100%", height: 50, background: copied ? "#22C55E" : "#1F2937", color: "white", borderRadius: 999, fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background 0.3s" }}
            >
              <Copy size={15} />{copied ? "已复制！" : "一键复制"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Check-in Screen ──────────────────────────────────────────────────────────

function CheckinScreen({ student, studentIdx, onGenerate, onBack }: {
  student: Student;
  studentIdx: number;
  onGenerate: (ctx: GenerateContext) => void;
  onBack: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(["上课专注", "互动积极", "作业按时交"]));
  const [customTags, setCustomTags] = useState<string[]>([]); // global custom tag library
  const [focusStar, setFocusStar] = useState(0);
  const [absorbStar, setAbsorbStar] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customCat, setCustomCat] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeCat = CATEGORIES[activeTab];
  const lastReview = LAST_REVIEWS[student.id] ?? null;

  const allTagsForTab = (tabIdx: number) => {
    const base = CATEGORIES[tabIdx].tags;
    // custom tags for this category
    const prefix = `[${tabIdx}]`;
    const extras = customTags.filter(t => t.startsWith(prefix)).map(t => t.slice(prefix.length));
    return base.concat(extras);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      const key = `[${activeTab}]${tag}`;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isSelected = (tag: string) => selectedTags.has(`[${activeTab}]${tag}`);

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const key = `[${customCat}]${trimmed}`;
    // dedup
    if (!customTags.includes(key)) {
      setCustomTags(prev => [...prev, key]);
    }
    // select it
    setSelectedTags(prev => new Set([...prev, key]));
    // switch to that tab
    setActiveTab(customCat);
    setCustomInput("");
    setShowCustomModal(false);
  };

  const handleGenerate = () => {
    // ── empty-state guard (no tags / no stars / empty subject) ──
    if (!subject.trim() && selectedTags.size === 0 && focusStar === 0 && absorbStar === 0) {
      return; // 不跳 result：显式空态（参考条占位逻辑不动）
    }
    setLoading(true);
    // collect selected tags with their category
    const tags = Array.from(selectedTags).map(k => {
      const catIdx = parseInt(k.slice(1, 2));
      const tag = k.slice(4);
      return { tag, category: CATEGORIES[catIdx].label };
    });
    // ── simulate async generation w/ possible failure (mock "API") ──
    setTimeout(() => {
      try {
        // 10% 模拟接口失败 → 显 alert 错误，不跳 result
        if (Math.random() < 0.1) {
          setGenError("生成失败：模拟接口超时，请重试");
          setLoading(false);
          return;
        }
        setLoading(false);
        onGenerate({ subject, tags, focusStar, absorbStar, note });
      } catch (e) {
        setGenError("生成失败：前端拼装异常，请重试");
        setLoading(false);
      }
    }, 1600);
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFF8F3" }}>
      {/* Top nav */}
      <div style={{ background: "white", borderBottom: "1px solid #F3F4F6", padding: "13px 20px 11px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: "#F9FAFB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ArrowLeft size={18} color="#1F2937" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1F2937", flex: 1 }}>{student.name}</span>
        <button onClick={() => setShowProfile(true)} style={{ fontSize: 12, color: "#9CA3AF", background: "#F9FAFB", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", flexShrink: 0 }}>
          档案
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>

        {/* ① 上次点评参考条 — always shown; null = no-history placeholder */}
        <LastReviewBar review={lastReview} />

        {/* generation error alert (option-1 三态之一) */}
        {genError && (
          <div style={{ margin: "0 20px 14px", background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", marginBottom: 4 }}>生成失败</div>
            <div style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.6 }}>{genError}</div>
            <button onClick={() => setGenError(null)} style={{ marginTop: 8, height: 36, padding: "0 14px", borderRadius: 999, border: "1.5px solid #FCA5A5", background: "white", color: "#DC2626", fontSize: 13, cursor: "pointer" }}>我知道了</button>
          </div>
        )}

        {/* ② 本节课学科 — above tabs */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: `1.5px solid ${subjectFocused ? "#F97316" : "#F3F4F6"}`, boxShadow: subjectFocused ? "0 4px 16px rgba(249,115,22,0.1)" : "0 4px 20px rgba(0,0,0,0.04)", transition: "border-color 0.2s, box-shadow 0.2s" }}>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              onFocus={() => setSubjectFocused(true)}
              onBlur={() => setSubjectFocused(false)}
              placeholder="本节课学科，如 英语 / 数学 / 美术"
              style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#1F2937", background: "transparent", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* ③ Category tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "14px 20px 12px", gap: 8, scrollbarWidth: "none", background: "transparent" }}>
          {CATEGORIES.map((cat, i) => {
            const active = activeTab === i;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  flexShrink: 0, height: 34, padding: "0 16px", borderRadius: 999,
                  border: active ? "none" : "1.5px solid #F3F4F6",
                  background: active ? cat.color : "white",
                  color: active ? "white" : "#6B7280",
                  fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ④ Tag pills */}
        <div style={{ padding: "0 20px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allTagsForTab(activeTab).map(tag => {
            const sel = isSelected(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 999,
                  border: sel ? `1.5px solid ${activeCat.color}40` : "1.5px solid #F3F4F6",
                  background: sel ? activeCat.light : "white",
                  color: sel ? activeCat.textColor : "#4B5563",
                  fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
                }}
              >
                {sel && <span style={{ width: 6, height: 6, borderRadius: 999, background: activeCat.color, display: "inline-block", flexShrink: 0 }} />}
                {tag}
              </button>
            );
          })}
          {/* Custom tag pill */}
          <button
            onClick={() => { setCustomCat(activeTab); setShowCustomModal(true); }}
            style={{ height: 36, padding: "0 14px", borderRadius: 999, border: "1.5px dashed #D1D5DB", background: "#F9FAFB", color: "#9CA3AF", fontSize: 13, cursor: "pointer" }}
          >
            + 自定义标签
          </button>
        </div>

        {/* ⑤ Star cards */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <StarCard label="课堂专注度" subtitle="学习态度" value={focusStar} onChange={setFocusStar} />
          <StarCard label="课堂吸收度" subtitle="教学效果" value={absorbStar} onChange={setAbsorbStar} />
        </div>

        {/* ⑥ Note */}
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ background: "white", borderRadius: 16, padding: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2.5" stroke="#F97316" strokeWidth="1.4" />
                <path d="M4 5h6M4 7.5h4" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              随手记
            </div>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={e => { setNote(e.target.value); autoResize(); }}
              placeholder="顺手记下一句话：今天他哪里卡壳了，或者哪里表现得不错…"
              style={{ width: "100%", minHeight: 80, border: "1.5px solid #F3F4F6", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: "#1F2937", background: "#FAFAFA", resize: "none", outline: "none", lineHeight: 1.65, fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocus={e => { e.target.style.borderColor = "#F97316"; e.target.style.boxShadow = "0 4px 16px rgba(249,115,22,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "#F3F4F6"; e.target.style.boxShadow = "none"; }}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 28px", background: "linear-gradient(to top, #FFF8F3 75%, transparent)" }}>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ width: "100%", height: 54, background: loading ? "#9CA3AF" : "#F97316", color: "white", borderRadius: 999, fontSize: 17, fontWeight: 600, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 6px 24px rgba(249,115,22,0.35)", transition: "all 0.2s" }}
        >
          {loading ? (
            <><Spinner />AI 正在生成…</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L11.2 7.2H16.5L12.2 10.5L13.8 15.8L9 12.8L4.2 15.8L5.8 10.5L1.5 7.2H6.8L9 2Z" fill="white" opacity="0.9" />
              </svg>
              生成反馈
            </>
          )}
        </button>
      </div>

      {/* Skeleton overlay */}
      {loading && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,248,243,0.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 20 }}>
          <div style={{ width: 56, height: 56, background: "#FFEFE5", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="#F97316">
              <path d="M13 2L15.8 9H23L17.5 13.5L19.5 21L13 17L6.5 21L8.5 13.5L3 9H10.2L13 2Z" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1F2937", margin: 0 }}>AI 正在思考…</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 0 }}>大约需要 30 秒</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 250 }}>
            {[100, 80, 92, 68].map((w, i) => (
              <div key={i} style={{ height: 11, background: "#F3F4F6", borderRadius: 6, width: `${w}%`, animation: `pulse 1.4s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <Modal onClose={() => setShowProfile(false)}>
          <ProfileCard student={student} idx={studentIdx} />
        </Modal>
      )}

      {/* Custom tag modal */}
      {showCustomModal && (
        <Modal onClose={() => setShowCustomModal(false)}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1F2937", marginBottom: 6 }}>添加自定义标签</h3>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 18, marginTop: 0 }}>确认后会加入全局常用标签库，可跨学生复用</p>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>标签内容</div>
              <CustomTagInput value={customInput} onChange={setCustomInput} onEnter={handleAddCustom} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>归属分类</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomCat(i)}
                    style={{ height: 32, padding: "0 14px", borderRadius: 999, border: customCat === i ? "none" : "1.5px solid #F3F4F6", background: customCat === i ? cat.color : "white", color: customCat === i ? "white" : "#6B7280", fontSize: 12, fontWeight: customCat === i ? 600 : 400, cursor: "pointer" }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCustomModal(false)} style={{ flex: 1, height: 46, background: "#F9FAFB", border: "1.5px solid #F3F4F6", borderRadius: 14, fontSize: 14, color: "#6B7280", cursor: "pointer" }}>取消</button>
              <button onClick={handleAddCustom} disabled={!customInput.trim()} style={{ flex: 2, height: 46, background: customInput.trim() ? "#1F2937" : "#D1D5DB", color: "white", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: customInput.trim() ? "pointer" : "not-allowed" }}>
                确认添加
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function CustomTagInput({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") onEnter(); }}
      placeholder="输入自定义标签，如 思路清晰"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ width: "100%", height: 44, borderRadius: 12, border: `1.5px solid ${focused ? "#F97316" : "#F3F4F6"}`, padding: "0 12px", fontSize: 14, color: "#1F2937", background: "white", outline: "none", boxSizing: "border-box", boxShadow: focused ? "0 4px 16px rgba(249,115,22,0.1)" : "none", transition: "all 0.2s", fontFamily: "inherit" }}
    />
  );
}

function StarCard({ label, subtitle, value, onChange }: { label: string; subtitle: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2937" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill={n <= value ? "#F97316" : "#F3F4F6"}>
              <path d="M11 2L13.5 8H20L15 11.5L17 18L11 14.5L5 18L7 11.5L2 8H8.5L11 2Z" stroke={n <= value ? "#F97316" : "#D1D5DB"} strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: 999, animation: "spin 0.8s linear infinite" }} />;
}

// ─── Generate Context ─────────────────────────────────────────────────────────

interface GenerateContext {
  subject: string;
  tags: { tag: string; category: string }[];
  focusStar: number;
  absorbStar: number;
  note: string;
  review?: { fullText: string; summary: string };
}

function buildSampleText(ctx: GenerateContext, student: Student): { wechat: string; voice: string } {
  const subjectLine = ctx.subject ? `${ctx.subject}课` : "这节课";
  const focusDesc = ctx.focusStar >= 4 ? "专注度很高" : ctx.focusStar >= 2 ? "整体比较认真" : "需要加强专注";
  const absorbDesc = ctx.absorbStar >= 4 ? "课堂内容掌握得不错" : ctx.absorbStar >= 2 ? "对知识点有一定吸收" : "知识点还需多巩固";
  const tagTexts = ctx.tags.map(t => t.tag).slice(0, 3).join("、");
  const factLine = ctx.note.trim() ? `老师特别记录了一点：${ctx.note.trim()}。` : "";
  const personalityHint = student.personality ? `结合孩子${student.personality.split("，")[0]}的特点，` : "";

  const wechat = `您好！今天${subjectLine}，${student.name}${focusDesc}，${absorbDesc} 😊${tagTexts ? `\n\n课堂表现中，${tagTexts}，让老师印象很深刻。` : ""}${factLine ? `\n\n${factLine}` : ""}\n\n${personalityHint}接下来我们可以一起在这方面多鼓励和练习，相信进步会越来越明显！期待下节课继续加油 ✨`;

  const voice = `您好，我是${student.name}的老师。今天${subjectLine}想跟您同步一下。${focusDesc}，${absorbDesc}。${tagTexts ? `课上${tagTexts}这几点表现很值得肯定。` : ""}${ctx.note.trim() ? ctx.note.trim() + "，我们下次重点关注一下。" : ""}有什么问题随时联系我！`;

  return { wechat, voice };
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({ student, ctx, onBack, onRedo }: {
  student: Student;
  ctx: GenerateContext;
  onBack: () => void;
  onRedo: () => void;
}) {
  const samples = buildSampleText(ctx, student);
  const [wechatText, setWechatText] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [wechatDone, setWechatDone] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);

  const typeText = useCallback((full: string, setter: (s: string) => void, onDone: () => void) => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setter(full.slice(0, i));
      if (i >= full.length) { clearInterval(iv); onDone(); }
    }, 16);
    return iv;
  }, []);

  useEffect(() => {
    const t1 = typeText(samples.wechat, setWechatText, () => setWechatDone(true));
    const delay = samples.wechat.length * 16 + 400;
    const t2 = setTimeout(() => typeText(samples.voice, setVoiceText, () => setVoiceDone(true)), delay);
    return () => { clearInterval(t1); clearTimeout(t2); };
  }, []);

  const handleCopy = () => {
    if (!wechatText.trim() && !voiceText.trim()) {
      setCopied(false);
      return; // 空态：无内容不复制
    }
    try {
      navigator.clipboard?.writeText(`【微信长文】\n${wechatText}\n\n【语音脚本】\n${voiceText}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
      window.alert("复制失败：当前环境不支持 Clipboard API，请手动选择文本复制");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFF8F3" }}>
      {/* Top nav */}
      <div style={{ background: "white", borderBottom: "1px solid #F3F4F6", padding: "13px 20px 11px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: "#F9FAFB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color="#1F2937" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1F2937", flex: 1 }}>{student.name} 的反馈</span>
        <div style={{ background: "#FFEFE5", borderRadius: 999, padding: "3px 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F97316" }}>AI 生成</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
        <ResultCard icon={<MessageCircle size={14} color="#F97316" />} label="微信长文" badge="80–120字" text={wechatText} isDone={wechatDone} accentColor="#F97316" />
        <ResultCard icon={<Mic size={14} color="#6B7280" />} label="语音脚本" badge="口语化" text={voiceText} isDone={voiceDone} accentColor="#6B7280" muted />
      </div>

      {/* Bottom actions — only copy + redo */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 28px", background: "linear-gradient(to top, #FFF8F3 78%, transparent)", display: "flex", gap: 10 }}>
        <button
          onClick={handleCopy}
          style={{ flex: 1, height: 52, background: copied ? "#22C55E" : "#1F2937", color: "white", borderRadius: 999, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background 0.3s", boxShadow: "0 4px 20px rgba(31,41,55,0.18)" }}
        >
          <Copy size={15} />{copied ? "已复制！" : "一键复制"}
        </button>
        <button
          onClick={() => setShowRedoModal(true)}
          style={{ width: 52, height: 52, background: "white", borderRadius: 999, border: "1.5px solid #F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <RefreshCw size={17} color="#6B7280" />
        </button>
      </div>

      {/* Redo modal */}
      {showRedoModal && (
        <Modal onClose={() => setShowRedoModal(false)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "#FFEFE5", borderRadius: 999, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RefreshCw size={22} color="#F97316" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", marginBottom: 8 }}>换个说法？</h3>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65, marginBottom: 22 }}>AI 将以不同语气和角度重新生成，保留你输入的标签与评分。</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowRedoModal(false)} style={{ flex: 1, height: 46, background: "#F9FAFB", border: "1.5px solid #F3F4F6", borderRadius: 14, fontSize: 14, color: "#6B7280", cursor: "pointer" }}>取消</button>
              <button onClick={() => { setShowRedoModal(false); onRedo(); }} style={{ flex: 1, height: 46, background: "#F97316", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer" }}>重新生成</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ResultCard({ icon, label, badge, text, isDone, accentColor, muted }: {
  icon: React.ReactNode; label: string; badge: string; text: string; isDone: boolean; accentColor: string; muted?: boolean;
}) {
  return (
    <div style={{ background: "white", borderRadius: 20, padding: "16px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 600, color: muted ? "#6B7280" : "#1F2937" }}>{label}</span>
        <span style={{ fontSize: 11, color: accentColor, background: muted ? "#F9FAFB" : "#FFEFE5", padding: "2px 8px", borderRadius: 999, marginLeft: 2 }}>{badge}</span>
      </div>
      <div style={{ fontSize: 14.5, color: "#333333", lineHeight: 1.78, minHeight: 56, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {text}
        {!isDone && <span style={{ display: "inline-block", width: 2, height: 15, background: accentColor, borderRadius: 1, marginLeft: 2, animation: "blink 0.75s step-end infinite", verticalAlign: "middle" }} />}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ─── Account Screen ───────────────────────────────────────────────────────────

function AccountScreen({ studentCount, onBack, onLogout }: { studentCount: number; onBack: () => void; onLogout: () => void }) {
  const menuGroups = [
    {
      items: [
        { icon: "✦", label: "关于暖评 AI", sub: "v1.0 · 温暖极简版" },
        { icon: "💬", label: "加开发者微信", sub: "Surge_forward_" },
      ],
    },
    {
      items: [
        { icon: "❓", label: "使用帮助", sub: "常见问题 & 使用技巧" },
        { icon: "🔒", label: "隐私政策", sub: "数据安全说明" },
      ],
    },
    {
      items: [
        { icon: "🚪", label: "退出登录", sub: "", danger: true },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFF8F3" }}>
      {/* Top nav */}
      <div style={{ background: "#FFF8F3", padding: "13px 20px 11px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: "white", border: "1.5px solid #F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} color="#1F2937" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1F2937" }}>账号</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 40px" }}>
        {/* Account card */}
        <div style={{ background: "white", borderRadius: 20, padding: "20px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: "#FFEFE5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24, fontWeight: 700, color: "#F97316" }}>
            师
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1F2937" }}>体验用户</div>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>教培老师 · 已生成 128 条点评</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: "white", borderRadius: 20, padding: "18px 16px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            <StatCell label="累计生成" value="128" color="#F97316" />
            <StatCell label="本月生成" value="34" color="#1F2937" border />
            <StatCell label="服务学生" value={String(studentCount)} color="#1F2937" border />
          </div>
        </div>

        {/* Menu groups */}
        {menuGroups.map((group, gi) => (
          <div key={gi} style={{ background: "white", borderRadius: 16, marginBottom: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            {group.items.map((item, ii) => (
              <button
                key={ii}
                onClick={item.danger ? onLogout : undefined}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", background: "none", border: "none", cursor: "pointer", borderTop: ii > 0 ? "1px solid #F9FAFB" : "none", textAlign: "left" }}
              >
                <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: item.danger ? "#EF4444" : "#1F2937", fontWeight: 500 }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{item.sub}</div>}
                </div>
                {!item.danger && <ChevronRight size={16} color="#D1D5DB" />}
              </button>
            ))}
          </div>
        ))}

        {/* Version */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: "#D1D5DB" }}>暖评 AI · 专为老师设计</span>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, color, border }: { label: string; value: string; color: string; border?: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0", borderLeft: border ? "1px solid #F3F4F6" : "none" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeStudentIdx, setActiveStudentIdx] = useState(0);
  const [genCtx, setGenCtx] = useState<GenerateContext | null>(null);

  const handleSelect = (s: Student) => {
    setActiveStudent(s);
    setActiveStudentIdx(students.findIndex(x => x.id === s.id));
    setScreen("checkin");
  };

  const handleAddStudent = (s: Student) => {
    setStudents(prev => [s, ...prev]);
  };

  const handleGenerate = (ctx: GenerateContext) => {
    setGenCtx(ctx);
    setScreen("result");
  };

  const handleRedo = () => {
    // 真·换个说法：基于当前 genCtx.review 生成同主题变体（非静默跳转）
    setScreen("checkin");
    setTimeout(() => {
      setScreen("result");
      // 重拼装 fullText 为"另一种语气"版本（沿用原结构，微调表达）
      setGenCtx((prev) => {
        if (!prev || !prev.review) return prev;
        const base = prev.review.fullText;
        const variant = base
          .replace(/表现让老师很欣慰|表现非常稳定|让老师眼前一亮/, "表现再次让老师点头")
          .replace(/这是一个很好的成长信号|在班里属于非常突出的水平|这是一个很好的成长信号/, "细节可以更讲究");
        return { ...prev, review: { ...prev.review, fullText: variant } };
      });
    }, 80);
  };

  return (
    <PhoneFrame>
      {screen === "login" && <LoginScreen onEnter={() => setScreen("list")} />}
      {screen === "list" && (
        <ListScreen
          students={students}
          onSelect={handleSelect}
          onAddStudent={handleAddStudent}
          onAccount={() => setScreen("account")}
        />
      )}
      {/* 空态演示入口（第六步：列表空态可手动触发） */}
      {screen === "list" && (
        <button
          onClick={() => setStudents([])}
          style={{ position: "absolute", bottom: 92, left: 20, height: 36, padding: "0 14px", borderRadius: 999, border: "1.5px solid #F3F4F6", background: "white", color: "#6B7280", fontSize: 13, cursor: "pointer", zIndex: 20 }}
        >
          演示空态
        </button>
      )}
      {screen === "checkin" && activeStudent && (
        <CheckinScreen
          student={activeStudent}
          studentIdx={activeStudentIdx}
          onGenerate={handleGenerate}
          onBack={() => setScreen("list")}
        />
      )}
      {screen === "result" && activeStudent && genCtx && (
        <ResultScreen
          student={activeStudent}
          ctx={genCtx}
          onBack={() => setScreen("checkin")}
          onRedo={handleRedo}
        />
      )}
      {screen === "account" && (
        <AccountScreen
          studentCount={students.length}
          onBack={() => setScreen("list")}
          onLogout={() => setScreen("login")}
        />
      )}
    </PhoneFrame>
  );
}
