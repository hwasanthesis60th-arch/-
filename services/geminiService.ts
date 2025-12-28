
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// AI를 통한 전국 고등학교 검색 (Google Search Grounding 활용)
export const searchHighSchoolsViaAI = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `대한민국의 교육청 소속 고등학교 중에서 "${query}"와(과) 관련된 실제 고등학교 정보를 검색해서 최신 데이터를 기반으로 반환해줘. 
      결과는 반드시 JSON 배열 형태여야 하며, 각 학교의 실제 특징(모집 단위, 대학 진학 성과 등)을 상세히 포함해줘.
      이미지 URL(imageUrl)은 해당 학교의 실제 모습이 잘 반영될 수 있도록 "https://loremflickr.com/800/600/highschool,korea,building,{학교이름}" 형식을 사용해줘.`,
      config: {
        tools: [{ googleSearch: {} }],
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

    // 검색 결과에서 출처 URL 추출 (필요 시 UI에 표시 가능)
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    console.log("Grounding Sources:", sources);

    return JSON.parse(response.text);
  } catch (error) {
    console.error("School Search error:", error);
    return [];
  }
};

// 초기 로딩 시 보여줄 전국 대표 고등학교 리스트 (Google Search 활용)
export const getInitialRepresentativeSchools = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `대한민국 전국 시도별 대표 고등학교(상산고, 민사고, 경기과학고 등) 20곳의 최신 정보를 검색해서 JSON 배열로 제공해줘. 
      실제 학교 건물의 이미지가 나올 수 있도록 imageUrl은 "https://loremflickr.com/800/600/highschool,korea,{학교이름}" 형식을 사용해줘.`,
      config: {
        tools: [{ googleSearch: {} }],
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
      contents: `${schoolName}의 최신 2024-2025학년도 입학 전형 요강을 구글 검색으로 확인해서, 화산중학교 내신 점수 ${hwasanTotalScore}/300점을 해당 학교의 산출 방식(교과 가중치, 비교과 반영비율 등)으로 정확히 환산해줘. 
      반드시 다음 JSON 형식으로만 답해줘: { "convertedScore": "숫자", "maxScore": "숫자", "explanation": "검색된 실제 전형 기준을 포함한 계산 방식 설명" }`,
      config: {
        tools: [{ googleSearch: {} }],
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
      contents: `화산중학교 내신 점수 ${studentScore}/300점인 학생이 ${schoolName} 고등학교 진학을 희망하고 있습니다. 
      구글 검색을 통해 ${schoolName}의 최근 커트라인과 모집 요강을 확인하고, 이 학생의 합격 가능성과 구체적인 준비 전략을 한국어로 친절하게 답변해주세요.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Consultation error:", error);
    return "상담을 진행할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
};
