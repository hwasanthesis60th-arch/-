
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calculator, 
  School, 
  User as UserIcon, 
  ChevronRight, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Search,
  MessageSquare,
  Bookmark,
  ArrowLeft,
  Settings,
  Star,
  LogIn,
  Loader2,
  Globe,
  MapPin,
  LogOut,
  Info,
  X
} from 'lucide-react';
import { UserProfile, SemesterData, HighSchool, SubjectGrade, Achievement } from './types';
import { 
  GRADE_1_SUBJECTS, 
  GRADE_2_SUBJECTS, 
  GRADE_3_SUBJECTS, 
  INITIAL_NON_ACADEMIC,
  MOCK_SCHOOLS 
} from './constants';
import { 
  getAchievement, 
  calculatePerfScale, 
  calculateTotalScore 
} from './utils/gradeUtils';
import { 
  getAIConsultation, 
  searchHighSchoolsViaAI, 
  calculateSchoolSpecificGrade
} from './services/geminiService';

// --- Components ---

const Button = ({ children, onClick, className = '', variant = 'primary', disabled, loading }: any) => {
  const variants: any = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    secondary: 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50',
    outline: 'bg-transparent text-slate-600 border border-slate-300 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }: any) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, type = 'number', max, min = 0, placeholder, disabled, step }: any) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      max={max}
      min={min}
      step={step}
      disabled={disabled}
      placeholder={disabled ? 'X' : placeholder}
      className={`border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all ${disabled ? 'bg-slate-100 text-slate-300 cursor-not-allowed font-black text-center' : 'bg-white text-slate-700'}`}
    />
  </div>
);

// --- Main App Logic ---

