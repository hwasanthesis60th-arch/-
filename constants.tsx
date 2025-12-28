
import { SemesterData, NonAcademicData, HighSchool } from './types';

export const GRADE_1_SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '기가', '도덕', '한문', '미술', '음악', '체육'];
export const GRADE_2_SUBJECTS = ['국어', '수학', '영어', '과학', '역사', '기가', '도덕', '정보', '미술', '음악', '체육'];
export const GRADE_3_SUBJECTS = ['국어', '수학', '영어', '과학', '역사', '사회', '기가', '한문', '미술', '음악', '체육'];

export const INITIAL_NON_ACADEMIC: NonAcademicData = {
  attendance: {
    absences: [0, 0, 0],
    tardies: [0, 0, 0],
    earlyLeaves: [0, 0, 0],
    results: [0, 0, 0],
  },
  volunteer: {
    hours: 0,
    specialCase: 'none',
  },
  behavior: {
    grade1: { base: 3, extra: 0 },
    grade2: { base: 3, extra: 0 },
    grade3: { base: 3, extra: 0 },
  },
};

export const MOCK_SCHOOLS: HighSchool[] = [
  {
    id: 'hs1',
    name: '전북과학고등학교',
    imageUrl: 'https://loremflickr.com/800/600/highschool,korea,전북과학고',
    type: '과학고',
    location: '전북 익산시',
    eligibility: '전북 소재 중학교 졸업예정자',
    description: '미래 과학 인재 양성을 목표로 하는 전북 유일의 과학고등학교입니다. 첨단 실험 시설과 이공계 특화 커리큘럼을 자랑합니다.',
    progressionRate: '대학교 진학률 98% (카이스트, 포스텍 다수 진학)'
  },
  {
    id: 'hs2',
    name: '상산고등학교',
    imageUrl: 'https://loremflickr.com/800/600/highschool,korea,상산고',
    type: '자사고',
    location: '전북 전주시',
    eligibility: '전국 단위 모집',
    description: '수학 교육에 특화된 자율형 사립고등학교로, 전북의 자부심입니다. 홍성대 이사장이 설립한 전통의 명문고입니다.',
    progressionRate: '의치한 및 명문대 진학률 전국 최상위권'
  },
  {
    id: 'hs3',
    name: '경기과학고등학교',
    imageUrl: 'https://loremflickr.com/800/600/highschool,korea,경기과학고',
    type: '영재학교',
    location: '경기 수원시',
    eligibility: '전국 단위 모집',
    description: '대한민국 최초의 과학고등학교이자 세계적인 과학 영재 교육기관입니다. 창의적인 연구 활동(R&E)이 핵심입니다.',
    progressionRate: '설카포 진학률 90% 이상 유지'
  },
  {
    id: 'hs4',
    name: '민족사관고등학교',
    imageUrl: 'https://loremflickr.com/800/600/highschool,korea,민사고',
    type: '자사고',
    location: '강원 횡성군',
    eligibility: '전국 단위 모집',
    description: '민족 정신과 세계적 안목을 갖춘 지도자 양성을 목표로 합니다. 토론식 수업(Harkness Table)이 특징입니다.',
    progressionRate: '아이비리그 및 국내 명문대 동시 석권'
  },
  {
    id: 'hs5',
    name: '전북외국어고등학교',
    imageUrl: 'https://loremflickr.com/800/600/highschool,korea,전북외고',
    type: '외고',
    location: '전북 군산시',
    eligibility: '전북 소재 중학교 졸업예정자',
    description: '글로벌 리더를 꿈꾸는 전북의 외교 인재들이 모이는 곳입니다. 다양한 외국어 전공과 국제 교류 프로그램을 운영합니다.',
    progressionRate: '수도권 주요 대학 어문학부 진학 우수'
  }
];
