
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

const Input = ({ label, value, onChange, type = 'number', max, min = 0, placeholder, disabled, step }: any) => {
  const handleChange = (v: string) => {
    if (type === 'number') {
      let num = Number(v);
      if (isNaN(num)) num = 0;
      if (max !== undefined && num > max) num = max;
      if (min !== undefined && num < min) num = min;
      onChange(num);
    } else {
      onChange(v); // 영문/숫자 등 문자열 그대로 허용
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</label>}
      <input
        type={type}
        value={value === '-' ? '' : value}
        onChange={(e) => handleChange(e.target.value)}
        max={max}
        min={min}
        step={step}
        disabled={disabled}
        placeholder={disabled ? 'X' : placeholder}
        className={`border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all ${disabled ? 'bg-slate-100 text-slate-300 cursor-not-allowed font-black text-center' : 'bg-white text-slate-700'}`}
      />
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [view, setView] = useState<'splash' | 'login' | 'menu' | 'academic' | 'non-academic' | 'entrance' | 'semester-detail' | 'school-detail'>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<HighSchool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEntranceTab, setActiveEntranceTab] = useState<'bookmarks' | 'search' | 'ai'>('bookmarks');
  const [searchResults, setSearchResults] = useState<HighSchool[]>(MOCK_SCHOOLS);
  const [isSearching, setIsSearching] = useState(false);
  const [loginData, setLoginData] = useState({ id: '', pw: '' });
  
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
    const local = MOCK_SCHOOLS.filter(s => s.name.includes(searchTerm) || s.location.includes(searchTerm));
    if (local.length > 0) {
      setSearchResults(local);
      setIsSearching(false);
    } else {
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

  const isInputDisabled = (semester: string, subjectName: string, field: string) => {
    const grade = semester[0];
    if (grade === '1') {
      if (field === 'midterm') {
        return !['국어', '수학', '영어', '과학', '사회', '기가', '도덕'].includes(subjectName);
      }
      if (field === 'final') {
        return !['국어', '수학', '영어', '과학', '사회', '기가', '도덕', '한문'].includes(subjectName);
      }
    } else {
      // 2, 3학년 지필고사 가능 과목
      if (field === 'paperTest') {
        return !['국어', '수학', '영어', '과학', '역사', '사회', '기가'].includes(subjectName);
      }
    }
    return false;
  };

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
          <p className="text-sm text-slate-400 font-medium leading-relaxed">아이디와 비밀번호를 입력해주세요.<br/>영문과 숫자를 모두 사용할 수 있습니다.</p>
        </div>
        <div className="space-y-4">
          <Input 
            label="Account ID" 
            type="text" 
            placeholder="아이디를 입력하세요" 
            value={loginData.id} 
            onChange={(v:any) => setLoginData(prev => ({...prev, id: v}))}
          />
          <Input 
            label="Security Password" 
            type="password" 
            placeholder="비밀번호를 입력하세요" 
            value={loginData.pw}
            onChange={(v:any) => setLoginData(prev => ({...prev, pw: v}))}
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
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
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
    const is1stSem = selectedSemester.includes('1학기');
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
          rawScore: val ? '-' : 0,
          midterm: 0,
          final: 0,
          performance: 0,
          perfA: 0,
          perfB: 0,
          perfC: 0,
          perfD: 0,
          paperTest: 0,
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
        // 1학년 정밀 공식
        const mid = currentSub.midterm || 0;
        const fin = currentSub.final || 0;
        const perf = currentSub.performance || 0;
        
        if (['국어', '수학', '영어', '과학', '사회', '기가'].includes(currentSub.name)) {
          calculatedRaw = (mid * 30 / 100) + (fin * 30 / 100) + perf;
        } else if (currentSub.name === '도덕') {
          calculatedRaw = (mid * 20 / 100) + (fin * 20 / 100) + perf;
        } else if (currentSub.name === '한문') {
          calculatedRaw = (fin * 30 / 100) + perf;
        } else {
          calculatedRaw = perf; // 음미체 등
        }
      } else {
        // 2/3학년 정밀 공식 (8점 만점 수행평가 환산 포함)
        const pA = calculatePerfScale(currentSub.perfA || 0);
        const pB = calculatePerfScale(currentSub.perfB || 0);
        const pC = calculatePerfScale(currentSub.perfC || 0);
        const pD = calculatePerfScale(currentSub.perfD || 0);
        const jt = currentSub.paperTest || 0;

        if (isGrade2 && is1stSem) {
          if (['국어', '수학', '역사', '과학'].includes(currentSub.name)) {
            calculatedRaw = (pA * 20 / 100) + (pB * 20 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 20 / 100);
          } else if (currentSub.name === '영어') {
            calculatedRaw = (pA * 10 / 100) + (pB * 10 / 100) + (pC * 25 / 100) + (pD * 25 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '기가') {
            calculatedRaw = (pA * 20 / 100) + (pB * 10 / 100) + (pC * 10 / 100) + (pD * 30 / 100) + (jt * 30 / 100);
          } else if (['도덕', '미술', '체육', '정보'].includes(currentSub.name)) {
            calculatedRaw = (pA * 25 / 100) + (pB * 25 / 100) + (pC * 25 / 100) + (pD * 25 / 100);
          } else if (currentSub.name === '음악') {
            calculatedRaw = (pA * 20 / 100) + (pB * 30 / 100) + (pC * 20 / 100) + (pD * 30 / 100);
          }
        } else if (isGrade2 && !is1stSem) {
          // 2학년 2학기
          if (['국어', '수학', '역사'].includes(currentSub.name)) {
            calculatedRaw = (pA * 20 / 100) + (pB * 20 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 20 / 100);
          } else if (currentSub.name === '과학') {
            calculatedRaw = (pA * 18 / 100) + (pB * 17 / 100) + (pC * 18 / 100) + (pD * 17 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '영어') {
            calculatedRaw = (pA * 10 / 100) + (pB * 20 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '기가') {
            calculatedRaw = (pA * 20 / 100) + (pB * 10 / 100) + (pC * 10 / 100) + (pD * 30 / 100) + (jt * 30 / 100);
          } else if (['도덕', '미술', '체육', '정보'].includes(currentSub.name)) {
            calculatedRaw = (pA * 25 / 100) + (pB * 25 / 100) + (pC * 25 / 100) + (pD * 25 / 100);
          } else if (currentSub.name === '음악') {
            calculatedRaw = (pA * 20 / 100) + (pB * 30 / 100) + (pC * 20 / 100) + (pD * 30 / 100);
          }
        } else if (isGrade3) {
          // 3학년 1, 2학기 공통
          if (['국어', '수학', '역사'].includes(currentSub.name)) {
            calculatedRaw = (pA * 20 / 100) + (pB * 20 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 20 / 100);
          } else if (currentSub.name === '과학') {
            calculatedRaw = (pA * 18 / 100) + (pB * 17 / 100) + (pC * 18 / 100) + (pD * 17 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '사회') {
            calculatedRaw = (pA * 15 / 100) + (pB * 15 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '영어') {
            calculatedRaw = (pA * 10 / 100) + (pB * 20 / 100) + (pC * 20 / 100) + (pD * 20 / 100) + (jt * 30 / 100);
          } else if (currentSub.name === '기가' || currentSub.name === '한문') {
            calculatedRaw = (pA * 20 / 100) + (pB * 10 / 100) + (pC * 10 / 100) + (pD * 30 / 100) + (jt * 30 / 100);
          } else if (['도덕', '미술', '체육', '정보'].includes(currentSub.name)) {
            calculatedRaw = (pA * 25 / 100) + (pB * 25 / 100) + (pC * 25 / 100) + (pD * 25 / 100);
          } else if (currentSub.name === '음악') {
            calculatedRaw = (pA * 20 / 100) + (pB * 30 / 100) + (pC * 20 / 100) + (pD * 30 / 100);
          }
        }
      }

      const finalRaw = data.isFreeSemester ? '-' : Math.min(100, Number(calculatedRaw.toFixed(1)));
      currentSub.rawScore = finalRaw;
      currentSub.achievement = data.isFreeSemester ? 'P' : getAchievement(Number(finalRaw), isArtsPe);
      
      if (!updated.semesters[selectedSemester]) updated.semesters[selectedSemester] = data;
      updated.semesters[selectedSemester].subjects[index] = currentSub;
      handleUpdateUser(updated);
    };

    const getPerfMax = (subName: string) => {
      if (subName === '한문') return 70;
      if (subName === '도덕') return 60;
      if (['국어', '수학', '영어', '과학', '사회', '기가'].includes(subName)) return 40;
      return 100;
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
          <div className="flex items-center gap-3">
             <span className="text-xs font-black text-slate-400">자유학기제</span>
             <input 
              type="checkbox" 
              checked={data.isFreeSemester} 
              onChange={(e) => handleToggleFree(e.target.checked)}
              className="w-10 h-6 appearance-none bg-slate-200 rounded-full relative cursor-pointer checked:bg-blue-600 transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:left-1 checked:before:left-5 before:transition-all"
            />
          </div>
        </header>
        <main className="p-4 space-y-6 max-w-5xl mx-auto">
          <div className="overflow-x-auto rounded-[32px] border border-slate-100 shadow-2xl bg-white">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b">
                  <th className="p-5 font-black">과목</th>
                  <th className="p-5 font-black text-center">성취도</th>
                  {isGrade1 ? (
                    <>
                      <th className="p-2 text-center font-black">중간(100)</th>
                      <th className="p-2 text-center font-black">기말(100)</th>
                      <th className="p-2 text-center font-black">수행</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 text-center font-black">수행A(8)</th>
                      <th className="p-2 text-center font-black">수행B(8)</th>
                      <th className="p-2 text-center font-black">수행C(8)</th>
                      <th className="p-2 text-center font-black">수행D(8)</th>
                      <th className="p-2 text-center font-black">지필(100)</th>
                    </>
                  )}
                  <th className="p-5 text-right font-black">원점수</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((sub, idx) => (
                  <tr key={idx} className="border-b last:border-none">
                    <td className="p-5 font-black text-slate-800">{sub.name}</td>
                    <td className="p-2 text-center">
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center font-black text-xs shadow-md ${
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
                             value={data.isFreeSemester ? '-' : sub.midterm} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'midterm', v)} 
                             max={100}
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'midterm')}
                           />
                        </td>
                        <td className="p-1 px-1">
                           <Input 
                             value={data.isFreeSemester ? '-' : sub.final} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'final', v)} 
                             max={100}
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'final')}
                           />
                        </td>
                        <td className="p-1 px-1">
                           <Input 
                             label={`MAX:${getPerfMax(sub.name)}`}
                             value={data.isFreeSemester ? '-' : sub.performance} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'performance', v)} 
                             max={getPerfMax(sub.name)}
                             disabled={data.isFreeSemester}
                           />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-1 px-1"><Input value={data.isFreeSemester ? '-' : sub.perfA} onChange={(v: any) => handleUpdateSubject(idx, 'perfA', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={data.isFreeSemester ? '-' : sub.perfB} onChange={(v: any) => handleUpdateSubject(idx, 'perfB', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={data.isFreeSemester ? '-' : sub.perfC} onChange={(v: any) => handleUpdateSubject(idx, 'perfC', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1"><Input value={data.isFreeSemester ? '-' : sub.perfD} onChange={(v: any) => handleUpdateSubject(idx, 'perfD', v)} max={8} disabled={data.isFreeSemester}/></td>
                        <td className="p-1 px-1">
                           <Input 
                             value={data.isFreeSemester ? '-' : sub.paperTest} 
                             onChange={(v: any) => handleUpdateSubject(idx, 'paperTest', v)} 
                             max={100}
                             disabled={data.isFreeSemester || isInputDisabled(selectedSemester, sub.name, 'paperTest')}
                           />
                        </td>
                      </>
                    )}
                    <td className="p-5 font-black text-right text-blue-600 bg-blue-50/20">{sub.rawScore}</td>
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
                    <Card key={school.id} className="cursor-pointer hover:shadow-2xl transition-all duration-300 group shadow-lg" onClick={() => { setSelectedSchool(school); setView('school-detail'); }}>
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
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">탐색 결과</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(school => (
                  <Card key={school.id} className="cursor-pointer hover:shadow-2xl transition-all duration-500 border-none shadow-lg group active:scale-95 bg-white" onClick={() => { setSelectedSchool(school); setView('school-detail'); }}>
                    <div className="relative h-32 overflow-hidden">
                      <img src={school.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                         <h3 className="font-black text-sm text-white line-clamp-1">{school.name}</h3>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeEntranceTab === 'ai' && <AIAdvisorSection currentScore={Number(totalScore)} />}
        </main>
      </div>
    );
  };

  const renderSchoolDetail = () => {
    if (!selectedSchool) return null;
    return <SchoolDetailView school={selectedSchool} onBack={() => setView('entrance')} currentTotalScore={Number(totalScore)} user={user} onUpdateUser={handleUpdateUser} />;
  }

  switch (view) {
    case 'splash': return renderSplash();
    case 'login': return renderLogin();
    case 'menu': return renderMenu();
    case 'academic': return renderAcademicMenu();
    case 'semester-detail': return renderSemesterDetail();
    case 'non-academic': return renderNonAcademic();
    case 'entrance': return renderEntrance();
    case 'school-detail': return renderSchoolDetail();
    default: return renderSplash();
  }
}