export default function App() {
  const [view, setView] = useState<'splash' | 'login' | 'menu' | 'academic' | 'non-academic' | 'entrance' | 'semester-detail'>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<HighSchool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEntranceTab, setActiveEntranceTab] = useState<'bookmarks' | 'search' | 'ai'>('bookmarks');
  const [searchResults, setSearchResults] = useState<HighSchool[]>(MOCK_SCHOOLS);
  const [isSearching, setIsSearching] = useState(false);
  const [loginData, setLoginData] = useState({ id: '', pw: '' });
  
  // 로그인 상태 복구
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('hwasan_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setView('menu');
      } else {
        setView('login');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    if (!loginData.id) return alert('아이디를 입력해주세요.');
    const newUser: UserProfile = {
      id: loginData.id,
      username: loginData.id,
      semesters: {},
      nonAcademic: INITIAL_NON_ACADEMIC,
      bookmarks: [],
    };
    setUser(newUser);
    localStorage.setItem('hwasan_user', JSON.stringify(newUser));
    setView('menu');
  };

  const handleLogout = () => {
    if(confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('hwasan_user');
      setUser(null);
      setView('login');
    }
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    localStorage.setItem('hwasan_user', JSON.stringify(updated));
  };

  const handleGlobalSearch = async () => {
    if (!searchTerm) {
      setSearchResults(MOCK_SCHOOLS);
      return;
    }
    setIsSearching(true);
    // 우선 로컬 검색
    const local = MOCK_SCHOOLS.filter(s => s.name.includes(searchTerm) || s.location.includes(searchTerm));
    if (local.length > 0) {
      setSearchResults(local);
      setIsSearching(false);
    } else {
      // 로컬에 없으면 AI 검색
      const results = await searchHighSchoolsViaAI(searchTerm);
      if (results && results.length > 0) {
        setSearchResults(results);
      }
      setIsSearching(false);
    }
  };

  const totalScore = useMemo(() => {
    if (!user) return 0;
    return calculateTotalScore(user.semesters, user.nonAcademic).toFixed(2);
  }, [user]);

  // --- 입력 차단 로직 (화산중 전형 요강 준수) ---
  const isInputDisabled = (semester: string, subjectName: string, field: string) => {
    const grade = semester[0];
    const isArtsPe = ['미술', '음악', '체육'].includes(subjectName);

    if (grade === '1') {
      if (field === 'midterm') {
        return !['국어', '수학', '영어', '과학', '사회', '기가', '도덕'].includes(subjectName);
      }
      if (field === 'final') {
        return !['국어', '수학', '영어', '과학', '사회', '기가', '도덕', '한문'].includes(subjectName);
      }
    } else {
      // 2, 3학년 지필고사
      if (field === 'paperTest') {
        return !['국어', '수학', '영어', '과학', '역사', '사회', '기가'].includes(subjectName);
      }
    }
    return false;
  };

  // --- Sub Views ---

  const renderSplash = () => (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 relative animate-pulse">
        <div className="w-28 h-28 bg-blue-100 rounded-3xl flex items-center justify-center mb-4 overflow-hidden border-4 border-blue-50 shadow-xl">
           <img src="https://picsum.photos/seed/hwasan/300" alt="Hwasan Logo" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
          <School className="w-5 h-5 text-white" />
        </div>
      </div>
      <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter">화산중 성적을 부탁해</h1>
      <p className="text-blue-500 font-bold text-sm">성공적인 고등학교 진학의 동반자</p>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-10 space-y-8 shadow-2xl border-none rounded-[40px]">
        <div className="flex justify-center">
           <div className="p-4 bg-blue-50 rounded-[32px] border-4 border-white shadow-inner">
             <img src="https://picsum.photos/seed/hwasan/200" className="w-20 h-20 rounded-[24px] shadow-sm" />
           </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Sign In</h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">회원가입과 로그인이 동시에!<br/>화산중학교 학생 전용 시스템</p>
        </div>
        <div className="space-y-4">
          <Input 
            label="Account ID" 
            type="text" 
            placeholder="아이디를 입력하세요" 
            value={loginData.id} 
            onChange={(v:string) => setLoginData(prev => ({...prev, id: v}))}
          />
          <Input 
            label="Security Password" 
            type="password" 
            placeholder="비밀번호를 입력하세요" 
            value={loginData.pw}
            onChange={(v:string) => setLoginData(prev => ({...prev, pw: v}))}
          />
          <Button className="w-full py-5 text-xl font-black rounded-2xl mt-4 shadow-xl shadow-blue-100" onClick={handleLogin}>
            <LogIn className="w-6 h-6" />
            성적 산출 시작
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderMenu = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-none">화산중 성적 매니저</h1>
            <p className="text-[10px] text-blue-500 font-black uppercase mt-1 tracking-widest">Hwasan Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-black uppercase leading-none mb-1">Authenticated</p>
            <p className="text-sm font-black text-blue-600 underline decoration-2 underline-offset-4">{user?.username}님</p>
          </div>
          <button onClick={handleLogout} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-slate-100">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6 flex-1 max-w-2xl mx-auto w-full">
        <Card className="p-8 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white relative overflow-hidden shadow-2xl shadow-blue-200 border-none rounded-[32px]">
          <div className="absolute -top-10 -right-10 opacity-10">
            <Calculator className="w-48 h-48" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-black opacity-80 uppercase tracking-widest mb-1">My Cumulative Score</p>
              <h2 className="text-6xl font-black tracking-tighter">{totalScore} <span className="text-2xl font-bold opacity-40">/ 300</span></h2>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
              <Star className="w-7 h-7" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black opacity-80 uppercase">
              <span>Goal Tracking</span>
              <span>{((Number(totalScore) / 300) * 100).toFixed(1)}% Achieved</span>
            </div>
            <div className="bg-white/20 h-4 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <div className="bg-white h-full transition-all duration-1500 ease-out shadow-lg" style={{ width: `${(Number(totalScore) / 300) * 100}%` }} />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => setView('academic')}
            className="group flex items-center gap-5 p-7 bg-white rounded-[32px] border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-50 transition-all text-left relative overflow-hidden active:scale-95"
          >
            <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-600 rounded-3xl flex items-center justify-center text-blue-600 group-hover:text-white transition-all shadow-sm">
              <Calculator className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">내신 성적 산출</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">학년별 교과 점수 및 비교과 종합 산정</p>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
               <ChevronRight className="w-6 h-6" />
            </div>
          </button>

          <button 
            onClick={() => setView('entrance')}
            className="group flex items-center gap-5 p-7 bg-white rounded-[32px] border border-slate-100 hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-50 transition-all text-left relative overflow-hidden active:scale-95"
          >
            <div className="w-16 h-16 bg-sky-50 group-hover:bg-sky-600 rounded-3xl flex items-center justify-center text-sky-600 group-hover:text-white transition-all shadow-sm">
              <School className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">고등학교 진학</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">목표 학교 정보 탐색 및 입학 성적 환산</p>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all">
               <ChevronRight className="w-6 h-6" />
            </div>
          </button>
        </div>
      </main>
    </div>
  );

  const renderAcademicMenu = () => (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-6 py-5 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <button onClick={() => setView('menu')} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">성적 산출 센터</h1>
      </header>
      <main className="p-6 space-y-8 max-w-2xl mx-auto">
        <div className="text-center py-8 bg-white rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">Middle School Cumulative Grade</p>
          <h2 className="text-6xl font-black text-blue-600 tracking-tighter">{totalScore} <span className="text-xl font-black text-slate-200">/ 300</span></h2>
          <div className="mt-6 flex justify-center gap-6 px-8">
             <div className="flex-1 bg-slate-50 p-4 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Academic</p>
                <p className="font-black text-slate-800">240.0</p>
             </div>
             <div className="flex-1 bg-slate-50 p-4 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Non-Acad</p>
                <p className="font-black text-slate-800">60.0</p>
             </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            className="flex-1 py-7 flex flex-col items-center gap-2 rounded-[32px] shadow-2xl shadow-blue-100 border-none transition-transform hover:scale-105"
            onClick={() => {}}
          >
            <BookOpen className="w-8 h-8" />
            <span className="font-black text-lg">교과 성적</span>
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1 py-7 flex flex-col items-center gap-2 rounded-[32px] border-slate-200 transition-transform hover:scale-105 shadow-sm"
            onClick={() => setView('non-academic')}
          >
            <CheckCircle2 className="w-8 h-8" />
            <span className="font-black text-lg">비교과 성적</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {['1학년 1학기', '1학년 2학기', '2학년 1학기', '2학년 2학기', '3학년 1학기', '3학년 2학기'].map((sem) => (
            <button
              key={sem}
              onClick={() => {
                setSelectedSemester(sem);
                setView('semester-detail');
              }}
              className="p-6 bg-white rounded-[28px] border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex justify-between items-center group shadow-sm active:scale-95"
            >
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-inner">
                   <Settings className="w-5 h-5" />
                 </div>
                 <span className="text-sm font-black text-slate-700">{sem}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-600 transition-all" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );

  const renderSemesterDetail = () => {
    if (!selectedSemester || !user) return null;
    const isGrade1 = selectedSemester.startsWith('1');
    const isGrade2 = selectedSemester.startsWith('2');
    const isGrade3 = selectedSemester.startsWith('3');
    const subjects = isGrade1 ? GRADE_1_SUBJECTS : isGrade2 ? GRADE_2_SUBJECTS : GRADE_3_SUBJECTS;
    
    const data: SemesterData = user.semesters[selectedSemester] || { 
      isFreeSemester: false, 
      subjects: subjects.map(name => ({ name, rawScore: 0, achievement: 'A' as Achievement })) 
    };

    const handleToggleFree = (val: boolean) => {
      const updated = { ...user };
      updated.semesters[selectedSemester] = {
        ...data,
        isFreeSemester: val,
        subjects: data.subjects.map(s => ({ 
          ...s, 
          achievement: val ? 'P' : 'A' as Achievement, 
          rawScore: val ? '-' : 0 
        }))
      };
      handleUpdateUser(updated);
    };

    const handleUpdateSubject = (index: number, field: string, val: any) => {
      const updated = { ...user };
      const currentSub: SubjectGrade = { ...data.subjects[index], [field]: Number(val) };
      
      let calculatedRaw = 0;
      const isArtsPe = ['미술', '음악', '체육'].includes(currentSub.name);
      
      if (isGrade1) {
        const mid = currentSub.midterm || 0;
        const fin = currentSub.final || 0;
        const perf = currentSub.performance || 0;
        if (['국어', '수학', '영어', '과학', '사회', '기가', '도덕'].includes(currentSub.name)) {
          calculatedRaw = (mid * 0.3) + (fin * 0.3) + perf;
        } else if (currentSub.name === '도덕') {
          calculatedRaw = (mid * 0.2) + (fin * 0.2) + perf;
        } else if (currentSub.name === '한문') {
          calculatedRaw = (fin * 0.3) + perf;
        } else {
          calculatedRaw = perf;
        }
      } else {
        const pA = calculatePerfScale(currentSub.perfA || 0);
        const pB = calculatePerfScale(currentSub.perfB || 0);
        const pC = calculatePerfScale(currentSub.perfC || 0);
        const pD = calculatePerfScale(currentSub.perfD || 0);
        const jt = currentSub.paperTest || 0;
        if (['국어', '수학', '역사'].includes(currentSub.name) || (currentSub.name === '과학' && isGrade2 && selectedSemester.includes('1학기'))) {
          calculatedRaw = (pA * 0.2) + (pB * 0.2) + (pC * 0.2) + (pD * 0.2) + (jt * 0.2);
        } else if (currentSub.name === '과학') {
           calculatedRaw = (pA * 0.18) + (pB * 0.17) + (pC * 0.18) + (pD * 0.17) + (jt * 0.3);
        } else if (currentSub.name === '영어') {
          const w = selectedSemester.includes('1학기') ? {A:0.1, B:0.1, C:0.25, D:0.25, JT:0.3} : {A:0.1, B:0.2, C:0.2, D:0.2, JT:0.3};
          calculatedRaw = (pA * w.A) + (pB * w.B) + (pC * w.C) + (pD * w.D) + (jt * w.JT);
        } else if (currentSub.name === '기가' || (isGrade3 && currentSub.name === '한문')) {
          calculatedRaw = (pA * 0.2) + (pB * 0.1) + (pC * 0.1) + (pD * 0.3) + (jt * 0.3);
        } else if (currentSub.name === '사회' && isGrade3) {
          calculatedRaw = (pA * 0.15) + (pB * 0.15) + (pC * 0.2) + (pD * 0.2) + (jt * 0.3);
        } else if (['음악'].includes(currentSub.name)) {
          calculatedRaw = (pA * 0.2) + (pB * 0.3) + (pC * 0.2) + (pD * 0.3);
        } else {
          calculatedRaw = (pA * 0.25) + (pB * 0.25) + (pC * 0.25) + (pD * 0.25);
        }
      }

      currentSub.rawScore = Number(calculatedRaw.toFixed(1));
      currentSub.achievement = getAchievement(currentSub.rawScore, isArtsPe);
      
      if (!updated.semesters[selectedSemester]) updated.semesters[selectedSemester] = data;
      updated.semesters[selectedSemester].subjects[index] = currentSub;
      handleUpdateUser(updated);
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="px-6 py-5 border-b flex items-center justify-between sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('academic')} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{selectedSemester}</h1>
          </div>
          <div className={`px-4 py-2 rounded-2xl font-black text-xs transition-all shadow-sm ${data.isFreeSemester ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {data.isFreeSemester ? '자유학기제' : '성적입력'}
          </div>
        </header>
        <main className="p-4 space-y-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between p-6 bg-white rounded-[32px] border-2 border-slate-100 shadow-xl">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${data.isFreeSemester ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">자유학기제 설정</p>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Pass/Fail System</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={data.isFreeSemester} 
              onChange={(e) => handleToggleFree(e.target.checked)}
              className="w-10 h-10 rounded-xl accent-blue-600 cursor-pointer shadow-sm transition-all"
            />
          </div>

          <div className="overflow-x-auto rounded-[32px] border border-slate-100 shadow-2xl bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b">
                  <th className="p-5 font-black uppercase tracking-widest">과목</th>
                  <th className="p-5 font-black text-center uppercase tracking-widest">성취도</th>
                  {isGrade1 ? (
                    <>
                      <th className="p-2 text-center font-black">중간</th>
                      <th className="p-2 text-center font-black">기말</th>
                      <th className="p-2 text-center font-black">수행</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 text-center font-black">수행A</th>
                      <th className="p-2 text-center font-black">수행B</th>
                      <th className="p-2 text-center font-black">수행C</th>
                      <th className="p-2 text-center font-black">수행D</th>
                      <th className="p-2 text-center font-black">지필</th>
                    </>
                  )}
                  <th className="p-5 text-right font-black uppercase tracking-widest">원점수</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((sub, idx) => (
                  <tr key={idx} className="border-b last:border-none hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-black text-slate-800 bg-slate-50/30 text-sm">{sub.name}</td>
                    <td className="p-2 text-center">
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center font-black text-xs shadow-md transition-all ${
                        sub.achievement === 'A' ? 'bg-green-500 text-white' :
                        sub.achievement === 'P' ? 'bg-blue-600 text-white' : 
                        sub.achievement === 'E' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {sub.achievement}
                      </div>
                    </td>
                    {isGrade1 ? (
                      <>
                        <td className="p-1 px-1">
                           <Input 
                             value={sub.midterm || ''} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'midterm', v)} 
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'midterm')}
                           />
                        </td>
                        <td className="p-1 px-1">
                           <Input 
                             value={sub.final || ''} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'final', v)} 
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'final')}
                           />
                        </td>
                        <td className="p-1 px-1">
                           <Input 
                             value={sub.performance || ''} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'performance', v)} 
                             disabled={data.isFreeSemester}
                           />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-1 px-1"><Input value={sub.perfA || ''} onChange={(v: any) => handleUpdateSubject(idx, 'perfA', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={sub.perfB || ''} onChange={(v: any) => handleUpdateSubject(idx, 'perfB', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={sub.perfC || ''} onChange={(v: any) => handleUpdateSubject(idx, 'perfC', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={sub.perfD || ''} onChange={(v: any) => handleUpdateSubject(idx, 'perfD', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1">
                           <Input 
                             value={sub.paperTest || ''} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'paperTest', v)} 
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'paperTest')}
                           />
                        </td>
                      </>
                    )}
                    <td className="p-5 font-black text-right text-blue-600 text-base tabular-nums bg-blue-50/20">{sub.rawScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  };

  const renderNonAcademic = () => {
    if (!user) return null;
    const { attendance, volunteer, behavior } = user.nonAcademic;

    const handleUpdateAttendance = (type: 'absences' | 'tardies' | 'earlyLeaves' | 'results', gradeIdx: number, val: string) => {
      const updated = { ...user };
      const newArr = [...updated.nonAcademic.attendance[type]] as [number, number, number];
      newArr[gradeIdx] = Math.max(0, Number(val));
      updated.nonAcademic.attendance[type] = newArr;
      handleUpdateUser(updated);
    };

    const handleUpdateVolunteer = (field: string, val: any) => {
      const updated = { ...user };
      (updated.nonAcademic.volunteer as any)[field] = val;
      handleUpdateUser(updated);
    };

    const handleUpdateBehavior = (grade: 'grade1' | 'grade2' | 'grade3', field: 'base' | 'extra', val: string) => {
      const updated = { ...user };
      updated.nonAcademic.behavior[grade][field] = Number(val);
      handleUpdateUser(updated);
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="px-6 py-5 border-b bg-white flex items-center gap-4 sticky top-0 z-40 shadow-sm">
          <button onClick={() => setView('academic')} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">비교과 종합 관리</h1>
        </header>
        <main className="p-6 space-y-10 max-w-4xl mx-auto pb-20">
          <section className="space-y-4">
            <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              1. 출결 상황 (30점)
            </h3>
            <Card className="overflow-hidden border-slate-100 shadow-xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-5 font-black text-slate-400 uppercase">구분</th>
                    <th className="p-5 font-black text-slate-700">1학년</th>
                    <th className="p-5 font-black text-slate-700">2학년</th>
                    <th className="p-5 font-black text-slate-700">3학년</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(['absences', 'tardies', 'earlyLeaves', 'results'] as const).map((type) => (
                    <tr key={type}>
                      <td className="p-5 font-black text-slate-500 bg-slate-50/30">
                        {type === 'absences' ? '결석' : type === 'tardies' ? '지각' : type === 'earlyLeaves' ? '조퇴' : '결과'}
                      </td>
                      {[0, 1, 2].map((gIdx) => (
                        <td key={gIdx} className="p-2">
                          <Input 
                            value={attendance[type][gIdx]} 
                            onChange={(v: string) => handleUpdateAttendance(type, gIdx, v)} 
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              2. 봉사 활동 (15점)
            </h3>
            <Card className="p-8 border-slate-100 shadow-xl space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Input 
                  label="누적 봉사 시간 (h)" 
                  value={volunteer.hours} 
                  onChange={(v: string) => handleUpdateVolunteer('hours', Number(v))} 
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">적용 점수표 기준</label>
                  <select 
                    value={volunteer.specialCase} 
                    onChange={(e) => handleUpdateVolunteer('specialCase', e.target.value)}
                    className="border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 w-full bg-white text-slate-700 transition-all"
                  >
                    <option value="none">일반 학생 (30시간 기준)</option>
                    <option value="20h">전입생/조기졸업 (20시간 기준)</option>
                    <option value="disabled">장애인 복지법 대상 (15점 부여)</option>
                  </select>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              3. 행동특성 및 종합의견 (15점)
            </h3>
            <Card className="overflow-hidden border-slate-100 shadow-xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-5 font-black text-slate-400 uppercase">학년</th>
                    <th className="p-5 font-black text-slate-700">기본 점수 (3.0)</th>
                    <th className="p-5 font-black text-slate-700">가산점 (최대 2.0)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(['grade1', 'grade2', 'grade3'] as const).map((grade, idx) => (
                    <tr key={grade}>
                      <td className="p-5 font-black text-slate-500 bg-slate-50/30">{idx + 1}학년</td>
                      <td className="p-3">
                        <Input 
                          value={behavior[grade].base} 
                          disabled
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          value={behavior[grade].extra} 
                          onChange={(v: string) => handleUpdateBehavior(grade, 'extra', v)} 
                          max={2} 
                          step={0.5}
                          placeholder="0.5 단위 가산"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </main>
      </div>
    );
  };

  const renderEntrance = () => {
    if (!user) return null;
    const bookmarkedSchools = user.bookmarks.map(id => MOCK_SCHOOLS.find(s => s.id === id) || searchResults.find(s => s.id === id)).filter(Boolean) as HighSchool[];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative">
        <header className="px-6 py-5 border-b bg-white flex items-center gap-4 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setView('menu')} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">고등학교 진학</h1>
        </header>

        <div className="p-4 bg-white border-b sticky top-[73px] z-20 shadow-md">
          <div className="flex bg-slate-100 p-1 rounded-[20px]">
            <button 
              onClick={() => setActiveEntranceTab('bookmarks')}
              className={`flex-1 py-3 rounded-[16px] text-xs font-black transition-all ${activeEntranceTab === 'bookmarks' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500'}`}
            >
              관심 고등학교
            </button>
            <button 
              onClick={() => setActiveEntranceTab('search')}
              className={`flex-1 py-3 rounded-[16px] text-xs font-black transition-all ${activeEntranceTab === 'search' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500'}`}
            >
              전국 학교 탐색
            </button>
            <button 
              onClick={() => setActiveEntranceTab('ai')}
              className={`flex-1 py-3 rounded-[16px] text-xs font-black transition-all ${activeEntranceTab === 'ai' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500'}`}
            >
              AI 전문가 상담
            </button>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full">
          {activeEntranceTab === 'bookmarks' && (
            <div className="space-y-6">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Bookmark className="w-4 h-4 text-blue-600"/> MY TARGETS</h2>
              {bookmarkedSchools.length === 0 ? (
                <div className="py-24 text-center space-y-4 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <Bookmark className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-sm font-black text-slate-400">찜한 학교가 없습니다. 탐색 탭에서 추가하세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {bookmarkedSchools.map(school => (
                    <Card key={school.id} className="cursor-pointer hover:shadow-2xl transition-all duration-300 group shadow-lg" onClick={() => setSelectedSchool(school)}>
                      <div className="relative h-44 overflow-hidden">
                         <img src={school.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         <div className="absolute top-4 left-4">
                           <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black shadow-lg">{school.type}</span>
                         </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{school.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-2 font-bold"><MapPin className="w-3 h-3 text-blue-600"/> {school.location}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeEntranceTab === 'search' && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="학교 이름 또는 지역명 (예: 과학고, 전주)" 
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none font-bold text-sm shadow-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                  />
                </div>
                <Button onClick={handleGlobalSearch} loading={isSearching} className="px-8 rounded-2xl shadow-xl shadow-blue-100">
                   검색
                </Button>
              </div>

              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{searchTerm ? `'${searchTerm}' 결과` : '전국 고등학교 목록 (세션 저장됨)'}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(school => (
                  <Card key={school.id} className="cursor-pointer hover:shadow-2xl transition-all duration-500 border-none shadow-lg group active:scale-95 bg-white" onClick={() => setSelectedSchool(school)}>
                    <div className="relative h-32 overflow-hidden">
                      <img src={school.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                         <h3 className="font-black text-sm text-white line-clamp-1">{school.name}</h3>
                      </div>
                    </div>
                    <div className="p-3 bg-white">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-slate-400 font-black">{school.location}</p>
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black">{school.type}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeEntranceTab === 'ai' && <AIAdvisorSection currentScore={Number(totalScore)} />}
        </main>

        {/* School Detail Overlay - 흰 화면 방지를 위해 같은 뷰 내부 오버레이로 구현 */}
        {selectedSchool && <SchoolDetailOverlay school={selectedSchool} onClose={() => setSelectedSchool(null)} currentTotalScore={Number(totalScore)} user={user} onUpdateUser={handleUpdateUser} />}
      </div>
    );
  };

  switch (view) {
    case 'splash': return renderSplash();
    case 'login': return renderLogin();
    case 'menu': return renderMenu();
    case 'academic': return renderAcademicMenu();
    case 'semester-detail': return renderSemesterDetail();
    case 'non-academic': return renderNonAcademic();
    case 'entrance': return renderEntrance();
    default: return renderSplash();
  }
}

// --- Detail Overlay Component ---
function SchoolDetailOverlay({ school, onClose, currentTotalScore, user, onUpdateUser }: { school: HighSchool, onClose: () => void, currentTotalScore: number, user: UserProfile | null, onUpdateUser: (u: UserProfile) => void }) {
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const isBookmarked = user?.bookmarks.includes(school.id) || false;

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const updated = { ...user };
    if (isBookmarked) {
      updated.bookmarks = updated.bookmarks.filter(id => id !== school.id);
    } else {
      updated.bookmarks = [...updated.bookmarks, school.id];
    }
    onUpdateUser(updated);
  };

  const runConversion = async () => {
    setIsCalculating(true);
    const result = await calculateSchoolSpecificGrade(school.name, currentTotalScore);
    setCalcResult(result);
    setIsCalculating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-300">
      <header className="px-6 py-5 border-b flex justify-between items-center sticky top-0 z-10 bg-white shadow-sm">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-3">
           <button onClick={toggleBookmark} className={`p-3 rounded-2xl transition-all shadow-md ${isBookmarked ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
              <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-white' : ''}`} />
           </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full pb-20">
        <div className="relative h-72">
          <img src={school.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-8">
             <div className="text-white space-y-2">
               <span className="bg-blue-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">{school.type}</span>
               <h1 className="text-3xl font-black tracking-tighter">{school.name}</h1>
               <p className="flex items-center gap-1 text-sm font-bold opacity-80"><MapPin className="w-4 h-4 text-sky-400"/> {school.location}</p>
             </div>
          </div>
        </div>
        
        <div className="p-8 space-y-10">
          <section className="space-y-6">
            <h3 className="font-black text-slate-800 text-xl tracking-tight border-b-4 border-blue-600 inline-block pb-1">학교 프로필</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-3xl">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">지원 자격</h4>
                <p className="text-sm text-slate-700 font-black">{school.eligibility}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">진학 실적</h4>
                <p className="text-sm text-slate-700 font-black">{school.progressionRate}</p>
              </div>
            </div>
            <div className="pt-4 px-2">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">학교 소개</h4>
              <p className="text-sm text-slate-600 leading-relaxed font-bold italic">"{school.description}"</p>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="font-black text-slate-800 text-xl tracking-tight border-b-4 border-blue-600 inline-block pb-1">입학 성적 시뮬레이션</h3>
            <Button 
              className="w-full py-6 rounded-[28px] flex items-center justify-center gap-4 shadow-2xl shadow-blue-100 text-2xl font-black" 
              onClick={runConversion}
              loading={isCalculating}
            >
              <Calculator className="w-8 h-8" />
              학교별 전형 환산
            </Button>

            {calcResult && (
              <div className="animate-in zoom-in-95 duration-500">
                <Card className="p-8 bg-gradient-to-br from-slate-900 to-blue-900 text-white shadow-2xl rounded-[40px] border-none overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                     <School className="w-48 h-48" />
                  </div>
                  <p className="text-[10px] font-black opacity-60 mb-2 uppercase tracking-widest">Conversion Result</p>
                  <div className="flex items-baseline gap-3 mb-6">
                    <h3 className="text-7xl font-black tracking-tighter tabular-nums">{calcResult.convertedScore}</h3>
                    <span className="text-3xl font-bold opacity-30">/ {calcResult.maxScore}</span>
                  </div>
                  <div className="p-6 bg-white/10 backdrop-blur-md rounded-[28px] border border-white/20">
                    <p className="text-sm leading-relaxed font-bold text-sky-50 whitespace-pre-wrap">{calcResult.explanation}</p>
                  </div>
                </Card>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// --- Advisor Component ---
function AIAdvisorSection({ currentScore }: { currentScore: number }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query) return;
    setLoading(true);
    const result = await getAIConsultation(currentScore, query);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 p-10 rounded-[40px] text-white shadow-2xl shadow-blue-200 relative overflow-hidden border-none animate-in fade-in zoom-in-95">
        <div className="absolute top-0 right-0 p-6 opacity-10 font-black text-9xl">AI</div>
        <div className="flex items-center gap-4 mb-4">
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
             <MessageSquare className="w-7 h-7 text-white" />
           </div>
           <h2 className="text-2xl font-black tracking-tighter">AI 진학 Advisor</h2>
        </div>
        <p className="text-sm font-bold opacity-90 leading-relaxed">
          화산중학교 내신 <span className="text-white text-2xl font-black underline underline-offset-4 mx-1">{currentScore}점</span> 학생의 진학 고민을 해결해드립니다.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="예: 상산고 합격 가능성을 알려줘" 
            className="flex-1 px-6 py-5 rounded-[28px] border-2 border-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 shadow-xl font-black text-sm transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <Button onClick={handleAsk} loading={loading} className="px-8 rounded-[28px] shadow-2xl shadow-blue-100 font-black">
            질문
          </Button>
        </div>
      </div>

      {response && (
        <Card className="p-10 bg-white border-none animate-in slide-in-from-bottom-8 duration-700 shadow-2xl rounded-[40px]">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
               <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl border-4 border-white overflow-hidden">
                 <img src="https://picsum.photos/seed/hwasan_ai/200" className="w-full h-full object-cover" />
               </div>
               <div>
                  <h4 className="font-black text-slate-800 text-lg tracking-tight">화산중 입시 상담관</h4>
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Hwasan Admission Advisor</p>
               </div>
            </div>
            <div className="space-y-8">
              <p className="text-base text-slate-700 leading-relaxed font-bold whitespace-pre-wrap">{response}</p>
              <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                <p className="text-[10px] text-slate-300 font-black italic tracking-widest">“PASSION DEFINES THE FUTURE.”</p>
                <Button variant="ghost" className="text-[10px] font-black px-4 py-2" onClick={() => setResponse(null)}>상담 완료</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
