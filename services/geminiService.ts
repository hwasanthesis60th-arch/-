
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// AI를 통한 전국 고등학교 검색
export const searchHighSchoolsViaAI = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `대한민국의 교육청 소속 고등학교 중에서 "${query}"와(과) 관련된 고등학교 정보를 검색하여 JSON 배열 형태로 반환해줘. 
      결과는 [{id, name, type, location, eligibility, description, progressionRate, imageUrl}] 형식을 지켜야 해. 
      imageUrl은 해당 학교의 전경이나 로고가 연상되는 실제 이미지 검색 키워드를 기반으로 "https://source.unsplash.com/featured/?highschool,building,{name}" 또는 "https://picsum.photos/seed/{name}/400/300" 중 가장 적합한 것을 사용해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              location: { type: Type.STRING },
              eligibility: { type: Type.STRING },
              description: { type: Type.STRING },
              progressionRate: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ["id", "name", "type", "location", "eligibility", "description", "progressionRate", "imageUrl"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("School Search error:", error);
    return [];
  }
};

// 초기 로딩 시 보여줄 전국 대표 고등학교 리스트 (각 지역별 2~3개씩 총 30개 이상)
export const getInitialRepresentativeSchools = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `대한민국 전국 17개 시도 교육청 소속의 대표적인 고등학교(과학고, 외고, 자사고, 명문 일반고 등) 30개를 선정해서 정보를 제공해줘. 
      서울, 경기, 인천, 강원, 충북, 충남, 대전, 세종, 전북, 전남, 광주, 경북, 경남, 대구, 울산, 부산, 제주 지역이 골고루 포함되어야 해.
      결과는 [{id, name, type, location, eligibility, description, progressionRate, imageUrl}] 형식의 JSON 배열이어야 해.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              location: { type: Type.STRING },
              eligibility: { type: Type.STRING },
              description: { type: Type.STRING },
              progressionRate: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ["id", "name", "type", "location", "eligibility", "description", "progressionRate", "imageUrl"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Initial Schools Fetch error:", error);
    return [];
  }
};

// 학교별 특정 성적 산출 로직 생성 및 계산
export const calculateSchoolSpecificGrade = async (schoolName: string, hwasanTotalScore: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${schoolName}의 최신 고등학교 입학 전형 요강을 바탕으로, 화산중학교 내신 점수 ${hwasanTotalScore}/300점을 해당 학교의 산출 방식으로 환산해줘. 
      반드시 다음 JSON 형식으로만 답해줘: { "convertedScore": "숫자", "maxScore": "숫자", "explanation": "계산 방식 설명" }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Grade calculation error:", error);
    return null;
  }
};

export const getAIConsultation = async (studentScore: number, schoolName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `화산중학교 내신 점수 ${studentScore}/300점인 학생이 ${schoolName} 고등학교 진학을 희망하고 있습니다. 해당 학교의 특징과 이 점수로 합격 가능성 및 조언을 한국어로 친절하게 답변해주세요.`,
    });
    return response.text;
  } catch (error) {
    console.error("AI Consultation error:", error);
    return "상담을 진행할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
};
