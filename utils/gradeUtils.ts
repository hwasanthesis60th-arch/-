
import { Achievement, SemesterData, SubjectGrade } from '../types';

export const calculatePerfScale = (val: number): number => {
  const map: Record<number, number> = {
    8: 100, 7: 95, 6: 90, 5: 85, 4: 80, 3: 75, 2: 70, 1: 65, 0: 60
  };
  return map[val] || 60;
};

export const getAchievement = (raw: number, isArtsPe: boolean): Achievement => {
  if (isArtsPe) {
    if (raw >= 79.5) return 'A';
    if (raw >= 59.5) return 'B';
    return 'C';
  } else {
    if (raw >= 89.5) return 'A';
    if (raw >= 79.5) return 'B';
    if (raw >= 69.5) return 'C';
    if (raw >= 59.5) return 'D';
    return 'E';
  }
};

export const getAchievementPoints = (ach: Achievement): number => {
  switch (ach) {
    case 'A': return 5;
    case 'B': return 4;
    case 'C': return 3;
    case 'D': return 2;
    case 'E': return 1;
    default: return 0;
  }
};

export const calculateTotalScore = (
  semesters: Record<string, SemesterData>,
  nonAcademic: any
) => {
  let g1_2_PointsSum = 0;
  let g1_2_RawSum = 0;
  let g1_2_Count = 0;

  let g3_PointsSum = 0;
  let g3_RawSum = 0;
  let g3_Count = 0;

  let artsPePointsSum = 0;
  let artsPeCount = 0;

  const artsPeNames = ['미술', '음악', '체육'];

  Object.entries(semesters).forEach(([key, data]) => {
    if (data.isFreeSemester) return;
    const isGrade3 = key.startsWith('3');

    data.subjects.forEach(sub => {
      const isArtsPe = artsPeNames.includes(sub.name);
      if (isArtsPe) {
        artsPePointsSum += getAchievementPoints(sub.achievement);
        artsPeCount++;
      } else {
        const p = getAchievementPoints(sub.achievement);
        const r = typeof sub.rawScore === 'number' ? sub.rawScore : 0;
        if (isGrade3) {
          g3_PointsSum += p;
          g3_RawSum += r;
          g3_Count++;
        } else {
          g1_2_PointsSum += p;
          g1_2_RawSum += r;
          g1_2_Count++;
        }
      }
    });
  });

  const academicG12 = g1_2_Count > 0 ? ( (g1_2_PointsSum / g1_2_Count) + (g1_2_RawSum / g1_2_Count) * 0.01 ) * 15 : 0;
  const academicG3 = g3_Count > 0 ? ( (g3_PointsSum / g3_Count) + (g3_RawSum / g3_Count) * 0.01 ) * 15 : 0;
  const academicArtsPe = artsPeCount > 0 ? (artsPePointsSum / artsPeCount) * 12 : 0;

  const academicTotal = academicG12 + academicG3 + academicArtsPe;

  // Non-Academic Calculation
  const attendanceScore = calculateAttendance(nonAcademic.attendance);
  const volunteerScore = calculateVolunteer(nonAcademic.volunteer);
  const behaviorScore = calculateBehavior(nonAcademic.behavior);

  return Math.min(300, academicTotal + attendanceScore + volunteerScore + behaviorScore);
};

const calculateAttendance = (att: any) => {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const unexcusedAbs = att.absences[i] + Math.floor((att.tardies[i] + att.earlyLeaves[i] + att.results[i]) / 3);
    if (unexcusedAbs === 0) total += 10;
    else if (unexcusedAbs <= 3) total += 9;
    else if (unexcusedAbs <= 7) total += 8;
    else if (unexcusedAbs <= 11) total += 7;
    else if (unexcusedAbs <= 15) total += 6;
    else if (unexcusedAbs <= 19) total += 5;
    else total += 4;
  }
  return total;
};

const calculateVolunteer = (vol: any) => {
  const h = vol.hours;
  if (vol.specialCase === 'disabled') return 15;
  if (vol.specialCase === '20h') {
    if (h >= 20) return 15;
    if (h >= 19) return 14;
    if (h >= 18) return 13;
    if (h >= 17) return 12;
    if (h >= 16) return 11;
    if (h >= 15) return 10;
    if (h >= 14) return 9;
    if (h >= 13) return 8;
    if (h >= 11) return 7;
    if (h >= 9) return 6;
    if (h >= 7) return 5;
    if (h >= 5) return 4;
    if (h >= 3) return 3;
    return 2;
  } else {
    // 30h criteria
    if (h >= 30) return 15;
    if (h >= 28) return 14;
    if (h >= 26) return 13;
    if (h >= 24) return 12;
    if (h >= 22) return 11;
    if (h >= 20) return 10;
    if (h >= 18) return 9;
    if (h >= 16) return 8;
    if (h >= 14) return 7;
    if (h >= 12) return 6;
    if (h >= 10) return 5;
    if (h >= 8) return 4;
    if (h >= 6) return 3;
    return 2;
  }
};

const calculateBehavior = (beh: any) => {
  const s1 = beh.grade1.base + Math.min(2, beh.grade1.extra);
  const s2 = beh.grade2.base + Math.min(2, beh.grade2.extra);
  const s3 = beh.grade3.base + Math.min(2, beh.grade3.extra);
  return s1 + s2 + s3;
};