function SchoolDetailView({ school, onBack, currentTotalScore, user, onUpdateUser }: any) {
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const isBookmarked = user?.bookmarks.includes(school.id) || false;

  const toggleBookmark = () => {
    if (!user) return;
    const updated = { ...user };
    if (isBookmarked) {
      updated.bookmarks = updated.bookmarks.filter((id:string) => id !== school.id);
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
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-5 border-b flex justify-between items-center sticky top-0 z-10 bg-white">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <button onClick={toggleBookmark} className={`p-3 rounded-2xl transition-all shadow-md ${isBookmarked ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
          <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-white' : ''}`} />
        </button>
      </header>
      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        <div className="relative h-64">
          <img src={school.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent flex items-end p-8">
             <div className="text-white space-y-1">
               <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{school.type}</span>
               <h1 className="text-3xl font-black tracking-tighter">{school.name}</h1>
               <p className="flex items-center gap-1 text-sm font-bold opacity-80"><MapPin className="w-4 h-4"/> {school.location}</p>
             </div>
          </div>
        </div>
        <div className="p-8 space-y-10">
          <section className="space-y-4">
            <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              학교 상세 정보
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">지원 자격</p>
                <p className="text-sm font-bold text-slate-700">{school.eligibility}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">주요 진학</p>
                <p className="text-sm font-bold text-slate-700">{school.progressionRate}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-medium bg-blue-50/50 p-6 rounded-3xl border border-blue-100 italic">"{school.description}"</p>
          </section>

          <section className="space-y-6">
            <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
               <div className="w-1 h-6 bg-blue-600 rounded-full" />
               입학 성적 환산 (AI)
            </h3>
            <Button className="w-full py-5 rounded-2xl shadow-xl shadow-blue-100 text-lg" onClick={runConversion} loading={isCalculating}>
               {school.name} 전형 환산하기
            </Button>
            {calcResult && (
              <Card className="p-8 bg-slate-900 text-white shadow-2xl rounded-[32px] border-none">
                <p className="text-[10px] font-black opacity-50 mb-2 uppercase">Converts to</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <h3 className="text-6xl font-black tracking-tighter">{calcResult.convertedScore}</h3>
                  <span className="text-2xl font-bold opacity-30">/ {calcResult.maxScore}</span>
                </div>
                <p className="text-sm font-bold text-sky-100/80 leading-relaxed whitespace-pre-wrap">{calcResult.explanation}</p>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

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
      <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl">
        <h2 className="text-xl font-black mb-2">AI 진학 전문가 상담</h2>
        <p className="text-sm font-bold opacity-80">현재 성적({currentScore}점)을 바탕으로 맞춤형 진로 상담을 제공합니다.</p>
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="예: 상산고 지원해도 될까요?" 
          className="flex-1 px-4 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-blue-600 font-bold"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleAsk} loading={loading} className="px-6 rounded-2xl">상담</Button>
      </div>
      {response && (
        <Card className="p-8 bg-white border-none shadow-xl rounded-[32px]">
          <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{response}</p>
        </Card>
      )}
    </div>
  );
}
